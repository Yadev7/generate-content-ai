import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { DEFAULT_PERSONA_VALUE, personaById } from "@/lib/chat";
import { gateFeature, gatePersona } from "@/lib/access";
import { readEntitlement } from "@/lib/subscription/guard";
import { readQuota, reserveMessage } from "@/lib/quota";
import { getNote, textForContext } from "@/lib/notes/store";
import { MAX_GROUNDING_CHARS, groundedSystemPrompt } from "@/lib/notes/context";

/**
 * Chat proxy.
 *
 * The browser sends only `{ personaId, messages }` — never prompt text. The
 * system prompt is looked up here and the persona's access tier is enforced
 * against the Clerk session, so a locked persona cannot be reached by editing
 * a request from devtools. This is what makes the bonus assistant a real
 * paywall rather than a UI hint.
 *
 * LM Studio stays on the server: previously the browser called it directly,
 * which meant the API key was shipped to every visitor.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LM_BASE_URL =
  process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
const LM_API_KEY = process.env.LM_STUDIO_API_KEY || "lm-studio";

const MAX_MESSAGES = 100;
const MAX_CONTENT_LENGTH = 20_000;
/** Hard ceiling so one request cannot make LM Studio generate forever. */
const MAX_TOKENS = Number(process.env.LM_MAX_TOKENS ?? 2048);

interface IncomingMessage {
  role: string;
  content: string;
}

/**
 * Resolves the model to call. `LM_STUDIO_MODEL` wins; when it is unset we ask
 * LM Studio what is loaded instead of sending `model: ""`, which it rejects
 * with an opaque `model_not_found`. The result is cached for the process, since
 * the set of downloaded models rarely changes while the server is up.
 */
let discoveredModel: string | null = null;

async function resolveModel(): Promise<string | null> {
  const configured = process.env.LM_STUDIO_MODEL?.trim();
  if (configured) return configured;
  if (discoveredModel) return discoveredModel;

  try {
    const res = await fetch(`${LM_BASE_URL}/models`, {
      headers: { Authorization: `Bearer ${LM_API_KEY}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { data?: { id?: string }[] };
    const ids = (data.data ?? [])
      .map((m) => m.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
      // Skip the embedding and TTS models LM Studio also lists; they are not
      // chat completions endpoints.
      .filter((id) => !/embed|tts|kokoro|whisper/i.test(id));

    if (ids.length === 0) return null;
    discoveredModel = ids[0];
    return discoveredModel;
  } catch {
    return null;
  }
}

function sanitiseMessages(raw: unknown): IncomingMessage[] | null {
  if (!Array.isArray(raw)) return null;
  const messages = raw
    .slice(-MAX_MESSAGES)
    .map((m) => {
      if (!m || typeof m !== "object") return null;
      const { role, content } = m as Partial<IncomingMessage>;
      if (role !== "user" && role !== "bot") return null;
      if (typeof content !== "string" || !content.trim()) return null;
      return { role, content: content.slice(0, MAX_CONTENT_LENGTH) };
    })
    .filter((m): m is IncomingMessage => m !== null);
  return messages.length > 0 ? messages : null;
}

export async function POST(request: Request) {
  let body: { personaId?: unknown; messages?: unknown; noteId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const messages = sanitiseMessages(body.messages);
  if (!messages) {
    return NextResponse.json(
      { error: "A non-empty `messages` array is required" },
      { status: 400 }
    );
  }

  const { userId } = await auth();
  const entitlement = await readEntitlement(userId);

  // Unknown persona ids fall back to the public assistant rather than erroring,
  // so a stale client keeps working and never gets a privileged prompt.
  const persona =
    typeof body.personaId === "string" ? personaById(body.personaId) : undefined;
  const target = persona ?? personaById("general");

  // Same gate the rest of the app uses, so a lock shown in the UI and a refusal
  // from this endpoint can never disagree.
  const decision = target
    ? gatePersona(target, entitlement)
    : { allowed: false as const, reason: "signin_required" as const };

  if (!target || !decision.allowed) {
    const needsSubscription = decision.reason === "subscription_required";
    return NextResponse.json(
      {
        error: needsSubscription
          ? "This assistant requires an active subscription."
          : "This assistant requires you to be signed in.",
        code: needsSubscription ? "subscription_required" : "signin_required",
      },
      { status: 403 }
    );
  }

  // Optional grounding in an uploaded course document. The note is Prime-only
  // and scoped to the caller, so a noteId belonging to someone else reads as
  // "not found" rather than leaking another student's material.
  const requestedNoteId =
    typeof body.noteId === "string" && body.noteId.length > 0 ? body.noteId : null;

  let groundedSource: { name: string; kind: "pdf" | "text"; text: string } | null = null;
  if (requestedNoteId) {
    const noteGuard = gateFeature("courseNotes", entitlement);
    if (!noteGuard.allowed) {
      const needsSubscription = noteGuard.reason === "subscription_required";
      return NextResponse.json(
        {
          error: needsSubscription
            ? "Attaching course notes requires an active Sai Prime subscription."
            : "Sign in to attach course notes.",
          code: needsSubscription ? "subscription_required" : "signin_required",
        },
        { status: 403 }
      );
    }

    // gateFeature already requires a session, but the note lookup is keyed by
    // user id, so make the ownership scope explicit.
    if (!userId) {
      return NextResponse.json(
        { error: "Sign in to attach course notes.", code: "signin_required" },
        { status: 403 }
      );
    }

    const note = await getNote(userId, requestedNoteId);
    const text = note
      ? await textForContext(userId, requestedNoteId, MAX_GROUNDING_CHARS)
      : null;

    if (!note || !text) {
      return NextResponse.json(
        { error: "That document is no longer available.", code: "note_not_found" },
        { status: 404 }
      );
    }

    groundedSource = { name: note.name, kind: note.kind, text };
  }

  const basePrompt = target?.value ?? DEFAULT_PERSONA_VALUE;
  const systemPrompt = groundedSource
    ? groundedSystemPrompt(basePrompt, groundedSource)
    : basePrompt;

  // The free tier's advertised daily cap is enforced here, not in the UI, so it
  // cannot be bypassed by calling this endpoint directly. Subscribers skip it.
  const identity = userId ? { userId } : { guest: request };
  const quota = entitlement.isSubscribed
    ? {
        tier: "prime" as const,
        limit: Number.POSITIVE_INFINITY,
        used: 0,
        remaining: Number.POSITIVE_INFINITY,
        day: null,
      }
    : await readQuota(identity);

  if (quota.tier !== "prime" && quota.remaining <= 0) {
    return NextResponse.json(
      {
        error:
          "You have used today's free messages. Upgrade to Sai Prime for unlimited revision.",
        code: "limit_reached",
        limit: quota.limit,
        used: quota.used,
        resetsAt: `${quota.day}T00:00:00.000Z`,
      },
      { status: 429 }
    );
  }

  // Take the message from the allowance up front, then give it back if the model
  // call fails, so our own upstream errors do not cost a student a message.
  const reservation =
    quota.tier === "prime"
      ? null
      : await reserveMessage(identity, quota.limit);

  if (reservation && !reservation.ok) {
    return NextResponse.json(
      {
        error:
          "You have used today's free messages. Upgrade to Sai Prime for unlimited revision.",
        code: "limit_reached",
        limit: reservation.state.limit,
        used: reservation.state.used,
        resetsAt: `${reservation.state.day}T00:00:00.000Z`,
      },
      { status: 429 }
    );
  }

  const model = await resolveModel();
  if (!model) {
    await reservation?.refund();
    return NextResponse.json(
      {
        error:
          "No chat model is available. Set LM_STUDIO_MODEL, or load a model in LM Studio.",
        code: "no_model",
      },
      { status: 503 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${LM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LM_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({
            role: m.role === "bot" ? "assistant" : "user",
            content: m.content,
          })),
        ],
        stream: false,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    await reservation?.refund();
    const detail = err instanceof Error ? err.message : "upstream request failed";
    return NextResponse.json(
      { error: `Could not reach the model: ${detail}` },
      { status: 502 }
    );
  }

  if (!upstream.ok) {
    await reservation?.refund();
    const detail = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        error: detail || `The model returned status ${upstream.status}`,
        code: "model_error",
      },
      { status: 502 }
    );
  }

  const data = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    await reservation?.refund();
    return NextResponse.json(
      { error: "The model returned an empty response." },
      { status: 502 }
    );
  }

  // Report the allowance *after* this message, not the pre-consumption figure,
  // so the client does not show a stale "N left" count.
  const remaining = reservation ? reservation.state.remaining : null;

  return NextResponse.json({
    content,
    personaId: target?.id ?? "general",
    quota: {
      tier: quota.tier,
      limit: Number.isFinite(quota.limit) ? quota.limit : null,
      remaining,
    },
  });
}

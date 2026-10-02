import { redirect } from "next/navigation";

import { getAdapter } from "@/lib/payments";
import { applyPaymentEvent } from "@/lib/subscription/server";
import type { ProviderId } from "@/lib/subscription/types";

/**
 * Landing spot for the buyer returning from a gateway.
 *
 * The browser arrives here with the provider's query; this server component
 * asks the adapter to confirm the payment, grants the entitlement, then
 * forwards the user into the app. It renders nothing itself.
 */
export default async function SubscribeReturnPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const provider = first(searchParams.provider);
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    const single = first(value);
    if (single !== undefined) query[key] = single;
  }

  let applied = false;

  if (provider) {
    try {
      const adapter = getAdapter(provider as ProviderId);
      const event = (await adapter.completeReturn?.(query)) ?? null;
      if (event?.userId) {
        await applyPaymentEvent(event);
        applied = true;
      }
    } catch {
      // Fall through to the app; the provider webhook may still grant access.
    }
  }

  redirect(applied ? "/?subscribed=1" : "/?checkout=cancelled");
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

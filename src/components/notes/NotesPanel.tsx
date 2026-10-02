"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { ACCEPTED_EXTENSIONS } from "@/lib/notes/format";
import { cn } from "@/lib/utils";

/**
 * Upload and manage course material (Prime).
 *
 * A Prime-only control: when the gate reports the feature is locked, the button
 * opens the subscribe dialog rather than the file picker, so a free user is told
 * why rather than shown a control that will 403. The server refuses the upload
 * either way; this only avoids a dead end.
 *
 * Text is never sent to the browser. The list is a summary (name, size, page
 * count), so a student's material stays on the server.
 */

interface NoteSummary {
  id: string;
  name: string;
  kind: "pdf" | "text";
  sizeBytes: number;
  characters: number;
  pages: number | null;
  uploadedAt: string;
}

interface NotesPanelProps {
  /** Called when the library changes, so the quiz tool can offer a source note. */
  onNotesChanged?: (notes: NoteSummary[]) => void;
  onRequestSubscribe?: () => void;
  /** Id currently chosen as the quiz source, so the panel can highlight it. */
  selectedNoteId?: string | null;
  onSelectNote?: (noteId: string | null) => void;
  /** Attaches a note to the chat so the tutor answers from it (Prime). */
  onAskNote?: (note: NoteSummary) => void;
  /** Id currently attached to the chat, so the panel can highlight it. */
  askingNoteId?: string | null;
  className?: string;
}

const formatBytes = (bytes: number): string =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(0)} KB`;

export default function NotesPanel({
  onNotesChanged,
  onRequestSubscribe,
  selectedNoteId,
  onSelectNote,
  onAskNote,
  askingNoteId,
  className,
}: NotesPanelProps) {
  const { t } = useI18n();
  const { can, lockReason } = useFeatureAccess();
  const { openSignIn, openSignUp } = useClerk();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const allowed = can("courseNotes");
  // Sign-in is needed before a subscription, so the two states route differently.
  const reason = lockReason("courseNotes");

  const applyNotes = useCallback(
    (next: NoteSummary[]) => {
      setNotes(next);
      onNotesChanged?.(next);
    },
    [onNotesChanged]
  );

  const load = useCallback(async () => {
    if (!allowed) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/notes", { cache: "no-store" });
      // A 403/401 here just means the entitlement changed underneath us; the
      // gate hook will re-render the locked state, so no error banner.
      if (res.status === 401 || res.status === 403) {
        applyNotes([]);
        return;
      }
      const data = await res.json().catch(() => null);
      if (res.ok) applyNotes(Array.isArray(data?.notes) ? data.notes : []);
    } catch {
      // Leave whatever is on screen; a transient network blip is not worth a banner.
    } finally {
      setIsLoading(false);
    }
  }, [allowed, applyNotes]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);

    // One at a time: a PDF parse is slow and the API takes a single file, so a
    // batch would need its own queue and per-file error reporting.
    const file = files[0];
    setIsUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/notes", { method: "POST", body });
      const data = await res.json().catch(() => null);

      if (res.status === 401 || res.status === 403) {
        setError(t.notes.signInToUpload);
        return;
      }
      if (!res.ok) {
        setError(data?.error ?? t.notes.uploadFailed);
        return;
      }
      if (data?.note) applyNotes([data.note, ...notes]);
    } catch {
      setError(t.notes.uploadFailed);
    } finally {
      setIsUploading(false);
      // Reset so re-picking the same file fires onChange again.
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.status === 401 || res.status === 403) {
        setError(t.notes.signInToUpload);
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? t.notes.deleteFailed);
        return;
      }
      applyNotes(notes.filter((note) => note.id !== id));
      if (selectedNoteId === id) onSelectNote?.(null);
    } catch {
      setError(t.notes.deleteFailed);
    } finally {
      setBusyId(null);
    }
  };

  const openPicker = () => {
    if (!allowed) {
      // Offer sign-up first: an account is a precondition for paying, so
      // sending a brand-new visitor straight to checkout would be a dead end.
      if (reason === "signin_required") {
        if (openSignIn) openSignIn();
        else if (openSignUp) openSignUp();
      } else {
        onRequestSubscribe?.();
      }
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <section
      data-testid="notes-panel"
      aria-label={t.notes.title}
      className={cn("rounded-xl border bg-card p-4", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-primary" />
            {t.notes.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{t.notes.subtitle}</p>
        </div>

        <Button
          size="sm"
          variant={allowed ? "default" : "outline"}
          onClick={openPicker}
          disabled={isUploading}
          data-testid="notes-upload"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {isUploading ? t.notes.uploading : t.notes.upload}
        </Button>
      </div>

      {/* Hidden behind the button; the panel never navigates to a file URL. */}
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept={ACCEPTED_EXTENSIONS.join(",")}
        onChange={(event) => void handleFiles(event.target.files)}
        data-testid="notes-file-input"
      />

      {!allowed && (
        <p
          className="mt-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground"
          data-testid="notes-locked"
        >
          {reason === "signin_required" ? t.notes.signInToUpload : t.notes.primeOnly}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-destructive" data-testid="notes-error">
          {error}
        </p>
      )}

      {allowed && isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">{t.notes.loading}</p>
      )}

      {allowed && !isLoading && notes.length === 0 && !error && (
        <p className="mt-3 text-xs text-muted-foreground" data-testid="notes-empty">
          {t.notes.empty}
        </p>
      )}

      {notes.length > 0 && (
        <ul className="mt-3 space-y-1.5" data-testid="notes-list">
          {notes.map((note) => {
            const isSelected = selectedNoteId === note.id;
            const isAsking = askingNoteId === note.id;
            return (
              <li
                key={note.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                  isSelected ? "border-primary bg-primary/5" : "bg-background"
                )}
              >
                <FileText
                  className={cn(
                    "size-4 shrink-0",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{note.name}</p>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    {note.kind.toUpperCase()}
                    {note.pages !== null ? ` · ${note.pages}p` : ""} ·{" "}
                    {note.characters.toLocaleString()} chars · {formatBytes(note.sizeBytes)}
                  </p>
                </div>

                {onSelectNote && (
                  <Button
                    size="xs"
                    variant={isSelected ? "default" : "ghost"}
                    onClick={() => onSelectNote(isSelected ? null : note.id)}
                    data-testid={`notes-select-${note.id}`}
                  >
                    {isSelected ? t.notes.usingAsSource : t.notes.useAsSource}
                  </Button>
                )}

                {onAskNote && (
                  <Button
                    size="xs"
                    variant={isAsking ? "default" : "ghost"}
                    onClick={() => onAskNote(note)}
                    data-testid={`notes-ask-${note.id}`}
                  >
                    {isAsking ? t.notes.asking : t.notes.ask}
                  </Button>
                )}

                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label={`${t.notes.delete} ${note.name}`}
                  disabled={busyId === note.id}
                  onClick={() => void handleDelete(note.id)}
                  data-testid={`notes-delete-${note.id}`}
                >
                  {busyId === note.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export type { NoteSummary };
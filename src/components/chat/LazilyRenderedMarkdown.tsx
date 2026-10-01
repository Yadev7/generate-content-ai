"use client";

import dynamic from "next/dynamic";

/**
 * The markdown parser and highlight.js grammars are by far the heaviest part of
 * this route. Loading them lazily keeps the shell (sidebar, composer, welcome
 * screen) interactive immediately, and the parser arrives in parallel while the
 * first response is still streaming.
 *
 * `ssr: false` is safe here because messages only ever exist after a user
 * interaction, so the server never has any message content to render.
 */
const Markdown = dynamic(
  () => import("@/components/chat/Markdown").then((mod) => mod.Markdown),
  {
    ssr: false,
    loading: () => (
      <div
        className="prose-chat animate-pulse text-muted-foreground"
        aria-hidden
      >
        <div className="my-2 h-3.5 w-11/12 rounded bg-muted" />
        <div className="my-2 h-3.5 w-8/12 rounded bg-muted" />
      </div>
    ),
  }
);

export default Markdown;

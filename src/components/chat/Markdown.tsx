"use client";

import { Children, isValidElement, memo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { supportedLanguages } from "@/lib/highlight";

function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be denied (insecure context, permissions).
      // Silently ignore rather than showing a misleading "copied" state.
    }
  };

  return { copied, copy };
}

const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  zsh: "Shell",
  js: "JavaScript",
  javascript: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  py: "Python",
  python: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  java: "Java",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  toml: "TOML",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sql: "SQL",
  md: "Markdown",
  markdown: "Markdown",
  diff: "Diff",
};

function CodeBlock({ children }: { children?: React.ReactNode }) {
  const { t } = useI18n();
  const { copied, copy } = useCopyToClipboard();

  // react-markdown renders a fenced block as <pre><code class="language-x">.
  const codeElement = Children.only(children);
  const className = isValidElement(codeElement) ? codeElement.props.className : undefined;
  const rawClass = Array.isArray(className) ? className.join(" ") : className;
  const language = rawClass?.match(/language-(\w+)/)?.[1];
  const value = isValidElement(codeElement) ? String(codeElement.props.children ?? "") : "";

  return (
    <div className="group/code my-4 overflow-hidden rounded-lg border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b bg-secondary/50 px-3 py-1.5">
        <span className="truncate font-mono text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
          {language ? (LANGUAGE_LABELS[language] ?? language) : t.message.copyCode}
        </span>
        <button
          type="button"
          onClick={() => copy(value)}
          aria-label={copied ? t.message.copiedCode : t.message.copyCode}
          className="inline-flex shrink-0 items-center gap-1.5 rounded px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-success" />
              <span className="hidden sm:inline">{t.message.copied}</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span className="hidden sm:inline">{t.message.copy}</span>
            </>
          )}
        </button>
      </div>
      <pre className="scrollbar-slim overflow-x-auto p-4 text-start text-[0.8125rem] leading-6">
        {children}
      </pre>
    </div>
  );
}

const components: Components = {
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  // Keep streamed/partial markdown from producing a stray "|" or breaking the
  // table layout while tokens are still arriving.
  table: ({ children, ...props }) => (
    <div className="scrollbar-slim my-4 overflow-x-auto rounded-lg border">
      <table {...props}>{children}</table>
    </div>
  ),
  a: ({ children, ...props }) => (
    <a {...props} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  ),
};

function MarkdownImpl({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("prose-chat", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [
            rehypeHighlight,
            {
              languages: supportedLanguages,
              ignoreMissing: true,
              detect: false,
            },
          ],
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Re-renders on every streaming token; memoising keeps unrelated parent
// updates (e.g. hover state, sidebar changes) from re-parsing the whole tree.
export const Markdown = memo(MarkdownImpl);

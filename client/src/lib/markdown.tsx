import React, { useCallback, useEffect, useState } from "react";
import { codeToHtml, type BundledLanguage } from "shiki";

// Languages we support highlighting for — loaded on demand by Shiki
const SUPPORTED_LANGS = new Set([
  "javascript", "js", "typescript", "ts", "tsx", "jsx",
  "python", "py", "go", "rust", "rs", "java", "c", "cpp",
  "csharp", "cs", "ruby", "rb", "php", "swift", "kotlin",
  "html", "css", "scss", "json", "yaml", "yml", "toml",
  "sql", "bash", "sh", "shell", "zsh", "dockerfile",
  "markdown", "md", "graphql", "xml", "lua", "zig",
]);

/**
 * Lightweight markdown renderer for chat messages and AI summaries.
 * Supports: **bold**, *italic*, `inline code`, [links](url),
 * ```code blocks``` with copy button, @mentions, - bullet lists, and line breaks.
 */
export function renderMarkdown(text: string): React.ReactNode {
  // First, split by fenced code blocks (```lang\ncode\n```)
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  const segments: Array<{ type: "text" | "code"; content: string; lang?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", content: match[2], lang: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  // If no code blocks, render text directly
  if (segments.length === 0) {
    return renderTextBlock(text);
  }

  let key = 0;
  return (
    <>
      {segments.map((seg) => {
        if (seg.type === "code") {
          return <CodeBlock key={key++} code={seg.content} language={seg.lang} />;
        }
        return <React.Fragment key={key++}>{renderTextBlock(seg.content)}</React.Fragment>;
      })}
    </>
  );
}

/** Render a text block (no code fences) with line-level markdown */
function renderTextBlock(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-0.5 my-1">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trimStart();

    // Bullet list item
    if (trimmed.startsWith("- ") || trimmed.startsWith("• ")) {
      listItems.push(
        <li key={key++} className="text-inherit">
          {parseInline(trimmed.slice(2))}
        </li>
      );
      continue;
    }

    flushList();

    // Empty line = paragraph break
    if (trimmed === "") {
      elements.push(<div key={key++} className="h-1.5" />);
      continue;
    }

    // Regular line
    elements.push(
      <div key={key++}>{parseInline(trimmed)}</div>
    );
  }

  flushList();
  return <>{elements}</>;
}

/** Code block with Shiki syntax highlighting + copy button */
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  // Highlight with Shiki (async, loads grammar on demand)
  useEffect(() => {
    let cancelled = false;
    const lang = language?.toLowerCase();
    const shikiLang = (lang && SUPPORTED_LANGS.has(lang) ? lang : "text") as BundledLanguage;

    codeToHtml(code, {
      lang: shikiLang,
      theme: "github-dark",
    })
      .then((html) => {
        if (!cancelled) setHighlightedHtml(html);
      })
      .catch(() => {
        // Fallback: no highlighting
        if (!cancelled) setHighlightedHtml(null);
      });

    return () => { cancelled = true; };
  }, [code, language]);

  return (
    <div className="relative my-2 rounded-lg overflow-hidden bg-[#0d1117] border border-neutral-800 group/code">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-neutral-700/50">
        <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
          {language || "code"}
        </span>
        <button
          onClick={handleCopy}
          className="text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      {/* Code content — Shiki highlighted or fallback */}
      {highlightedHtml ? (
        <div
          className="p-3 overflow-x-auto text-[13px] leading-5 [&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_code]:!font-mono"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="p-3 overflow-x-auto text-[13px] leading-5">
          <code className="text-neutral-100 font-mono whitespace-pre">{code}</code>
        </pre>
      )}
    </div>
  );
}

/** Parse inline markdown: **bold**, *italic*, `code`, [text](url), @mentions */
function parseInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Regex matches: **bold**, *italic*, `code`, [text](url), @username
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[([^\]]+)\]\(([^)]+)\))|(@([a-zA-Z0-9_-]+))/g;
  let lastIndex = 0;
  let key = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      parts.push(
        <strong key={key++} className="font-semibold text-neutral-900">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // *italic*
      parts.push(
        <em key={key++} className="italic">
          {match[4]}
        </em>
      );
    } else if (match[5]) {
      // `code`
      parts.push(
        <code
          key={key++}
          className="px-1 py-0.5 bg-neutral-200/60 text-neutral-800 rounded text-[12px] font-mono"
        >
          {match[6]}
        </code>
      );
    } else if (match[7]) {
      // [text](url)
      parts.push(
        <a
          key={key++}
          href={match[9]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {match[8]}
        </a>
      );
    } else if (match[10]) {
      // @mention
      parts.push(
        <span
          key={key++}
          className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-sm font-medium cursor-pointer hover:bg-blue-200 transition-colors"
        >
          @{match[11]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

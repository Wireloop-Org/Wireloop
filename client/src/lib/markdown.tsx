import React from "react";

/**
 * Lightweight markdown renderer for chat messages and AI summaries.
 * Supports: **bold**, *italic*, `inline code`, [links](url),
 * - bullet lists, and line breaks.
 */
export function renderMarkdown(text: string): React.ReactNode {
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

/** Parse inline markdown: **bold**, *italic*, `code`, [text](url) */
function parseInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Regex matches: **bold**, *italic*, `code`, [text](url)
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
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
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

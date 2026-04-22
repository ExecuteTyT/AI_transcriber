/**
 * Простой рендерер Markdown → React-элементы.
 * Поддерживает: ## заголовки, ### подзаголовки, **жирный**, *курсив*,
 * маркированные списки (- / •), чекбоксы (- [ ] / - [x]), параграфы.
 */
export default function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(<ul key={key++} className="space-y-1.5 my-3">{listItems}</ul>);
      listItems = [];
    }
  };

  const renderInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    // Match **bold**, *italic*, and plain text
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      if (match[2]) {
        parts.push(<strong key={`b${match.index}`} className="font-semibold text-[var(--fg)]">{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={`i${match.index}`} className="italic text-[var(--fg-muted)]">{match[3]}</em>);
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Empty line → flush list, add spacing
    if (!trimmed) {
      flushList();
      continue;
    }

    // ## Heading 2
    if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={key++} className="text-lg font-bold text-[var(--fg)] mt-6 mb-2 first:mt-0">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
      continue;
    }

    // ### Heading 3
    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={key++} className="text-base font-semibold text-[var(--fg)] mt-4 mb-1.5">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      continue;
    }

    // Checkbox: - [ ] or - [x]
    const checkboxMatch = trimmed.match(/^-\s*\[([ x])\]\s*(.*)/);
    if (checkboxMatch) {
      const checked = checkboxMatch[1] === "x";
      listItems.push(
        <li key={key++} className="flex items-start gap-2">
          <span
            className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-xs ${
              checked ? "border-transparent" : ""
            }`}
            style={{
              background: checked ? "var(--accent)" : "transparent",
              color: checked ? "var(--accent-fg)" : "inherit",
              borderColor: checked ? "var(--accent)" : "var(--border-strong)",
            }}
          >
            {checked && "✓"}
          </span>
          <span className={checked ? "line-through text-[var(--fg-subtle)]" : "text-[var(--fg-muted)]"}>
            {renderInline(checkboxMatch[2])}
          </span>
        </li>
      );
      continue;
    }

    // List item: - or • or *
    const listMatch = trimmed.match(/^[-•*]\s+(.*)/);
    if (listMatch) {
      listItems.push(
        <li key={key++} className="flex items-start gap-2 text-[var(--fg-muted)]">
          <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--accent)" }} />
          <span>{renderInline(listMatch[1])}</span>
        </li>
      );
      continue;
    }

    // Paragraph
    flushList();
    elements.push(
      <p key={key++} className="text-[var(--fg-muted)] leading-relaxed my-2">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className="space-y-0">{elements}</div>;
}

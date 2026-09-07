import React, { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";

interface MarkdownNoteEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

type Tab = "write" | "preview";

/** Wraps selected text (or inserts at cursor) with a prefix/suffix pair. */
function wrapSelection(
  textarea: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  defaultText: string
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end) || defaultText;
  const before = textarea.value.slice(0, start);
  const after = textarea.value.slice(end);
  const newValue = `${before}${prefix}${selected}${suffix}${after}`;
  const newCursor = start + prefix.length + selected.length + suffix.length;
  return { newValue, newCursor };
}

/** Inserts a line prefix (for headings, lists) at the start of the selection line. */
function insertLinePrefix(textarea: HTMLTextAreaElement, prefix: string) {
  const start = textarea.selectionStart;
  // Find start of line
  const lineStart = textarea.value.lastIndexOf("\n", start - 1) + 1;
  const before = textarea.value.slice(0, lineStart);
  const after = textarea.value.slice(lineStart);
  const newValue = `${before}${prefix}${after}`;
  const newCursor = start + prefix.length;
  return { newValue, newCursor };
}

interface ToolbarAction {
  label: string;
  title: string;
  icon: React.ReactNode;
  action: (ta: HTMLTextAreaElement) => { newValue: string; newCursor: number };
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  {
    label: "B",
    title: "Bold (Ctrl+B)",
    icon: <span className="font-black text-xs">B</span>,
    action: (ta) => wrapSelection(ta, "**", "**", "bold text"),
  },
  {
    label: "I",
    title: "Italic (Ctrl+I)",
    icon: <span className="italic text-xs font-medium">I</span>,
    action: (ta) => wrapSelection(ta, "_", "_", "italic text"),
  },
  {
    label: "S",
    title: "Strikethrough",
    icon: <span className="line-through text-xs">S</span>,
    action: (ta) => wrapSelection(ta, "~~", "~~", "strikethrough"),
  },
  {
    label: "`",
    title: "Inline code",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    action: (ta) => wrapSelection(ta, "`", "`", "code"),
  },
  {
    label: "H",
    title: "Heading",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
      </svg>
    ),
    action: (ta) => insertLinePrefix(ta, "## "),
  },
  {
    label: "UL",
    title: "Bullet list",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    action: (ta) => insertLinePrefix(ta, "- "),
  },
  {
    label: "OL",
    title: "Numbered list",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    action: (ta) => insertLinePrefix(ta, "1. "),
  },
  {
    label: "Link",
    title: "Insert link",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    action: (ta) => wrapSelection(ta, "[", "](url)", "link text"),
  },
];

export const MarkdownNoteEditor: React.FC<MarkdownNoteEditorProps> = ({
  value,
  onChange,
  placeholder = "Add notes, links, or markdown...",
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyToolbarAction = (action: ToolbarAction["action"]) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { newValue, newCursor } = action(ta);
    onChange(newValue);
    // Restore focus + cursor after React re-renders
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    });
  };

  // Keyboard shortcuts in write mode
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      const ta = textareaRef.current;
      if (!ta) return;
      let result: { newValue: string; newCursor: number } | null = null;
      if (e.key === "b") {
        e.preventDefault();
        result = wrapSelection(ta, "**", "**", "bold text");
      } else if (e.key === "i") {
        e.preventDefault();
        result = wrapSelection(ta, "_", "_", "italic text");
      }
      if (result) {
        onChange(result.newValue);
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(result!.newCursor, result!.newCursor);
        });
      }
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.12] overflow-hidden bg-white/[0.03]">
      {/* Tab bar + Toolbar */}
      <div className="flex items-center border-b border-white/[0.08] bg-white/[0.02]">
        {/* Tabs */}
        <div className="flex">
          {(["write", "preview"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={clsx(
                "px-3 py-1.5 text-[11px] font-medium capitalize transition-colors cursor-pointer",
                activeTab === tab
                  ? "text-white border-b-2 border-indigo-400"
                  : "text-white/40 hover:text-white/70"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-white/[0.1] mx-1" />

        {/* Toolbar (only in write mode) */}
        {activeTab === "write" && (
          <div className="flex items-center space-x-0.5 px-1">
            {TOOLBAR_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                title={action.title}
                onMouseDown={(e) => {
                  // Prevent textarea from losing focus
                  e.preventDefault();
                  applyToolbarAction(action.action);
                }}
                className="w-6 h-6 rounded-md flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
              >
                {action.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Write mode */}
      {activeTab === "write" && (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 text-xs bg-transparent text-white/85 resize-y outline-none placeholder:text-white/25 leading-relaxed font-mono"
          style={{ minHeight: "120px", maxHeight: "320px" }}
        />
      )}

      {/* Preview mode */}
      {activeTab === "preview" && (
        <div className="px-3 py-2.5 min-h-[120px]">
          {value.trim() ? (
            <div className="note-preview-body text-xs text-white/70 leading-relaxed">
              <ReactMarkdown
                allowedElements={[
                  "p", "strong", "em", "del", "code", "pre",
                  "h1", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "hr",
                ]}
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 text-white/70 leading-relaxed">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-white/90">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-white/75">{children}</em>
                  ),
                  del: ({ children }) => (
                    <del className="line-through text-white/40">{children}</del>
                  ),
                  code: ({ children }) => (
                    <code className="px-1 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-mono text-[10px]">
                      {children}
                    </code>
                  ),
                  h1: ({ children }) => (
                    <h1 className="text-sm font-bold text-white/90 mt-2 mb-1">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xs font-bold text-white/80 mt-2 mb-1">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xs font-semibold text-white/70 mt-1.5 mb-0.5">{children}</h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-2 pl-4 space-y-0.5 list-disc">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-2 pl-4 space-y-0.5 list-decimal">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-white/60 text-[11px]">{children}</li>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-indigo-400/50 pl-3 italic text-white/50 my-2">
                      {children}
                    </blockquote>
                  ),
                  a: ({ children }) => (
                    <span className="text-indigo-400 underline">{children}</span>
                  ),
                  hr: () => <hr className="my-2 border-white/10" />,
                }}
              >
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-[11px] text-white/20 italic">Nothing to preview yet.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MarkdownNoteEditor;

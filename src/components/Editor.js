import React, { useState, useRef, useCallback, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import BlockRenderer, { detectAndConvertPaste } from "./BlockRenderer";
import { PageIconDisplay } from "./Sidebar";

const BLOCK_TYPES = [
  {
    type: "heading1",
    label: "Heading 1",
    icon: "H1",
    desc: "Large section heading",
  },
  {
    type: "heading2",
    label: "Heading 2",
    icon: "H2",
    desc: "Medium section heading",
  },
  {
    type: "heading3",
    label: "Heading 3",
    icon: "H3",
    desc: "Small section heading",
  },
  {
    type: "paragraph",
    label: "Paragraph",
    icon: "¶",
    desc: "Plain text block",
  },
  { type: "quote", label: "Quote", icon: '"', desc: "Block quotation" },
  {
    type: "code",
    label: "Code Block",
    icon: "<>",
    desc: "Code with syntax highlighting",
  },
  { type: "image", label: "Image", icon: "🖼", desc: "Image from URL" },
  { type: "video", label: "Video", icon: "▶", desc: "Video from URL" },
  { type: "table", label: "Table", icon: "⊞", desc: "Structured data table" },
  {
    type: "callout",
    label: "Callout",
    icon: "💬",
    desc: "Highlighted info box",
  },
  { type: "divider", label: "Divider", icon: "—", desc: "Horizontal rule" },
  { type: "toggle", label: "Toggle", icon: "▸", desc: "Collapsible content" },
  {
    type: "bulletList",
    label: "Bullet List",
    icon: "•",
    desc: "Unordered list",
  },
  {
    type: "numberedList",
    label: "Numbered List",
    icon: "1.",
    desc: "Ordered list",
  },
  { type: "checklist", label: "Checklist", icon: "☑", desc: "Task checklist" },
  {
    type: "columns",
    label: "Two Columns",
    icon: "⊟",
    desc: "Two-column layout",
  },
];

// function BlockMenu({ position, onSelect, onClose }) {
//   const [filter, setFilter] = useState('');
//   const ref = useRef(null);
//   const inputRef = useRef(null);

//   useEffect(() => {
//     inputRef.current?.focus();
//     const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
//     document.addEventListener('mousedown', handler);
//     return () => document.removeEventListener('mousedown', handler);
//   }, [onClose]);

//   const filtered = BLOCK_TYPES.filter(b =>
//     b.label.toLowerCase().includes(filter.toLowerCase()) ||
//     b.desc.toLowerCase().includes(filter.toLowerCase())
//   );

//   return (
//     <div className="block-menu" ref={ref} style={{ top: position.top, left: position.left }}>
//       <div className="block-menu-search">
//         <input ref={inputRef} placeholder="Search blocks..." value={filter} onChange={e => setFilter(e.target.value)}
//           onKeyDown={e => {
//             if (e.key === 'Escape') onClose();
//             if (e.key === 'Enter' && filtered.length > 0) onSelect(filtered[0].type);
//           }}
//         />
//       </div>
//       <div className="block-menu-list">
//         {filtered.map(b => (
//           <button key={b.type} className="block-menu-item" onClick={() => onSelect(b.type)}>
//             <span className="block-menu-icon">{b.icon}</span>
//             <div>
//               <div className="block-menu-label">{b.label}</div>
//               <div className="block-menu-desc">{b.desc}</div>
//             </div>
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }

function BlockMenu({ position, onSelect, onClose }) {
  const [filter, setFilter] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);
  const [menuPos, setMenuPos] = useState({
    top: position.top,
    left: position.left,
  });

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // ✅ Adjust position AFTER render using real size
  useEffect(() => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();

    let newLeft = position.left;
    let newTop = position.top;

    // Prevent right overflow
    if (position.left + rect.width > window.innerWidth) {
      newLeft = window.innerWidth - rect.width - 10;
    }

    // Prevent bottom overflow
    if (position.top + rect.height > window.innerHeight) {
      newTop = window.innerHeight - rect.height - 10;
    }

    // Prevent left/top overflow
    newLeft = Math.max(10, newLeft);
    newTop = Math.max(10, newTop);

    setMenuPos({ top: newTop, left: newLeft });
  }, [position]);

  const filtered = BLOCK_TYPES.filter(
    (b) =>
      b.label.toLowerCase().includes(filter.toLowerCase()) ||
      b.desc.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      className="block-menu"
      ref={ref}
      style={{
        position: "fixed",
        top: menuPos.top,
        left: menuPos.left,
      }}
    >
      <div className="block-menu-search">
        <input
          ref={inputRef}
          placeholder="Search blocks..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && filtered.length > 0)
              onSelect(filtered[0].type);
          }}
        />
      </div>
      <div className="block-menu-list">
        {filtered.map((b) => (
          <button
            key={b.type}
            className="block-menu-item"
            onClick={() => onSelect(b.type)}
          >
            <span className="block-menu-icon">{b.icon}</span>
            <div>
              <div className="block-menu-label">{b.label}</div>
              <div className="block-menu-desc">{b.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Editor({
  page,
  onUpdatePage,
  allPages,
  onSelectPage,
  isLocked,
}) {
  const [blocks, setBlocks] = useState(page.blocks || []);
  const [blockMenu, setBlockMenu] = useState(null);
  const [activeBlockId, setActiveBlockId] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const titleRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    onUpdatePage(page.id, { blocks });
  }, [blocks]); // eslint-disable-line
  useEffect(() => {
    setBlocks(page.blocks || []);
  }, [page.id]); // eslint-disable-line

  const updateBlock = useCallback((blockId, updates) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, ...updates } : b))
    );
  }, []);

  const addBlockAfter = useCallback(
    (afterId, type = "paragraph") => {
      const idx = blocks.findIndex((b) => b.id === afterId);
      const newBlock = createEmptyBlock(type);
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(idx + 1, 0, newBlock);
        return next;
      });
      setTimeout(() => setActiveBlockId(newBlock.id), 50);
      return newBlock.id;
    },
    [blocks]
  );

  const insertBlocksAfter = useCallback(
    (afterId, newBlocks) => {
      const idx = blocks.findIndex((b) => b.id === afterId);
      setBlocks((prev) => {
        const next = [...prev];
        next.splice(idx + 1, 0, ...newBlocks);
        return next;
      });
    },
    [blocks]
  );

  const deleteBlock = useCallback((blockId) => {
    setBlocks((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((b) => b.id === blockId);
      const next = prev.filter((b) => b.id !== blockId);
      const focusIdx = Math.max(0, idx - 1);
      setTimeout(() => setActiveBlockId(next[focusIdx]?.id), 50);
      return next;
    });
  }, []);

  const moveBlock = useCallback((blockId, direction) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      const next = [...prev];
      if (direction === "up" && idx > 0)
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      if (direction === "down" && idx < next.length - 1)
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const changeBlockType = useCallback((blockId, newType) => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== blockId) return b;
        const base = createEmptyBlock(newType);
        return { ...base, id: b.id, content: b.content || "" };
      })
    );
  }, []);

  const openBlockMenu = useCallback((blockId, rect) => {
    setActiveBlockId(blockId);
    setBlockMenu({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left,
      afterId: blockId,
    });
  }, []);

  const handleMenuSelect = useCallback(
    (type) => {
      if (blockMenu) {
        const newId = addBlockAfter(blockMenu.afterId, type);
        setActiveBlockId(newId);
      }
      setBlockMenu(null);
    },
    [blockMenu, addBlockAfter]
  );

  // Smart paste handler
  const handleSmartPaste = useCallback(
    (blockId, text) => {
      const detectedBlocks = detectAndConvertPaste(text);
      if (
        detectedBlocks.length === 1 &&
        detectedBlocks[0].type === "paragraph"
      ) {
        // Single paragraph — just update the current block
        updateBlock(blockId, { content: detectedBlocks[0].content });
      } else {
        // Replace current block content with first block, insert rest after
        const [first, ...rest] = detectedBlocks;
        updateBlock(blockId, {
          type: first.type,
          content: first.content || "",
          ...(first.tableData ? { tableData: first.tableData } : {}),
          ...(first.items ? { items: first.items } : {}),
          ...(first.language ? { language: first.language } : {}),
        });
        if (rest.length) insertBlocksAfter(blockId, rest);
      }
    },
    [updateBlock, insertBlocksAfter]
  );

  // PDF download using browser print
  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    const el = editorRef.current;
    if (!el) {
      setPdfLoading(false);
      return;
    }

    // Open a print window with the editor content styled
    const printWin = window.open("", "_blank");
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${page.title || "Page"}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Poppins',sans-serif;font-size:14px;line-height:1.7;color:#1a1825;background:#fff;padding:40px 60px;}
  h1{font-size:28px;font-weight:700;margin-bottom:24px;letter-spacing:-0.04em;}
  .block{margin-bottom:10px;}
  .h1-text{font-size:24px;font-weight:700;letter-spacing:-0.04em;}
  .h2-text{font-size:19px;font-weight:600;}
  .h3-text{font-size:15px;font-weight:500;}
  .p-text{font-size:14px;font-weight:300;line-height:1.85;}
  .quote-text{font-style:italic;border-left:3px solid #7c6af7;padding-left:14px;color:#6b6880;}
  .code-block{background:#f4f3f9;border:1px solid #dddbe8;border-radius:8px;padding:14px;font-family:'JetBrains Mono',monospace;font-size:12.5px;white-space:pre;overflow:auto;}
  .wiki-table{width:100%;border-collapse:collapse;font-size:13px;border:1px solid #dddbe8;}
  .wiki-table th{background:#f3f2f7;padding:8px 12px;font-weight:600;border:1px solid #dddbe8;text-align:left;}
  .wiki-table td{padding:8px 12px;border:1px solid #e8e6f2;}
  .divider{border:none;border-top:1px solid #dddbe8;margin:12px 0;}
  .callout{border-left:3px solid #7c6af7;background:#f4f3f9;border-radius:8px;padding:12px 14px;}
  .list-item{display:flex;gap:10px;margin-bottom:4px;}
  .list-bullet{color:#6254e0;font-weight:600;min-width:20px;}
  .check-item{display:flex;gap:8px;align-items:center;margin-bottom:4px;}
  .check-item.checked span{text-decoration:line-through;color:#a9a6b8;}
  .page-meta{font-size:11px;color:#a9a6b8;margin-top:4px;margin-bottom:28px;}
  @media print{body{padding:20px 30px;}}
</style>
</head>
<body>
  <h1>${page.icon || ""} ${page.title || "Untitled"}</h1>
  <div class="page-meta">Last updated ${new Date(
    page.updatedAt
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })}</div>
  ${blocks.map((block) => renderBlockForPrint(block)).join("")}
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #dddbe8;font-size:11px;color:#a9a6b8;text-align:center;">
    Engineered by Akhil Antony Joseph Rio · WikiSpace
  </div>
</body>
</html>`;
    printWin.document.write(html);
    printWin.document.close();
    printWin.onload = () => {
      setTimeout(() => {
        printWin.print();
        setPdfLoading(false);
      }, 500);
    };
  };

  const subPages = allPages.filter((p) => p.parentId === page.id);

  return (
    <div className="editor" ref={editorRef}>
      <div className="editor-inner">
        {/* Page header */}
        <div className="page-header">
          <div className="page-header-top">
            <div className="page-header-icon">
              <span className="big-icon">
                <PageIconDisplay icon={page.icon} size={44} />
              </span>
            </div>
            <button
              className={`icon-btn pdf-btn${pdfLoading ? " pdf-loading" : ""}`}
              onClick={handleDownloadPDF}
              title="Download as PDF"
              disabled={pdfLoading}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{pdfLoading ? "Preparing…" : "PDF"}</span>
            </button>
          </div>
          {editingTitle ? (
            <input
              ref={titleRef}
              className="page-title-editor"
              value={page.title}
              autoFocus
              onChange={(e) => onUpdatePage(page.id, { title: e.target.value })}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingTitle(false)}
            />
          ) : (
            <h1
              className="page-title-display"
              onClick={() => !isLocked && setEditingTitle(true)}
            >
              {page.title || "Untitled"}
            </h1>
          )}
          <div className="page-meta">
            Last updated{" "}
            {new Date(page.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>

        {/* Blocks */}
        <div className="blocks-container">
          {blocks.map((block, idx) => (
            <BlockRenderer
              key={block.id}
              block={block}
              isActive={activeBlockId === block.id}
              isFirst={idx === 0}
              isLast={idx === blocks.length - 1}
              onUpdate={(updates) => updateBlock(block.id, updates)}
              onAddAfter={(type) => addBlockAfter(block.id, type)}
              onDelete={() => deleteBlock(block.id)}
              onMoveUp={() => moveBlock(block.id, "up")}
              onMoveDown={() => moveBlock(block.id, "down")}
              onChangeType={(type) => changeBlockType(block.id, type)}
              onFocus={() => setActiveBlockId(block.id)}
              onOpenMenu={(rect) => openBlockMenu(block.id, rect)}
              isLocked={isLocked}
              onSmartPaste={(text) => handleSmartPaste(block.id, text)}
            />
          ))}
          <div className="add-block-footer">
            {!isLocked && (
              <button
                className="add-block-btn"
                onClick={() => {
                  const lastBlock = blocks[blocks.length - 1];
                  if (lastBlock) addBlockAfter(lastBlock.id, "paragraph");
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add a block
              </button>
            )}
          </div>
        </div>

        {/* Subpages */}
        {subPages.length > 0 && (
          <div className="subpages-section">
            <h3 className="subpages-title">Subpages</h3>
            <div className="subpages-grid">
              {subPages.map((sp) => (
                <button
                  key={sp.id}
                  className="subpage-card"
                  onClick={() => onSelectPage(sp.id)}
                >
                  <span className="subpage-card-icon">
                    <PageIconDisplay icon={sp.icon} size={18} />
                  </span>
                  <span className="subpage-card-title">{sp.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Page footer */}
        <div className="page-footer">
          <span>
            <strong>HushNotes</strong>
          </span>
        </div>
      </div>

      {blockMenu && (
        <BlockMenu
          position={blockMenu}
          onSelect={handleMenuSelect}
          onClose={() => setBlockMenu(null)}
        />
      )}
    </div>
  );
}

// Render blocks to HTML string for PDF print
function renderBlockForPrint(block) {
  const align = block.align ? `text-align:${block.align}` : "";
  switch (block.type) {
    case "heading1":
      return `<div class="block h1-text" style="${align}">${esc(
        block.content
      )}</div>`;
    case "heading2":
      return `<div class="block h2-text" style="${align}">${esc(
        block.content
      )}</div>`;
    case "heading3":
      return `<div class="block h3-text" style="${align}">${esc(
        block.content
      )}</div>`;
    case "paragraph":
      return `<div class="block p-text" style="${align}">${esc(
        block.content
      )}</div>`;
    case "quote":
      return `<div class="block quote-text" style="${align}">${esc(
        block.content
      )}</div>`;
    case "divider":
      return `<hr class="divider"/>`;
    case "code":
      return `<div class="block"><div style="font-size:10px;color:#6b6880;margin-bottom:4px">${esc(
        block.language || "code"
      )}</div><div class="code-block">${esc(block.content)}</div></div>`;
    case "callout":
      return `<div class="block callout">${esc(block.content)}</div>`;
    case "bulletList":
      return `<div class="block">${(block.items || [])
        .map(
          (i) =>
            `<div class="list-item"><span class="list-bullet">•</span><span>${esc(
              i.text
            )}</span></div>`
        )
        .join("")}</div>`;
    case "numberedList":
      return `<div class="block">${(block.items || [])
        .map(
          (i, idx) =>
            `<div class="list-item"><span class="list-bullet">${
              idx + 1
            }.</span><span>${esc(i.text)}</span></div>`
        )
        .join("")}</div>`;
    case "checklist":
      return `<div class="block">${(block.items || [])
        .map(
          (i) =>
            `<div class="check-item ${i.checked ? "checked" : ""}"><span>${
              i.checked ? "☑" : "☐"
            }</span><span>${esc(i.text)}</span></div>`
        )
        .join("")}</div>`;
    case "table": {
      const td = block.tableData || { headers: [], rows: [] };
      return `<div class="block"><table class="wiki-table"><thead><tr>${td.headers
        .map((h) => `<th>${esc(h)}</th>`)
        .join("")}</tr></thead><tbody>${td.rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table></div>`;
    }
    case "image":
      return block.content
        ? `<div class="block"><img src="${
            block.content
          }" style="max-width:100%;border-radius:8px;" alt="${esc(
            block.caption || ""
          )}"/>${
            block.caption
              ? `<div style="text-align:center;font-size:12px;color:#6b6880;margin-top:4px">${esc(
                  block.caption
                )}</div>`
              : ""
          }</div>`
        : "";
    default:
      return "";
  }
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createEmptyBlock(type) {
  const base = { id: uuidv4(), type, content: "" };
  switch (type) {
    case "code":
      return { ...base, language: "javascript" };
    case "image":
      return { ...base, content: "", caption: "" };
    case "video":
      return { ...base, content: "", caption: "" };
    case "callout":
      return { ...base, content: "💡 ", variant: "info" };
    case "table":
      return {
        ...base,
        tableData: {
          headers: ["Column 1", "Column 2", "Column 3"],
          rows: [
            ["", "", ""],
            ["", "", ""],
          ],
        },
      };
    case "toggle":
      return {
        ...base,
        content: "Toggle title",
        children: [{ id: uuidv4(), type: "paragraph", content: "" }],
        open: false,
      };
    case "columns":
      return {
        ...base,
        columns: [
          {
            id: uuidv4(),
            blocks: [{ id: uuidv4(), type: "paragraph", content: "" }],
          },
          {
            id: uuidv4(),
            blocks: [{ id: uuidv4(), type: "paragraph", content: "" }],
          },
        ],
      };
    case "checklist":
      return { ...base, items: [{ id: uuidv4(), text: "", checked: false }] };
    case "bulletList":
      return { ...base, items: [{ id: uuidv4(), text: "" }] };
    case "numberedList":
      return { ...base, items: [{ id: uuidv4(), text: "" }] };
    default:
      return base;
  }
}

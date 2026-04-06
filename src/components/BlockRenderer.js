import React, { useState, useRef, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "css",
  "html",
  "bash",
  "json",
  "sql",
  "rust",
  "go",
  "cpp",
  "plaintext",
];
const CALLOUT_VARIANTS = [
  { value: "info", label: "💡 Info" },
  { value: "warning", label: "⚠️ Warning" },
  { value: "error", label: "❌ Error" },
  { value: "success", label: "✅ Success" },
];

// ── Smart paste detector ──
export function detectAndConvertPaste(text) {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const blocks = [];
  let i = 0;
  const looksLikeCode =
    lines.length > 2 &&
    (lines.some((l) => l.startsWith("  ") || l.startsWith("\t")) ||
      lines.some((l) => /[{};=>]/.test(l))) &&
    lines.filter((l) => l.trim()).length > 2;
  if (looksLikeCode)
    return [
      {
        id: uuidv4(),
        type: "code",
        language: "plaintext",
        content: text.trim(),
      },
    ];
  const tableLines = lines.filter((l) => l.trim());
  if (
    tableLines.length >= 2 &&
    tableLines.filter((l) => l.includes("|")).length === tableLines.length
  ) {
    const rows = tableLines
      .filter((l) => !/^\|[-| :]+\|$/.test(l.trim()))
      .map((l) =>
        l
          .split("|")
          .map((c) => c.trim())
          .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1)
      );
    if (rows.length >= 1 && rows[0].length > 0) {
      const headers = rows[0];
      const dataRows = rows.slice(1).length
        ? rows.slice(1)
        : [new Array(headers.length).fill("")];
      return [
        {
          id: uuidv4(),
          type: "table",
          content: "",
          tableData: { headers, rows: dataRows },
        },
      ];
    }
  }
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }
    if (/^# /.test(trimmed)) {
      blocks.push({
        id: uuidv4(),
        type: "heading1",
        content: trimmed.replace(/^# /, ""),
      });
      i++;
      continue;
    }
    if (/^## /.test(trimmed)) {
      blocks.push({
        id: uuidv4(),
        type: "heading2",
        content: trimmed.replace(/^## /, ""),
      });
      i++;
      continue;
    }
    if (/^#{3,} /.test(trimmed)) {
      blocks.push({
        id: uuidv4(),
        type: "heading3",
        content: trimmed.replace(/^#{3,} /, ""),
      });
      i++;
      continue;
    }
    if (/^[-*•] /.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*•] /.test(lines[i].trim())) {
        items.push({
          id: uuidv4(),
          text: lines[i].trim().replace(/^[-*•] /, ""),
        });
        i++;
      }
      blocks.push({ id: uuidv4(), type: "bulletList", content: "", items });
      continue;
    }
    if (/^\d+[.)]\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        items.push({
          id: uuidv4(),
          text: lines[i].trim().replace(/^\d+[.)]\s/, ""),
        });
        i++;
      }
      blocks.push({ id: uuidv4(), type: "numberedList", content: "", items });
      continue;
    }
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim() || "plaintext";
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({
        id: uuidv4(),
        type: "code",
        language: lang,
        content: codeLines.join("\n"),
      });
      continue;
    }
    if (trimmed.startsWith("> ")) {
      blocks.push({ id: uuidv4(), type: "quote", content: trimmed.slice(2) });
      i++;
      continue;
    }
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ id: uuidv4(), type: "divider", content: "" });
      i++;
      continue;
    }
    const paraLines = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (
        !t ||
        /^#{1,6} /.test(t) ||
        /^[-*•] /.test(t) ||
        /^\d+[.)]\s/.test(t) ||
        t.startsWith("```") ||
        t.startsWith("> ") ||
        /^[-*_]{3,}$/.test(t)
      )
        break;
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length)
      blocks.push({
        id: uuidv4(),
        type: "paragraph",
        content: paraLines.join("\n").trim(),
      });
  }
  return blocks.length
    ? blocks
    : [{ id: uuidv4(), type: "paragraph", content: text.trim() }];
}

// ── Block Toolbar ──
function BlockToolbar({
  block,
  isFirst,
  isLast,
  onDelete,
  onMoveUp,
  onMoveDown,
  onChangeType,
  onOpenMenu,
  onAlignChange,
}) {
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [alignMenuOpen, setAlignMenuOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setTypeMenuOpen(false);
        setAlignMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const TYPE_OPTIONS = [
    { type: "paragraph", label: "Text" },
    { type: "heading1", label: "Heading 1" },
    { type: "heading2", label: "Heading 2" },
    { type: "heading3", label: "Heading 3" },
    { type: "quote", label: "Quote" },
    { type: "code", label: "Code" },
    { type: "callout", label: "Callout" },
    { type: "bulletList", label: "Bullet List" },
    { type: "numberedList", label: "Numbered List" },
    { type: "checklist", label: "Checklist" },
  ];
  const ALIGN_OPTIONS = [
    {
      value: "left",
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="15" y2="12" />
          <line x1="3" y1="18" x2="18" y2="18" />
        </svg>
      ),
      label: "Left",
    },
    {
      value: "center",
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="6" y1="12" x2="18" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      ),
      label: "Center",
    },
    {
      value: "right",
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="9" y1="12" x2="21" y2="12" />
          <line x1="6" y1="18" x2="21" y2="18" />
        </svg>
      ),
      label: "Right",
    },
    {
      value: "justify",
      icon: (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      ),
      label: "Justify",
    },
  ];
  const supportsAlign = [
    "heading1",
    "heading2",
    "heading3",
    "paragraph",
    "quote",
    "callout",
  ].includes(block.type);
  const currentAlign = block.align || "left";
  const currentAlignIcon =
    ALIGN_OPTIONS.find((a) => a.value === currentAlign)?.icon ||
    ALIGN_OPTIONS[0].icon;
  return (
    <div className="block-toolbar" ref={ref}>
      <button
        className="tb-btn"
        title="Move up"
        disabled={isFirst}
        onClick={onMoveUp}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        className="tb-btn"
        title="Move down"
        disabled={isLast}
        onClick={onMoveDown}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div className="tb-separator" />
      {supportsAlign && (
        <>
          <button
            className="tb-btn"
            title="Alignment"
            onClick={() => {
              setAlignMenuOpen((s) => !s);
              setTypeMenuOpen(false);
            }}
          >
            {currentAlignIcon}
          </button>
          {alignMenuOpen && (
            <div className="type-dropdown">
              {ALIGN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`type-opt align-opt ${
                    currentAlign === opt.value ? "active" : ""
                  }`}
                  onClick={() => {
                    onAlignChange(opt.value);
                    setAlignMenuOpen(false);
                  }}
                >
                  <span
                    style={{
                      marginRight: 8,
                      display: "inline-flex",
                      verticalAlign: "middle",
                    }}
                  >
                    {opt.icon}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          <div className="tb-separator" />
        </>
      )}
      <button
        className="tb-btn"
        title="Change type"
        onClick={() => {
          setTypeMenuOpen((s) => !s);
          setAlignMenuOpen(false);
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 6h16M4 12h8M4 18h4" />
        </svg>
      </button>
      {typeMenuOpen && (
        <div className="type-dropdown">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              className={`type-opt ${block.type === opt.type ? "active" : ""}`}
              onClick={() => {
                onChangeType(opt.type);
                setTypeMenuOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <button
        className="tb-btn"
        title="Add block below"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onOpenMenu(rect);
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <div className="tb-separator" />
      <button className="tb-btn danger" title="Delete block" onClick={onDelete}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </button>
    </div>
  );
}

// ── EditableText ──
function EditableText({
  value,
  onChange,
  onEnter,
  onPaste,
  placeholder,
  multiline = true,
  className = "",
  style = {},
  isLocked = false,
  align = "left",
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value)
      ref.current.innerText = value || "";
  }, []); // eslint-disable-line
  return (
    <div
      ref={ref}
      className={`editable ${className}`}
      contentEditable={!isLocked}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      style={{ textAlign: align, ...style }}
      onInput={(e) => !isLocked && onChange(e.currentTarget.innerText)}
      onPaste={(e) => {
        if (onPaste && !isLocked) {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          onPaste(text);
        }
      }}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          onEnter && onEnter();
        }
      }}
    />
  );
}

function FlowchartBlock({
  block,
  hovered,
  isActive,
  onUpdate,
  toolbar,
  commonProps,
  isLocked,
}) {
  const [editing, setEditing] = useState(false);
  const [nodes, setNodes] = useState(block.flowchart?.nodes || []);
  const [edges, setEdges] = useState(block.flowchart?.edges || []);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connecting, setConnecting] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [labelVal, setLabelVal] = useState("");
  const svgRef = useRef(null);

  const SHAPES = ["rect", "diamond", "oval", "parallelogram"];

  const PALETTE = [
    { fill: "#ede9fe", stroke: "#7c3aed", text: "#4c1d95" }, // violet
    { fill: "#d1fae5", stroke: "#059669", text: "#064e3b" }, // emerald
    { fill: "#fef3c7", stroke: "#d97706", text: "#78350f" }, // amber
    { fill: "#fee2e2", stroke: "#dc2626", text: "#7f1d1d" }, // red
    { fill: "#dbeafe", stroke: "#2563eb", text: "#1e3a8a" }, // blue
    { fill: "#fce7f3", stroke: "#db2777", text: "#831843" }, // pink
    { fill: "#ccfbf1", stroke: "#0d9488", text: "#134e4a" }, // teal
  ];

  // Compute node dimensions from label text
  const FONT_SIZE = 13;
  const LINE_HEIGHT = 18;
  const H_PAD = 20;
  const V_PAD = 14;
  const MAX_LINE_WIDTH = 130;
  const CHARS_PER_LINE = Math.floor(MAX_LINE_WIDTH / (FONT_SIZE * 0.55));

  const wrapText = (text) => {
    const words = text.split(" ");
    const lines = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (test.length > CHARS_PER_LINE && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  };

  const getNodeSize = (label) => {
    const lines = wrapText(label);
    const w =
      Math.max(...lines.map((l) => l.length * FONT_SIZE * 0.55), 60) +
      H_PAD * 2;
    const h = lines.length * LINE_HEIGHT + V_PAD * 2;
    return { w: Math.ceil(w), h: Math.ceil(h) };
  };

  const save = useCallback(
    (ns, es) => onUpdate({ flowchart: { nodes: ns, edges: es } }),
    [onUpdate]
  );

  const addNode = (shape = "rect") => {
    const id = uuidv4();
    const label = "New node";
    const { w, h } = getNodeSize(label);
    const ns = [
      ...nodes,
      {
        id,
        label,
        x: 80 + Math.random() * 220,
        y: 60 + Math.random() * 180,
        shape,
        palette: 0,
        w,
        h,
      },
    ];
    setNodes(ns);
    save(ns, edges);
  };

  const handleSvgMouseDown = (e) => {
    if (e.target === svgRef.current) {
      setSelected(null);
      setConnecting(null);
    }
  };

  const handleNodeMouseDown = (e, id) => {
    if (!svgRef.current) return;
    e.stopPropagation();
    if (connecting) {
      if (connecting !== id) {
        const es = [...edges, { id: uuidv4(), from: connecting, to: id }];
        setEdges(es);
        save(nodes, es);
      }
      setConnecting(null);
      return;
    }
    const rect = svgRef.current.getBoundingClientRect();
    const node = nodes.find((n) => n.id === id);
    setSelected(id);
    setDragging(id);
    setDragOffset({
      x: e.clientX - rect.left - node.x,
      y: e.clientY - rect.top - node.y,
    });
  };

  const handleMouseMove = (e) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    setNodes((ns) => ns.map((n) => (n.id === dragging ? { ...n, x, y } : n)));
  };

  const handleMouseUp = () => {
    if (dragging) {
      save(nodes, edges);
      setDragging(null);
    }
  };

  const deleteSelected = () => {
    if (!selected) return;
    const ns = nodes.filter((n) => n.id !== selected);
    const es = edges.filter((e) => e.from !== selected && e.to !== selected);
    setNodes(ns);
    setEdges(es);
    save(ns, es);
    setSelected(null);
  };

  const changeNodePalette = (idx) => {
    const ns = nodes.map((n) =>
      n.id === selected ? { ...n, palette: idx } : n
    );
    setNodes(ns);
    save(ns, edges);
  };

  const changeNodeShape = (shape) => {
    const ns = nodes.map((n) => (n.id === selected ? { ...n, shape } : n));
    setNodes(ns);
    save(ns, edges);
  };

  const startEditLabel = (node) => {
    setEditingNode(node.id);
    setLabelVal(node.label);
  };

  const saveLabel = () => {
    const { w, h } = getNodeSize(labelVal || " ");
    const ns = nodes.map((n) =>
      n.id === editingNode ? { ...n, label: labelVal, w, h } : n
    );
    setNodes(ns);
    save(ns, edges);
    setEditingNode(null);
  };

  // Edge anchor: find the point on the node border closest to target center
  const getEdgeAnchor = (node, targetX, targetY) => {
    const cx = node.x + node.w / 2;
    const cy = node.y + node.h / 2;
    const dx = targetX - cx;
    const dy = targetY - cy;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (node.shape === "oval") {
      const angle = Math.atan2(dy, dx);
      return {
        x: cx + (node.w / 2) * Math.cos(angle),
        y: cy + (node.h / 2) * Math.sin(angle),
      };
    }
    // For rect / parallelogram / diamond use bounding box
    const scaleX = absDx > 0 ? node.w / 2 / absDx : Infinity;
    const scaleY = absDy > 0 ? node.h / 2 / absDy : Infinity;
    const scale = Math.min(scaleX, scaleY);
    return { x: cx + dx * scale, y: cy + dy * scale };
  };

  const getNodeCenter = (node) => ({
    x: node.x + node.w / 2,
    y: node.y + node.h / 2,
  });

  // Smooth curved path between two anchor points
  const edgePath = (x1, y1, x2, y2) => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const curve = Math.min(len * 0.35, 60);
    // Perpendicular offset for slight arc
    const px = (-dy / len) * curve * 0.5;
    const py = (dx / len) * curve * 0.5;
    return `M ${x1} ${y1} Q ${mx + px} ${my + py} ${x2} ${y2}`;
  };

  // Render a node shape (SVG primitives, no handlers — added at <g> level)
  const renderShapeOnly = (node, isSelected) => {
    const { x, y, w, h, shape, palette } = node;
    const pal = PALETTE[palette ?? 0];
    const strokeW = isSelected ? 2 : 1.2;
    const fill = pal.fill;
    const stroke = isSelected ? pal.stroke : pal.stroke + "bb";

    if (shape === "diamond") {
      const cx = x + w / 2,
        cy = y + h / 2;
      const pts = `${cx},${y} ${x + w},${cy} ${cx},${y + h} ${x},${cy}`;
      return (
        <polygon
          points={pts}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
        />
      );
    }
    if (shape === "oval") {
      return (
        <ellipse
          cx={x + w / 2}
          cy={y + h / 2}
          rx={w / 2}
          ry={h / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
        />
      );
    }
    if (shape === "parallelogram") {
      const off = Math.min(14, h * 0.3);
      const pts = `${x + off},${y} ${x + w},${y} ${x + w - off},${y + h} ${x},${
        y + h
      }`;
      return (
        <polygon
          points={pts}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW}
        />
      );
    }
    // default: rounded rect
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        ry={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeW}
      />
    );
  };

  // Render wrapped text lines centred in node
  const renderLabel = (node) => {
    const lines = wrapText(node.label);
    const pal = PALETTE[node.palette ?? 0];
    const cx = node.x + node.w / 2;
    const totalH = lines.length * LINE_HEIGHT;
    const startY = node.y + node.h / 2 - totalH / 2 + LINE_HEIGHT / 2;
    return lines.map((line, i) => (
      <text
        key={i}
        x={cx}
        y={startY + i * LINE_HEIGHT}
        textAnchor="middle"
        dominantBaseline="central"
        fill={pal.text}
        fontSize={FONT_SIZE}
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="500"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {line}
      </text>
    ));
  };

  const ARROW_DEFS = (
    <defs>
      <marker
        id="fc-arrow"
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="5"
        orient="auto-start-reverse"
      >
        <path
          d="M2 1.5L8.5 5L2 8.5"
          fill="none"
          stroke="context-stroke"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </marker>
    </defs>
  );

  const renderEdges = (interactive = false) =>
    edges.map((e) => {
      const from = nodes.find((n) => n.id === e.from);
      const to = nodes.find((n) => n.id === e.to);
      if (!from || !to) return null;
      const tc = getNodeCenter(to);
      const fc = getNodeCenter(from);
      const toAnchor = getEdgeAnchor(to, fc.x, fc.y);
      const fromAnchor = getEdgeAnchor(from, tc.x, tc.y);
      const d = edgePath(fromAnchor.x, fromAnchor.y, toAnchor.x, toAnchor.y);
      const strokeColor = "#94a3b8";
      return (
        <g key={e.id}>
          <path
            d={d}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            markerEnd="url(#fc-arrow)"
            strokeLinecap="round"
          />
          {interactive && (
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth="14"
              style={{ cursor: "pointer" }}
              onClick={() => {
                const es = edges.filter((ev) => ev.id !== e.id);
                setEdges(es);
                save(nodes, es);
              }}
            />
          )}
        </g>
      );
    });

  const renderNodes = (interactive = false) =>
    nodes.map((node) => {
      const isSelected = selected === node.id;
      const gProps = interactive
        ? {
            onMouseDown: (e) => handleNodeMouseDown(e, node.id),
            onDoubleClick: () => startEditLabel(node),
            style: {
              cursor: connecting ? "crosshair" : "grab",
              filter: isSelected
                ? `drop-shadow(0 0 6px ${PALETTE[node.palette ?? 0].stroke}88)`
                : "none",
              transition: "filter 0.15s",
            },
          }
        : {};

      return (
        <g key={node.id} {...gProps}>
          {renderShapeOnly(node, isSelected)}
          {interactive && editingNode === node.id ? (
            <foreignObject x={node.x} y={node.y} width={node.w} height={node.h}>
              <textarea
                style={{
                  width: "100%",
                  height: "100%",
                  background: "rgba(255,255,255,0.95)",
                  color: PALETTE[node.palette ?? 0].text,
                  border: "none",
                  resize: "none",
                  textAlign: "center",
                  fontSize: FONT_SIZE,
                  fontFamily: "Inter, system-ui, sans-serif",
                  fontWeight: "500",
                  outline: "none",
                  borderRadius: 8,
                  padding: "6px",
                  boxSizing: "border-box",
                  lineHeight: "1.4",
                  display: "flex",
                  alignItems: "center",
                }}
                value={labelVal}
                autoFocus
                onChange={(e) => setLabelVal(e.target.value)}
                onBlur={saveLabel}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveLabel();
                  }
                  if (e.key === "Escape") setEditingNode(null);
                }}
              />
            </foreignObject>
          ) : (
            renderLabel(node)
          )}
        </g>
      );
    });

  const selectedNode = nodes.find((n) => n.id === selected);

  return (
    <div className="block block-flowchart" {...commonProps}>
      {(hovered || isActive) && toolbar}

      {!isLocked && !editing && (
        <button
          className="flowchart-open-btn"
          onClick={() => setEditing(true)}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M8 12h8M12 8v8" />
          </svg>
          {nodes.length > 0 ? "Edit flowchart" : "Create flowchart"}
        </button>
      )}

      {/* ── Preview ── */}
      {nodes.length > 0 && !editing && (
        <div className="flowchart-preview">
          <svg
            width="100%"
            viewBox="0 0 560 300"
            style={{
              background: "var(--bg-card)",
              borderRadius: 12,
              border: "1px solid var(--border)",
            }}
          >
            {ARROW_DEFS}
            {renderEdges(false)}
            {renderNodes(false)}
          </svg>
        </div>
      )}

      {/* ── Editor modal ── */}
      {editing && (
        <div className="flowchart-overlay">
          <div
            className="flowchart-modal"
            style={{ borderRadius: 14, overflow: "hidden" }}
          >
            {/* Top toolbar */}
            <div
              className="flowchart-toolbar"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                flexWrap: "wrap",
                borderBottom: "1px solid var(--border)",
                background: "var(--bg-card)",
              }}
            >
              <span
                className="flowchart-title"
                style={{ fontWeight: 600, fontSize: 13, marginRight: 4 }}
              >
                Flowchart
              </span>

              {/* Add shape buttons */}
              <div style={{ display: "flex", gap: 5 }}>
                {SHAPES.map((s) => (
                  <button
                    key={s}
                    onClick={() => addNode(s)}
                    title={`Add ${s}`}
                    style={{
                      fontSize: 11,
                      padding: "4px 9px",
                      borderRadius: 7,
                      border: "1px solid var(--border)",
                      background: "var(--bg-page)",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span style={{ fontSize: 10, opacity: 0.7 }}>+</span> {s}
                  </button>
                ))}
              </div>

              {/* Selected-node controls */}
              {selected && selectedNode && (
                <>
                  <div
                    style={{
                      width: 1,
                      height: 20,
                      background: "var(--border)",
                      margin: "0 4px",
                    }}
                  />

                  {/* Palette swatches */}
                  <div
                    style={{ display: "flex", gap: 4, alignItems: "center" }}
                  >
                    {PALETTE.map((pal, i) => (
                      <button
                        key={i}
                        onClick={() => changeNodePalette(i)}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          background: pal.fill,
                          border: `2px solid ${pal.stroke}`,
                          cursor: "pointer",
                          padding: 0,
                          outline:
                            selectedNode.palette === i
                              ? `2px solid ${pal.stroke}`
                              : "none",
                          outlineOffset: 2,
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      width: 1,
                      height: 20,
                      background: "var(--border)",
                      margin: "0 4px",
                    }}
                  />

                  {/* Shape switcher */}
                  <div style={{ display: "flex", gap: 4 }}>
                    {SHAPES.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeNodeShape(s)}
                        style={{
                          fontSize: 11,
                          padding: "4px 8px",
                          borderRadius: 7,
                          border: `1px solid ${
                            selectedNode.shape === s
                              ? "var(--accent)"
                              : "var(--border)"
                          }`,
                          background:
                            selectedNode.shape === s
                              ? "var(--accent-subtle)"
                              : "var(--bg-page)",
                          cursor: "pointer",
                          color: "var(--text-primary)",
                          fontWeight: 500,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div
                    style={{
                      width: 1,
                      height: 20,
                      background: "var(--border)",
                      margin: "0 4px",
                    }}
                  />

                  <button
                    onClick={() =>
                      setConnecting(connecting === selected ? null : selected)
                    }
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 7,
                      border: `1px solid ${
                        connecting === selected
                          ? "var(--accent)"
                          : "var(--border)"
                      }`,
                      background:
                        connecting === selected
                          ? "var(--accent-subtle)"
                          : "var(--bg-page)",
                      cursor: "pointer",
                      color: "var(--text-primary)",
                      fontWeight: 500,
                    }}
                  >
                    ↗ Connect
                  </button>

                  <button
                    onClick={deleteSelected}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 7,
                      border: "1px solid #fca5a5",
                      background: "#fff1f2",
                      cursor: "pointer",
                      color: "#b91c1c",
                      fontWeight: 500,
                    }}
                  >
                    Delete
                  </button>
                </>
              )}

              <div style={{ flex: 1 }} />
              <button
                onClick={() => setEditing(false)}
                style={{
                  fontSize: 12,
                  padding: "5px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: "var(--accent, #7c6af7)",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Done
              </button>
            </div>

            {connecting && (
              <div
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  background: "#eff6ff",
                  color: "#1e40af",
                  borderBottom: "1px solid #bfdbfe",
                }}
              >
                Click another node to draw a connection, or click canvas to
                cancel
              </div>
            )}

            {/* Canvas */}
            <div className="flowchart-canvas-wrap">
              <svg
                ref={svgRef}
                width="100%"
                height={520}
                style={{ background: "var(--bg-page)", display: "block" }}
                onMouseDown={handleSvgMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {ARROW_DEFS}
                {renderEdges(true)}
                {renderNodes(true)}
              </svg>
            </div>

            {/* Footer hint */}
            <div
              style={{
                padding: "8px 14px",
                fontSize: 11,
                color: "var(--text-faint)",
                background: "var(--bg-card)",
                borderTop: "1px solid var(--border)",
              }}
            >
              Double-click to rename · Click an edge to remove it · Drag nodes
              to reposition
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Enhanced Table Block with Excel features ──
function TableBlock({
  block,
  hovered,
  isActive,
  onUpdate,
  toolbar,
  commonProps,
  isLocked,
}) {
  const td = block.tableData || {
    headers: ["Col 1", "Col 2"],
    rows: [["", ""]],
  };
  const [selectedCell, setSelectedCell] = useState(null); // {r: -1 for header, c: col}
  const [formula, setFormula] = useState("");
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [showFormula, setShowFormula] = useState(false);

  // Excel-like formula evaluation
  const evalFormula = (expr, rows, headers) => {
    try {
      const cleaned = expr.trim().replace(/^=/, "");
      // SUM(A1:A5) style
      const sumMatch = cleaned.match(/^SUM\(([A-Z])(\d+):([A-Z])(\d+)\)$/i);
      if (sumMatch) {
        const c1 = sumMatch[1].toUpperCase().charCodeAt(0) - 65;
        const r1 = parseInt(sumMatch[2]) - 1;
        const c2 = sumMatch[3].toUpperCase().charCodeAt(0) - 65;
        const r2 = parseInt(sumMatch[4]) - 1;
        let sum = 0;
        for (let r = r1; r <= r2 && r < rows.length; r++)
          for (let c = c1; c <= c2 && c < (rows[r] || []).length; c++)
            sum += parseFloat(rows[r][c]) || 0;
        return String(sum);
      }
      // AVG/AVERAGE
      const avgMatch = cleaned.match(
        /^(?:AVG|AVERAGE)\(([A-Z])(\d+):([A-Z])(\d+)\)$/i
      );
      if (avgMatch) {
        const c1 = avgMatch[1].toUpperCase().charCodeAt(0) - 65;
        const r1 = parseInt(avgMatch[2]) - 1;
        const c2 = avgMatch[3].toUpperCase().charCodeAt(0) - 65;
        const r2 = parseInt(avgMatch[4]) - 1;
        let sum = 0,
          count = 0;
        for (let r = r1; r <= r2 && r < rows.length; r++)
          for (let c = c1; c <= c2 && c < (rows[r] || []).length; c++) {
            const v = parseFloat(rows[r][c]);
            if (!isNaN(v)) {
              sum += v;
              count++;
            }
          }
        return count ? String((sum / count).toFixed(2)) : "0";
      }
      // COUNT
      const countMatch = cleaned.match(/^COUNT\(([A-Z])(\d+):([A-Z])(\d+)\)$/i);
      if (countMatch) {
        const c1 = countMatch[1].toUpperCase().charCodeAt(0) - 65;
        const r1 = parseInt(countMatch[2]) - 1;
        const c2 = countMatch[3].toUpperCase().charCodeAt(0) - 65;
        const r2 = parseInt(countMatch[4]) - 1;
        let count = 0;
        for (let r = r1; r <= r2 && r < rows.length; r++)
          for (let c = c1; c <= c2 && c < (rows[r] || []).length; c++)
            if (rows[r][c] !== "") count++;
        return String(count);
      }
      // MAX/MIN
      const maxMatch = cleaned.match(
        /^(MAX|MIN)\(([A-Z])(\d+):([A-Z])(\d+)\)$/i
      );
      if (maxMatch) {
        const fn = maxMatch[1].toUpperCase();
        const c1 = maxMatch[2].toUpperCase().charCodeAt(0) - 65;
        const r1 = parseInt(maxMatch[3]) - 1;
        const c2 = maxMatch[4].toUpperCase().charCodeAt(0) - 65;
        const r2 = parseInt(maxMatch[5]) - 1;
        const vals = [];
        for (let r = r1; r <= r2 && r < rows.length; r++)
          for (let c = c1; c <= c2 && c < (rows[r] || []).length; c++) {
            const v = parseFloat(rows[r][c]);
            if (!isNaN(v)) vals.push(v);
          }
        if (!vals.length) return "0";
        return fn === "MAX"
          ? String(Math.max(...vals))
          : String(Math.min(...vals));
      }
      return expr;
    } catch {
      return expr;
    }
  };

  const getCellDisplay = (val, r, c) => {
    if (typeof val === "string" && val.startsWith("="))
      return evalFormula(val, td.rows, td.headers);
    return val;
  };

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };
  const updateHeader = (i, val) => {
    const headers = [...td.headers];
    headers[i] = val;
    onUpdate({ tableData: { ...td, headers } });
  };
  const updateCell = (r, c, val) => {
    const rows = td.rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? val : cell)) : row
    );
    onUpdate({ tableData: { ...td, rows } });
  };
  const addRow = () => {
    onUpdate({
      tableData: {
        ...td,
        rows: [...td.rows, new Array(td.headers.length).fill("")],
      },
    });
  };
  const addCol = () => {
    onUpdate({
      tableData: {
        ...td,
        headers: [...td.headers, `Col ${td.headers.length + 1}`],
        rows: td.rows.map((r) => [...r, ""]),
      },
    });
  };
  const deleteRow = (ri) => {
    if (td.rows.length <= 1) return;
    onUpdate({
      tableData: { ...td, rows: td.rows.filter((_, i) => i !== ri) },
    });
  };
  const deleteCol = (ci) => {
    if (td.headers.length <= 1) return;
    onUpdate({
      tableData: {
        ...td,
        headers: td.headers.filter((_, i) => i !== ci),
        rows: td.rows.map((r) => r.filter((_, i) => i !== ci)),
      },
    });
  };

  const handleSort = (ci) => {
    const dir = sortCol === ci && sortDir === "asc" ? "desc" : "asc";
    setSortCol(ci);
    setSortDir(dir);
    const sorted = [...td.rows].sort((a, b) => {
      const av = parseFloat(a[ci]) || a[ci] || "";
      const bv = parseFloat(b[ci]) || b[ci] || "";
      if (dir === "asc") return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });
    onUpdate({ tableData: { ...td, rows: sorted } });
  };

  const applyFormula = () => {
    if (!selectedCell || selectedCell.r < 0) return;
    updateCell(selectedCell.r, selectedCell.c, formula);
    setFormula("");
  };

  const handleCellSelect = (r, c, val) => {
    setSelectedCell({ r, c });
    setFormula(val || "");
    setShowFormula(true);
  };

  return (
    <div className="block block-table" {...commonProps}>
      {(hovered || isActive) && toolbar}
      {!isLocked && showFormula && (
        <div className="excel-formula-bar">
          <span className="formula-cell-ref">
            {selectedCell && selectedCell.r >= 0
              ? `${String.fromCharCode(65 + selectedCell.c)}${
                  selectedCell.r + 1
                }`
              : ""}
          </span>
          <span className="formula-fx">fx</span>
          <input
            className="formula-input"
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                applyFormula();
              }
              if (e.key === "Escape") setShowFormula(false);
            }}
            placeholder="Type value or =SUM(A1:A3), =AVG(B1:B5), =COUNT, =MAX, =MIN…"
          />
          <button className="formula-apply" onClick={applyFormula}>
            ✓
          </button>
        </div>
      )}
      <div className="table-wrap">
        <table className="wiki-table">
          <thead>
            <tr>
              {td.headers.map((h, i) => (
                <th key={i}>
                  <div className="th-inner">
                    {!isLocked ? (
                      <>
                        <textarea
                          value={h}
                          onChange={(e) => {
                            updateHeader(i, e.target.value);
                            autoGrow(e.target);
                          }}
                          onInput={(e) => autoGrow(e.target)}
                          ref={(el) => {
                            if (el) autoGrow(el);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.preventDefault();
                          }}
                          className="table-cell-input header-input"
                          rows={1}
                        />
                        <button
                          className="sort-btn"
                          onClick={() => handleSort(i)}
                          title="Sort"
                        >
                          {sortCol === i
                            ? sortDir === "asc"
                              ? "↑"
                              : "↓"
                            : "⇅"}
                        </button>
                        {td.headers.length > 1 && (
                          <button
                            className="del-col-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteCol(i);
                            }}
                          >
                            ×
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="header-readonly">{h}</span>
                    )}
                  </div>
                </th>
              ))}
              {!isLocked && (
                <th className="add-col-th">
                  <button
                    className="add-row-col-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      addCol();
                    }}
                  >
                    +col
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {td.rows.map((row, ri) => (
              <tr
                key={ri}
                className={selectedCell?.r === ri ? "row-selected" : ""}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={
                      selectedCell?.r === ri && selectedCell?.c === ci
                        ? "cell-selected"
                        : ""
                    }
                  >
                    {isLocked ? (
                      <span className="cell-display">
                        {getCellDisplay(cell, ri, ci)}
                      </span>
                    ) : (
                      <textarea
                        value={cell}
                        onChange={(e) => {
                          updateCell(ri, ci, e.target.value);
                          autoGrow(e.target);
                        }}
                        onInput={(e) => autoGrow(e.target)}
                        ref={(el) => {
                          if (el) autoGrow(el);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellSelect(ri, ci, cell);
                        }}
                        className="table-cell-input"
                        rows={1}
                      />
                    )}
                    {!isLocked &&
                      typeof cell === "string" &&
                      cell.startsWith("=") && (
                        <span className="formula-result-badge">
                          {getCellDisplay(cell, ri, ci)}
                        </span>
                      )}
                  </td>
                ))}
                {!isLocked && (
                  <td className="del-row-td">
                    {td.rows.length > 1 && (
                      <button
                        className="del-row-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteRow(ri);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!isLocked && (
          <button
            className="add-row-btn"
            onClick={(e) => {
              e.stopPropagation();
              addRow();
            }}
          >
            + Add row
          </button>
        )}
      </div>
    </div>
  );
}

// ── Toggle Block ──
function ToggleBlock({
  block,
  hovered,
  isActive,
  onUpdate,
  toolbar,
  commonProps,
}) {
  const [open, setOpen] = useState(block.open || false);
  const children = block.children || [];
  const updateChild = (childId, updates) => {
    const c = children.map((c) =>
      c.id === childId ? { ...c, ...updates } : c
    );
    onUpdate({ children: c });
  };
  return (
    <div className="block block-toggle" {...commonProps}>
      {(hovered || isActive) && toolbar}
      <div
        className="toggle-header"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
          onUpdate({ open: !open });
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: open ? "rotate(90deg)" : "rotate(0)",
            transition: "transform 0.15s",
            marginRight: 8,
            flexShrink: 0,
          }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <input
          className="toggle-title-input"
          value={block.content}
          onChange={(e) => {
            e.stopPropagation();
            onUpdate({ content: e.target.value });
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder="Toggle title..."
        />
      </div>
      {open && (
        <div className="toggle-children">
          {children.map((c) => (
            <div key={c.id} className="toggle-child">
              <textarea
                className="toggle-child-text"
                value={c.content || ""}
                onChange={(e) => updateChild(c.id, { content: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Content..."
                rows={Math.max(2, (c.content || "").split("\n").length)}
              />
            </div>
          ))}
          <button
            className="toggle-add-child"
            onClick={(e) => {
              e.stopPropagation();
              onUpdate({
                children: [
                  ...children,
                  { id: uuidv4(), type: "paragraph", content: "" },
                ],
              });
            }}
          >
            + Add content
          </button>
        </div>
      )}
    </div>
  );
}

function ListBlock({
  block,
  hovered,
  isActive,
  onUpdate,
  toolbar,
  commonProps,
  ordered,
  isLocked,
}) {
  const items = block.items || [{ id: uuidv4(), text: "" }];
  const updateItem = (id, text) =>
    onUpdate({ items: items.map((i) => (i.id === id ? { ...i, text } : i)) });
  const addItem = (afterIdx) => {
    const ni = { id: uuidv4(), text: "" };
    const arr = [...items];
    arr.splice(afterIdx + 1, 0, ni);
    onUpdate({ items: arr });
  };
  const removeItem = (id) => {
    if (items.length > 1) onUpdate({ items: items.filter((i) => i.id !== id) });
  };
  return (
    <div className="block block-list" {...commonProps}>
      {(hovered || isActive) && toolbar}
      {items.map((item, idx) => (
        <div key={item.id} className="list-item">
          <span className="list-bullet">{ordered ? `${idx + 1}.` : "•"}</span>
          {isLocked ? (
            <span className="p-text">{item.text}</span>
          ) : (
            <>
              <input
                className="list-item-input"
                value={item.text}
                onChange={(e) => updateItem(item.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="List item..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(idx);
                  }
                  if (e.key === "Backspace" && !item.text) {
                    e.preventDefault();
                    removeItem(item.id);
                  }
                }}
              />
              {items.length > 1 && (
                <button
                  className="remove-item-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                >
                  ×
                </button>
              )}
            </>
          )}
        </div>
      ))}
      {!isLocked && (
        <button
          className="add-item-btn"
          onClick={(e) => {
            e.stopPropagation();
            addItem(items.length - 1);
          }}
        >
          + Add item
        </button>
      )}
    </div>
  );
}

function ChecklistBlock({
  block,
  hovered,
  isActive,
  onUpdate,
  toolbar,
  commonProps,
  isLocked,
}) {
  const items = block.items || [{ id: uuidv4(), text: "", checked: false }];
  const updateItem = (id, changes) =>
    onUpdate({
      items: items.map((i) => (i.id === id ? { ...i, ...changes } : i)),
    });
  const addItem = (afterIdx) => {
    const ni = { id: uuidv4(), text: "", checked: false };
    const arr = [...items];
    arr.splice(afterIdx + 1, 0, ni);
    onUpdate({ items: arr });
  };
  const removeItem = (id) => {
    if (items.length > 1) onUpdate({ items: items.filter((i) => i.id !== id) });
  };
  return (
    <div className="block block-checklist" {...commonProps}>
      {(hovered || isActive) && toolbar}
      {items.map((item, idx) => (
        <div
          key={item.id}
          className={`check-item ${item.checked ? "checked" : ""}`}
        >
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => updateItem(item.id, { checked: e.target.checked })}
            onClick={(e) => e.stopPropagation()}
          />
          {isLocked ? (
            <span
              className={item.checked ? "p-text" : "p-text"}
              style={
                item.checked
                  ? { textDecoration: "line-through", opacity: 0.5 }
                  : {}
              }
            >
              {item.text}
            </span>
          ) : (
            <>
              <input
                className="check-item-input"
                value={item.text}
                onChange={(e) => updateItem(item.id, { text: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Task..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem(idx);
                  }
                  if (e.key === "Backspace" && !item.text) {
                    e.preventDefault();
                    removeItem(item.id);
                  }
                }}
              />
              {items.length > 1 && (
                <button
                  className="remove-item-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.id);
                  }}
                >
                  ×
                </button>
              )}
            </>
          )}
        </div>
      ))}
      {!isLocked && (
        <button
          className="add-item-btn"
          onClick={(e) => {
            e.stopPropagation();
            addItem(items.length - 1);
          }}
        >
          + Add task
        </button>
      )}
    </div>
  );
}

function ColumnsBlock({
  block,
  hovered,
  isActive,
  onUpdate,
  toolbar,
  commonProps,
}) {
  const columns = block.columns || [
    {
      id: uuidv4(),
      blocks: [{ id: uuidv4(), type: "paragraph", content: "" }],
    },
    {
      id: uuidv4(),
      blocks: [{ id: uuidv4(), type: "paragraph", content: "" }],
    },
  ];
  const updateColBlock = (colId, blockId, content) => {
    const cols = columns.map((col) =>
      col.id === colId
        ? {
            ...col,
            blocks: col.blocks.map((b) =>
              b.id === blockId ? { ...b, content } : b
            ),
          }
        : col
    );
    onUpdate({ columns: cols });
  };
  return (
    <div className="block block-columns" {...commonProps}>
      {(hovered || isActive) && toolbar}
      <div className="columns-grid">
        {columns.map((col) => (
          <div key={col.id} className="column-pane">
            {col.blocks.map((b) => (
              <textarea
                key={b.id}
                className="column-text"
                value={b.content || ""}
                onChange={(e) => updateColBlock(col.id, b.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Column content..."
                rows={4}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : "";
}

// ── Main BlockRenderer ──
export default function BlockRenderer({
  block,
  isActive,
  isFirst,
  isLast,
  onUpdate,
  onAddAfter,
  onDelete,
  onMoveUp,
  onMoveDown,
  onChangeType,
  onFocus,
  onOpenMenu,
  isLocked,
  onSmartPaste,
}) {
  const [hovered, setHovered] = useState(false);
  const commonProps = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onClick: onFocus,
  };
  const toolbar = !isLocked ? (
    <BlockToolbar
      block={block}
      isFirst={isFirst}
      isLast={isLast}
      onDelete={onDelete}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onChangeType={onChangeType}
      onOpenMenu={onOpenMenu}
      onAlignChange={(align) => onUpdate({ align })}
    />
  ) : null;
  const align = block.align || "left";

  const renderBlock = () => {
    switch (block.type) {
      case "heading1":
        return (
          <div className="block block-heading1" {...commonProps}>
            {(hovered || isActive) && toolbar}
            {isLocked ? (
              <h1
                className="h1-text locked-heading"
                style={{ textAlign: align }}
              >
                {block.content}
              </h1>
            ) : (
              <EditableText
                value={block.content}
                onChange={(v) => onUpdate({ content: v })}
                placeholder="Heading 1"
                multiline={false}
                className="h1-text"
                isLocked={isLocked}
                align={align}
                onPaste={onSmartPaste}
              />
            )}
          </div>
        );
      case "heading2":
        return (
          <div className="block block-heading2" {...commonProps}>
            {(hovered || isActive) && toolbar}
            {isLocked ? (
              <h2
                className="h2-text locked-heading"
                style={{ textAlign: align }}
              >
                {block.content}
              </h2>
            ) : (
              <EditableText
                value={block.content}
                onChange={(v) => onUpdate({ content: v })}
                placeholder="Heading 2"
                multiline={false}
                className="h2-text"
                isLocked={isLocked}
                align={align}
                onPaste={onSmartPaste}
              />
            )}
          </div>
        );
      case "heading3":
        return (
          <div className="block block-heading3" {...commonProps}>
            {(hovered || isActive) && toolbar}
            {isLocked ? (
              <h3
                className="h3-text locked-heading"
                style={{ textAlign: align }}
              >
                {block.content}
              </h3>
            ) : (
              <EditableText
                value={block.content}
                onChange={(v) => onUpdate({ content: v })}
                placeholder="Heading 3"
                multiline={false}
                className="h3-text"
                isLocked={isLocked}
                align={align}
                onPaste={onSmartPaste}
              />
            )}
          </div>
        );
      case "paragraph":
        return (
          <div className="block block-paragraph" {...commonProps}>
            {(hovered || isActive) && toolbar}
            {isLocked ? (
              <p className="p-text" style={{ textAlign: align, margin: 0 }}>
                {block.content}
              </p>
            ) : (
              <EditableText
                value={block.content}
                onChange={(v) => onUpdate({ content: v })}
                placeholder="Start writing..."
                className="p-text"
                isLocked={isLocked}
                align={align}
                onPaste={onSmartPaste}
              />
            )}
          </div>
        );
      case "quote":
        return (
          <div className="block block-quote" {...commonProps}>
            {(hovered || isActive) && toolbar}
            {isLocked ? (
              <blockquote className="quote-text" style={{ textAlign: align }}>
                {block.content}
              </blockquote>
            ) : (
              <EditableText
                value={block.content}
                onChange={(v) => onUpdate({ content: v })}
                placeholder="Quote..."
                className="quote-text"
                isLocked={isLocked}
                align={align}
                onPaste={onSmartPaste}
              />
            )}
          </div>
        );
      case "divider":
        return (
          <div className="block block-divider" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <hr className="divider-line" />
          </div>
        );
      case "code":
        return (
          <div className="block block-code" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <div className="code-header">
              {isLocked ? (
                <span className="code-lang-label">
                  {block.language || "code"}
                </span>
              ) : (
                <select
                  className="code-lang-select"
                  value={block.language || "javascript"}
                  onChange={(e) => onUpdate({ language: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
              <button
                className="copy-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(block.content);
                }}
              >
                Copy
              </button>
            </div>
            {isLocked ? (
              <pre className="code-pre">{block.content}</pre>
            ) : (
              <textarea
                className="code-textarea"
                value={block.content}
                placeholder="// Write code here..."
                onChange={(e) => onUpdate({ content: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                spellCheck={false}
                rows={Math.max(4, (block.content || "").split("\n").length + 1)}
              />
            )}
          </div>
        );
      case "image":
        return (
          <div className="block block-image" {...commonProps}>
            {(hovered || isActive) && toolbar}
            {!isLocked && (
              <input
                className="url-input"
                type="url"
                value={block.content || ""}
                placeholder="Paste image URL..."
                onChange={(e) => onUpdate({ content: e.target.value })}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {block.content && (
              <div className="image-preview">
                <img
                  src={block.content}
                  alt={block.caption || "Image"}
                  onError={(e) => (e.target.style.display = "none")}
                />
                {block.caption && (
                  <div className="image-caption-display">{block.caption}</div>
                )}
                {!isLocked && (
                  <input
                    className="caption-input"
                    type="text"
                    value={block.caption || ""}
                    placeholder="Add caption..."
                    onChange={(e) => onUpdate({ caption: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            )}
          </div>
        );
      case "video":
        return (
          <div className="block block-video" {...commonProps}>
            {(hovered || isActive) && toolbar}
            {!isLocked && (
              <input
                className="url-input"
                type="url"
                value={block.content || ""}
                placeholder="Paste video URL (YouTube, Vimeo, direct MP4)..."
                onChange={(e) => onUpdate({ content: e.target.value })}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {block.content && (
              <div className="video-preview">
                {block.content.includes("youtube.com") ||
                block.content.includes("youtu.be") ? (
                  <iframe
                    width="100%"
                    height="400"
                    src={`https://www.youtube.com/embed/${getYouTubeId(
                      block.content
                    )}`}
                    frameBorder="0"
                    allowFullScreen
                    title="video"
                  />
                ) : block.content.includes("vimeo.com") ? (
                  <iframe
                    width="100%"
                    height="400"
                    src={`https://player.vimeo.com/video/${block.content
                      .split("/")
                      .pop()}`}
                    frameBorder="0"
                    allowFullScreen
                    title="video"
                  />
                ) : (
                  <video controls width="100%">
                    <source src={block.content} />
                    Your browser does not support video.
                  </video>
                )}
                {block.caption && (
                  <div className="image-caption-display">{block.caption}</div>
                )}
                {!isLocked && (
                  <input
                    className="caption-input"
                    type="text"
                    value={block.caption || ""}
                    placeholder="Add caption..."
                    onChange={(e) => onUpdate({ caption: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            )}
          </div>
        );
      case "callout":
        return (
          <div
            className="block block-callout"
            data-variant={block.variant || "info"}
            {...commonProps}
          >
            {(hovered || isActive) && toolbar}
            <div className="callout-inner">
              {!isLocked && (
                <select
                  className="callout-variant-select"
                  value={block.variant || "info"}
                  onChange={(e) => onUpdate({ variant: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                >
                  {CALLOUT_VARIANTS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              )}
              {isLocked ? (
                <p className="callout-text" style={{ textAlign: align }}>
                  {block.content}
                </p>
              ) : (
                <EditableText
                  value={block.content}
                  onChange={(v) => onUpdate({ content: v })}
                  placeholder="Callout text..."
                  className="callout-text"
                  isLocked={isLocked}
                  align={align}
                  onPaste={onSmartPaste}
                />
              )}
            </div>
          </div>
        );
      case "table":
        return (
          <TableBlock
            block={block}
            hovered={hovered}
            isActive={isActive}
            onUpdate={onUpdate}
            toolbar={toolbar}
            commonProps={commonProps}
            isLocked={isLocked}
          />
        );
      case "toggle":
        return (
          <ToggleBlock
            block={block}
            hovered={hovered}
            isActive={isActive}
            onUpdate={onUpdate}
            toolbar={toolbar}
            commonProps={commonProps}
            isLocked={isLocked}
          />
        );
      case "bulletList":
        return (
          <ListBlock
            block={block}
            hovered={hovered}
            isActive={isActive}
            onUpdate={onUpdate}
            toolbar={toolbar}
            commonProps={commonProps}
            ordered={false}
            isLocked={isLocked}
          />
        );
      case "numberedList":
        return (
          <ListBlock
            block={block}
            hovered={hovered}
            isActive={isActive}
            onUpdate={onUpdate}
            toolbar={toolbar}
            commonProps={commonProps}
            ordered={true}
            isLocked={isLocked}
          />
        );
      case "checklist":
        return (
          <ChecklistBlock
            block={block}
            hovered={hovered}
            isActive={isActive}
            onUpdate={onUpdate}
            toolbar={toolbar}
            commonProps={commonProps}
            isLocked={isLocked}
          />
        );
      case "columns":
        return (
          <ColumnsBlock
            block={block}
            hovered={hovered}
            isActive={isActive}
            onUpdate={onUpdate}
            toolbar={toolbar}
            commonProps={commonProps}
            isLocked={isLocked}
          />
        );
      case "flowchart":
        return (
          <FlowchartBlock
            block={block}
            hovered={hovered}
            isActive={isActive}
            onUpdate={onUpdate}
            toolbar={toolbar}
            commonProps={commonProps}
            isLocked={isLocked}
          />
        );
      default:
        return (
          <div className="block block-paragraph" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <EditableText
              value={block.content}
              onChange={(v) => onUpdate({ content: v })}
              placeholder="..."
              className="p-text"
              isLocked={isLocked}
              align={align}
              onPaste={onSmartPaste}
            />
          </div>
        );
    }
  };
  return renderBlock();
}

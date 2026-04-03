import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'css', 'html', 'bash', 'json', 'sql', 'rust', 'go', 'cpp', 'plaintext'];
const CALLOUT_VARIANTS = [
  { value: 'info', label: '💡 Info' },
  { value: 'warning', label: '⚠️ Warning' },
  { value: 'error', label: '❌ Error' },
  { value: 'success', label: '✅ Success' },
];

// ── Smart paste detector ──
export function detectAndConvertPaste(text) {
  const lines = text.split('\n').map(l => l.trimEnd());
  const blocks = [];
  let i = 0;

  const looksLikeCode = lines.length > 2 &&
    (lines.some(l => l.startsWith('  ') || l.startsWith('\t')) ||
     lines.some(l => /[{};=>]/.test(l))) &&
    lines.filter(l => l.trim()).length > 2;

  if (looksLikeCode) {
    return [{ id: uuidv4(), type: 'code', language: 'plaintext', content: text.trim() }];
  }

  const tableLines = lines.filter(l => l.trim());
  if (tableLines.length >= 2 && tableLines.filter(l => l.includes('|')).length === tableLines.length) {
    const rows = tableLines
      .filter(l => !/^\|[-| :]+\|$/.test(l.trim()))
      .map(l => l.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1));
    if (rows.length >= 1 && rows[0].length > 0) {
      const headers = rows[0];
      const dataRows = rows.slice(1).length ? rows.slice(1) : [new Array(headers.length).fill('')];
      return [{ id: uuidv4(), type: 'table', content: '', tableData: { headers, rows: dataRows } }];
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }

    if (/^# /.test(trimmed)) { blocks.push({ id: uuidv4(), type: 'heading1', content: trimmed.replace(/^# /, '') }); i++; continue; }
    if (/^## /.test(trimmed)) { blocks.push({ id: uuidv4(), type: 'heading2', content: trimmed.replace(/^## /, '') }); i++; continue; }
    if (/^#{3,} /.test(trimmed)) { blocks.push({ id: uuidv4(), type: 'heading3', content: trimmed.replace(/^#{3,} /, '') }); i++; continue; }

    if (/^[-*•] /.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*•] /.test(lines[i].trim())) {
        items.push({ id: uuidv4(), text: lines[i].trim().replace(/^[-*•] /, '') }); i++;
      }
      blocks.push({ id: uuidv4(), type: 'bulletList', content: '', items }); continue;
    }

    if (/^\d+[.)]\s/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+[.)]\s/.test(lines[i].trim())) {
        items.push({ id: uuidv4(), text: lines[i].trim().replace(/^\d+[.)]\s/, '') }); i++;
      }
      blocks.push({ id: uuidv4(), type: 'numberedList', content: '', items }); continue;
    }

    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'plaintext'; i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) { codeLines.push(lines[i]); i++; }
      i++;
      blocks.push({ id: uuidv4(), type: 'code', language: lang, content: codeLines.join('\n') }); continue;
    }

    if (trimmed.startsWith('> ')) { blocks.push({ id: uuidv4(), type: 'quote', content: trimmed.slice(2) }); i++; continue; }
    if (/^[-*_]{3,}$/.test(trimmed)) { blocks.push({ id: uuidv4(), type: 'divider', content: '' }); i++; continue; }

    const paraLines = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t || /^#{1,6} /.test(t) || /^[-*•] /.test(t) || /^\d+[.)]\s/.test(t) ||
          t.startsWith('```') || t.startsWith('> ') || /^[-*_]{3,}$/.test(t)) break;
      paraLines.push(lines[i]); i++;
    }
    if (paraLines.length) blocks.push({ id: uuidv4(), type: 'paragraph', content: paraLines.join('\n').trim() });
  }

  return blocks.length ? blocks : [{ id: uuidv4(), type: 'paragraph', content: text.trim() }];
}

// ── Block Toolbar ──
function BlockToolbar({ block, isFirst, isLast, onDelete, onMoveUp, onMoveDown, onChangeType, onOpenMenu, onAlignChange }) {
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [alignMenuOpen, setAlignMenuOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) { setTypeMenuOpen(false); setAlignMenuOpen(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const TYPE_OPTIONS = [
    { type: 'paragraph', label: 'Text' }, { type: 'heading1', label: 'Heading 1' },
    { type: 'heading2', label: 'Heading 2' }, { type: 'heading3', label: 'Heading 3' },
    { type: 'quote', label: 'Quote' }, { type: 'code', label: 'Code' },
    { type: 'callout', label: 'Callout' }, { type: 'bulletList', label: 'Bullet List' },
    { type: 'numberedList', label: 'Numbered List' }, { type: 'checklist', label: 'Checklist' },
  ];

  const ALIGN_OPTIONS = [
    { value: 'left', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>, label: 'Left' },
    { value: 'center', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>, label: 'Center' },
    { value: 'right', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>, label: 'Right' },
    { value: 'justify', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>, label: 'Justify' },
  ];

  const supportsAlign = ['heading1','heading2','heading3','paragraph','quote','callout'].includes(block.type);
  const currentAlign = block.align || 'left';
  const currentAlignIcon = ALIGN_OPTIONS.find(a => a.value === currentAlign)?.icon || ALIGN_OPTIONS[0].icon;

  return (
    <div className="block-toolbar" ref={ref}>
      <button className="tb-btn" title="Move up" disabled={isFirst} onClick={onMoveUp}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
      <button className="tb-btn" title="Move down" disabled={isLast} onClick={onMoveDown}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <div className="tb-separator"/>
      {supportsAlign && (
        <>
          <button className="tb-btn" title="Alignment" onClick={() => { setAlignMenuOpen(s => !s); setTypeMenuOpen(false); }}>
            {currentAlignIcon}
          </button>
          {alignMenuOpen && (
            <div className="type-dropdown">
              {ALIGN_OPTIONS.map(opt => (
                <button key={opt.value} className={`type-opt align-opt ${currentAlign === opt.value ? 'active' : ''}`}
                  onClick={() => { onAlignChange(opt.value); setAlignMenuOpen(false); }}>
                  <span style={{marginRight:8,display:'inline-flex',verticalAlign:'middle'}}>{opt.icon}</span>{opt.label}
                </button>
              ))}
            </div>
          )}
          <div className="tb-separator"/>
        </>
      )}
      <button className="tb-btn" title="Change type" onClick={() => { setTypeMenuOpen(s => !s); setAlignMenuOpen(false); }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h8M4 18h4"/></svg>
      </button>
      {typeMenuOpen && (
        <div className="type-dropdown">
          {TYPE_OPTIONS.map(opt => (
            <button key={opt.type} className={`type-opt ${block.type === opt.type ? 'active' : ''}`}
              onClick={() => { onChangeType(opt.type); setTypeMenuOpen(false); }}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <button className="tb-btn" title="Add block below" onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); onOpenMenu(rect); }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
      <div className="tb-separator"/>
      <button className="tb-btn danger" title="Delete block" onClick={onDelete}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  );
}

// ── EditableText with smart paste ──
function EditableText({ value, onChange, onEnter, onPaste, placeholder, multiline = true, className = '', style = {}, isLocked = false, align = 'left' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value || '';
    }
  }, []); // eslint-disable-line

  return (
    <div
      ref={ref}
      className={`editable ${className}`}
      contentEditable={!isLocked}
      suppressContentEditableWarning
      data-placeholder={placeholder}
      style={{ textAlign: align, ...style }}
      onInput={e => !isLocked && onChange(e.currentTarget.innerText)}
      onPaste={e => {
        if (onPaste && !isLocked) {
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          onPaste(text);
        }
      }}
      onKeyDown={e => {
        if (!multiline && e.key === 'Enter') { e.preventDefault(); onEnter && onEnter(); }
      }}
    />
  );
}

// ── Main BlockRenderer ──
export default function BlockRenderer({ block, isActive, isFirst, isLast, onUpdate, onAddAfter, onDelete, onMoveUp, onMoveDown, onChangeType, onFocus, onOpenMenu, isLocked, onSmartPaste }) {
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

  const align = block.align || 'left';

  const renderBlock = () => {
    switch (block.type) {
      case 'heading1':
        return (
          <div className="block block-heading1" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <EditableText value={block.content} onChange={v => onUpdate({ content: v })} placeholder="Heading 1" multiline={false} className="h1-text" isLocked={isLocked} align={align} onPaste={onSmartPaste} />
          </div>
        );
      case 'heading2':
        return (
          <div className="block block-heading2" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <EditableText value={block.content} onChange={v => onUpdate({ content: v })} placeholder="Heading 2" multiline={false} className="h2-text" isLocked={isLocked} align={align} onPaste={onSmartPaste} />
          </div>
        );
      case 'heading3':
        return (
          <div className="block block-heading3" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <EditableText value={block.content} onChange={v => onUpdate({ content: v })} placeholder="Heading 3" multiline={false} className="h3-text" isLocked={isLocked} align={align} onPaste={onSmartPaste} />
          </div>
        );
      case 'paragraph':
        return (
          <div className="block block-paragraph" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <EditableText value={block.content} onChange={v => onUpdate({ content: v })} placeholder="Start writing..." className="p-text" isLocked={isLocked} align={align} onPaste={onSmartPaste} />
          </div>
        );
      case 'quote':
        return (
          <div className="block block-quote" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <EditableText value={block.content} onChange={v => onUpdate({ content: v })} placeholder="Quote..." className="quote-text" isLocked={isLocked} align={align} onPaste={onSmartPaste} />
          </div>
        );
      case 'divider':
        return (
          <div className="block block-divider" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <hr className="divider-line" />
          </div>
        );
      case 'code':
        return (
          <div className="block block-code" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <div className="code-header">
              <select className="code-lang-select" value={block.language || 'javascript'} onChange={e => onUpdate({ language: e.target.value })} onClick={e => e.stopPropagation()}>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              <button className="copy-btn" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(block.content); }}>Copy</button>
            </div>
            <textarea
              className="code-textarea"
              value={block.content}
              placeholder="// Write code here..."
              onChange={e => onUpdate({ content: e.target.value })}
              onClick={e => e.stopPropagation()}
              spellCheck={false}
              rows={Math.max(4, (block.content || '').split('\n').length + 1)}
            />
          </div>
        );
      case 'image':
        return (
          <div className="block block-image" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <input className="url-input" type="url" value={block.content || ''} placeholder="Paste image URL..."
              onChange={e => onUpdate({ content: e.target.value })} onClick={e => e.stopPropagation()} />
            {block.content && (
              <div className="image-preview">
                <img src={block.content} alt={block.caption || 'Image'} onError={e => e.target.style.display = 'none'} />
                <input className="caption-input" type="text" value={block.caption || ''} placeholder="Add caption..."
                  onChange={e => onUpdate({ caption: e.target.value })} onClick={e => e.stopPropagation()} />
              </div>
            )}
          </div>
        );
      case 'video':
        return (
          <div className="block block-video" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <input className="url-input" type="url" value={block.content || ''} placeholder="Paste video URL (YouTube, Vimeo, direct MP4)..."
              onChange={e => onUpdate({ content: e.target.value })} onClick={e => e.stopPropagation()} />
            {block.content && (
              <div className="video-preview">
                {block.content.includes('youtube.com') || block.content.includes('youtu.be') ? (
                  <iframe width="100%" height="400" src={`https://www.youtube.com/embed/${getYouTubeId(block.content)}`} frameBorder="0" allowFullScreen title="video" />
                ) : block.content.includes('vimeo.com') ? (
                  <iframe width="100%" height="400" src={`https://player.vimeo.com/video/${block.content.split('/').pop()}`} frameBorder="0" allowFullScreen title="video" />
                ) : (
                  <video controls width="100%"><source src={block.content} />Your browser does not support video.</video>
                )}
                <input className="caption-input" type="text" value={block.caption || ''} placeholder="Add caption..."
                  onChange={e => onUpdate({ caption: e.target.value })} onClick={e => e.stopPropagation()} />
              </div>
            )}
          </div>
        );
      case 'callout':
        return (
          <div className="block block-callout" data-variant={block.variant || 'info'} {...commonProps}>
            {(hovered || isActive) && toolbar}
            <div className="callout-inner">
              <select className="callout-variant-select" value={block.variant || 'info'} onChange={e => onUpdate({ variant: e.target.value })} onClick={e => e.stopPropagation()}>
                {CALLOUT_VARIANTS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
              <EditableText value={block.content} onChange={v => onUpdate({ content: v })} placeholder="Callout text..." className="callout-text" isLocked={isLocked} align={align} onPaste={onSmartPaste} />
            </div>
          </div>
        );
      case 'table':
        return <TableBlock block={block} hovered={hovered} isActive={isActive} onUpdate={onUpdate} toolbar={toolbar} commonProps={commonProps} isLocked={isLocked} />;
      case 'toggle':
        return <ToggleBlock block={block} hovered={hovered} isActive={isActive} onUpdate={onUpdate} toolbar={toolbar} commonProps={commonProps} isLocked={isLocked} />;
      case 'bulletList':
        return <ListBlock block={block} hovered={hovered} isActive={isActive} onUpdate={onUpdate} toolbar={toolbar} commonProps={commonProps} ordered={false} isLocked={isLocked} />;
      case 'numberedList':
        return <ListBlock block={block} hovered={hovered} isActive={isActive} onUpdate={onUpdate} toolbar={toolbar} commonProps={commonProps} ordered={true} isLocked={isLocked} />;
      case 'checklist':
        return <ChecklistBlock block={block} hovered={hovered} isActive={isActive} onUpdate={onUpdate} toolbar={toolbar} commonProps={commonProps} isLocked={isLocked} />;
      case 'columns':
        return <ColumnsBlock block={block} hovered={hovered} isActive={isActive} onUpdate={onUpdate} toolbar={toolbar} commonProps={commonProps} isLocked={isLocked} />;
      default:
        return (
          <div className="block block-paragraph" {...commonProps}>
            {(hovered || isActive) && toolbar}
            <EditableText value={block.content} onChange={v => onUpdate({ content: v })} placeholder="..." className="p-text" isLocked={isLocked} align={align} onPaste={onSmartPaste} />
          </div>
        );
    }
  };

  return renderBlock();
}

function TableBlock({ block, hovered, isActive, onUpdate, toolbar, commonProps, isLocked }) {
  const td = block.tableData || { headers: ['Col 1', 'Col 2'], rows: [['', '']] };
  const autoGrow = (el) => { if (!el) return; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; };
  const updateHeader = (i, val) => { const headers = [...td.headers]; headers[i] = val; onUpdate({ tableData: { ...td, headers } }); };
  const updateCell = (r, c, val) => { const rows = td.rows.map((row, ri) => ri === r ? row.map((cell, ci) => ci === c ? val : cell) : row); onUpdate({ tableData: { ...td, rows } }); };
  const addRow = () => { const newRow = new Array(td.headers.length).fill(''); onUpdate({ tableData: { ...td, rows: [...td.rows, newRow] } }); };
  const addCol = () => { const headers = [...td.headers, `Col ${td.headers.length + 1}`]; const rows = td.rows.map(r => [...r, '']); onUpdate({ tableData: { ...td, headers, rows } }); };
  const deleteRow = (ri) => { if (td.rows.length <= 1) return; onUpdate({ tableData: { ...td, rows: td.rows.filter((_, i) => i !== ri) } }); };
  const deleteCol = (ci) => { if (td.headers.length <= 1) return; const headers = td.headers.filter((_, i) => i !== ci); const rows = td.rows.map(r => r.filter((_, i) => i !== ci)); onUpdate({ tableData: { ...td, headers, rows } }); };

  return (
    <div className="block block-table" {...commonProps}>
      {(hovered || isActive) && toolbar}
      <div className="table-wrap">
        <table className="wiki-table">
          <thead><tr>
            {td.headers.map((h, i) => (
              <th key={i}><div className="th-inner">
                <textarea value={h} readOnly={isLocked} onChange={e => { updateHeader(i, e.target.value); autoGrow(e.target); }}
                  onInput={e => autoGrow(e.target)} ref={el => { if (el) autoGrow(el); }} onClick={e => e.stopPropagation()}
                  onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} className="table-cell-input header-input" rows={1} />
                {!isLocked && td.headers.length > 1 && (<button className="del-col-btn" onClick={e => { e.stopPropagation(); deleteCol(i); }}>×</button>)}
              </div></th>
            ))}
            {!isLocked && (<th className="add-col-th"><button className="add-row-col-btn" onClick={e => { e.stopPropagation(); addCol(); }}>+col</button></th>)}
          </tr></thead>
          <tbody>
            {td.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}><textarea value={cell} readOnly={isLocked} onChange={e => { updateCell(ri, ci, e.target.value); autoGrow(e.target); }}
                    onInput={e => autoGrow(e.target)} ref={el => { if (el) autoGrow(el); }} onClick={e => e.stopPropagation()} className="table-cell-input" rows={1} /></td>
                ))}
                {!isLocked && (<td className="del-row-td">{td.rows.length > 1 && <button className="del-row-btn" onClick={e => { e.stopPropagation(); deleteRow(ri); }}>×</button>}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!isLocked && (<button className="add-row-btn" onClick={e => { e.stopPropagation(); addRow(); }}>+ Add row</button>)}
      </div>
    </div>
  );
}

function ToggleBlock({ block, hovered, isActive, onUpdate, toolbar, commonProps }) {
  const [open, setOpen] = useState(block.open || false);
  const children = block.children || [];
  const updateChild = (childId, updates) => { const c = children.map(c => c.id === childId ? { ...c, ...updates } : c); onUpdate({ children: c }); };
  return (
    <div className="block block-toggle" {...commonProps}>
      {(hovered || isActive) && toolbar}
      <div className="toggle-header" onClick={e => { e.stopPropagation(); setOpen(o => !o); onUpdate({ open: !open }); }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.15s', marginRight: 8, flexShrink: 0 }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <input className="toggle-title-input" value={block.content} onChange={e => { e.stopPropagation(); onUpdate({ content: e.target.value }); }} onClick={e => e.stopPropagation()} placeholder="Toggle title..." />
      </div>
      {open && (
        <div className="toggle-children">
          {children.map(c => (
            <div key={c.id} className="toggle-child">
              <textarea className="toggle-child-text" value={c.content || ''} onChange={e => updateChild(c.id, { content: e.target.value })} onClick={e => e.stopPropagation()} placeholder="Content..." rows={Math.max(2, (c.content || '').split('\n').length)} />
            </div>
          ))}
          <button className="toggle-add-child" onClick={e => { e.stopPropagation(); onUpdate({ children: [...children, { id: uuidv4(), type: 'paragraph', content: '' }] }); }}>+ Add content</button>
        </div>
      )}
    </div>
  );
}

function ListBlock({ block, hovered, isActive, onUpdate, toolbar, commonProps, ordered }) {
  const items = block.items || [{ id: uuidv4(), text: '' }];
  const updateItem = (id, text) => onUpdate({ items: items.map(i => i.id === id ? { ...i, text } : i) });
  const addItem = (afterIdx) => { const ni = { id: uuidv4(), text: '' }; const arr = [...items]; arr.splice(afterIdx + 1, 0, ni); onUpdate({ items: arr }); };
  const removeItem = (id) => { if (items.length > 1) onUpdate({ items: items.filter(i => i.id !== id) }); };
  return (
    <div className="block block-list" {...commonProps}>
      {(hovered || isActive) && toolbar}
      {items.map((item, idx) => (
        <div key={item.id} className="list-item">
          <span className="list-bullet">{ordered ? `${idx + 1}.` : '•'}</span>
          <input className="list-item-input" value={item.text} onChange={e => updateItem(item.id, e.target.value)} onClick={e => e.stopPropagation()} placeholder="List item..."
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addItem(idx); }
              if (e.key === 'Backspace' && !item.text) { e.preventDefault(); removeItem(item.id); }
            }} />
          {items.length > 1 && (<button className="remove-item-btn" onClick={e => { e.stopPropagation(); removeItem(item.id); }}>×</button>)}
        </div>
      ))}
      <button className="add-item-btn" onClick={e => { e.stopPropagation(); addItem(items.length - 1); }}>+ Add item</button>
    </div>
  );
}

function ChecklistBlock({ block, hovered, isActive, onUpdate, toolbar, commonProps }) {
  const items = block.items || [{ id: uuidv4(), text: '', checked: false }];
  const updateItem = (id, changes) => onUpdate({ items: items.map(i => i.id === id ? { ...i, ...changes } : i) });
  const addItem = (afterIdx) => { const ni = { id: uuidv4(), text: '', checked: false }; const arr = [...items]; arr.splice(afterIdx + 1, 0, ni); onUpdate({ items: arr }); };
  const removeItem = (id) => { if (items.length > 1) onUpdate({ items: items.filter(i => i.id !== id) }); };
  return (
    <div className="block block-checklist" {...commonProps}>
      {(hovered || isActive) && toolbar}
      {items.map((item, idx) => (
        <div key={item.id} className={`check-item ${item.checked ? 'checked' : ''}`}>
          <input type="checkbox" checked={item.checked} onChange={e => updateItem(item.id, { checked: e.target.checked })} onClick={e => e.stopPropagation()} />
          <input className="check-item-input" value={item.text} onChange={e => updateItem(item.id, { text: e.target.value })} onClick={e => e.stopPropagation()} placeholder="Task..."
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addItem(idx); }
              if (e.key === 'Backspace' && !item.text) { e.preventDefault(); removeItem(item.id); }
            }} />
          {items.length > 1 && (<button className="remove-item-btn" onClick={e => { e.stopPropagation(); removeItem(item.id); }}>×</button>)}
        </div>
      ))}
      <button className="add-item-btn" onClick={e => { e.stopPropagation(); addItem(items.length - 1); }}>+ Add task</button>
    </div>
  );
}

function ColumnsBlock({ block, hovered, isActive, onUpdate, toolbar, commonProps }) {
  const columns = block.columns || [
    { id: uuidv4(), blocks: [{ id: uuidv4(), type: 'paragraph', content: '' }] },
    { id: uuidv4(), blocks: [{ id: uuidv4(), type: 'paragraph', content: '' }] }
  ];
  const updateColBlock = (colId, blockId, content) => {
    const cols = columns.map(col => col.id === colId ? { ...col, blocks: col.blocks.map(b => b.id === blockId ? { ...b, content } : b) } : col);
    onUpdate({ columns: cols });
  };
  return (
    <div className="block block-columns" {...commonProps}>
      {(hovered || isActive) && toolbar}
      <div className="columns-grid">
        {columns.map(col => (
          <div key={col.id} className="column-pane">
            {col.blocks.map(b => (
              <textarea key={b.id} className="column-text" value={b.content || ''} onChange={e => updateColBlock(col.id, b.id, e.target.value)} onClick={e => e.stopPropagation()} placeholder="Column content..." rows={4} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function getYouTubeId(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : '';
}

import React, { useState, useEffect, useCallback, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import Sidebar, { PageIconDisplay } from "./components/Sidebar";
import Editor from "./components/Editor";
import "./styles.css";

const DEFAULT_DATA_PATH = "/data.json";

// Extract all text from a block for search indexing
function extractBlockText(block) {
  if (!block) return "";
  const parts = [];
  if (block.content) parts.push(block.content);
  if (block.items) block.items.forEach((i) => parts.push(i.text || ""));
  if (block.tableData) {
    block.tableData.headers.forEach((h) => parts.push(h));
    block.tableData.rows.forEach((row) => row.forEach((c) => parts.push(c)));
  }
  if (block.children)
    block.children.forEach((c) => {
      if (c.content) parts.push(c.content);
    });
  if (block.columns)
    block.columns.forEach((col) =>
      col.blocks.forEach((b) => {
        if (b.content) parts.push(b.content);
      })
    );
  return parts.join(" ");
}

function GlobalSearch({ pages, onSelectPage, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const ref = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("keydown", handler);
    document.addEventListener("mousedown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const results =
    q.length < 2
      ? []
      : pages.flatMap((page) => {
          const titleMatch = page.title.toLowerCase().includes(q);
          const matchingBlocks = (page.blocks || []).filter((b) => {
            const text = extractBlockText(b).toLowerCase();
            return text.includes(q);
          });
          if (!titleMatch && matchingBlocks.length === 0) return [];
          return [
            {
              page,
              titleMatch,
              snippets: matchingBlocks.slice(0, 2).map((b) => {
                const text = extractBlockText(b);
                const idx = text.toLowerCase().indexOf(q);
                const start = Math.max(0, idx - 40);
                const end = Math.min(text.length, idx + q.length + 60);
                return text.slice(start, end);
              }),
            },
          ];
        });

  function highlight(text, q) {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark>{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div className="global-search-overlay">
      <div className="global-search-modal" ref={ref}>
        <div className="global-search-input-wrap">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ flexShrink: 0, color: "var(--text-faint)" }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="global-search-input"
            placeholder="Search all pages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="clear-search" onClick={() => setQuery("")}>
              ✕
            </button>
          )}
          <kbd className="search-esc-hint">ESC</kbd>
        </div>
        <div className="global-search-results">
          {q.length < 2 ? (
            <div className="search-hint">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 ? (
            <div className="search-hint">
              No results for "<strong>{query}</strong>"
            </div>
          ) : (
            results.map(({ page, titleMatch, snippets }) => (
              <button
                key={page.id}
                className="search-result-item"
                onClick={() => {
                  onSelectPage(page.id);
                  onClose();
                }}
              >
                <div className="search-result-icon">
                  <PageIconDisplay icon={page.icon} size={18} />
                </div>
                <div className="search-result-content">
                  <div className="search-result-title">
                    {highlight(page.title, q)}
                  </div>
                  {snippets.map((s, i) => (
                    <div key={i} className="search-result-snippet">
                      …{highlight(s, q)}…
                    </div>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState("light");
  const [data, setData] = useState({ appName: "HushNotes", pages: [] });
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [expandedPages, setExpandedPages] = useState({});
  const [editingAppName, setEditingAppName] = useState(false);
  const isMobile = () => window.innerWidth < 768;
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile());
  const [isLocked, setIsLocked] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadData = (d) => {
      setData(d);
      if (d.pages && d.pages.length > 0) setSelectedPageId(d.pages[0].id);
    };
    if (window.__WIKI_DATA__) {
      loadData(window.__WIKI_DATA__);
      return;
    }
    fetch(DEFAULT_DATA_PATH)
      .then((r) => r.json())
      .then(loadData)
      .catch(() => {
        setData({ appName: "HushNotes", pages: [] });
      });
  }, []);

  // Global keyboard shortcut: Cmd/Ctrl+K for search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((s) => !s);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const selectedPage = data.pages.find((p) => p.id === selectedPageId) || null;
  const getRootPages = () =>
    data.pages.filter((p) => !p.parentId).sort((a, b) => a.order - b.order);
  const getChildPages = (parentId) =>
    data.pages
      .filter((p) => p.parentId === parentId)
      .sort((a, b) => a.order - b.order);

  const createPage = useCallback(
    (parentId = null) => {
      const siblings = data.pages.filter((p) => p.parentId === parentId);
      const newPage = {
        id: uuidv4(),
        title: "Untitled Page",
        icon: "📄",
        parentId,
        order: siblings.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        blocks: [
          { id: uuidv4(), type: "heading1", content: "Untitled Page" },
          { id: uuidv4(), type: "paragraph", content: "" },
        ],
      };
      setData((prev) => ({ ...prev, pages: [...prev.pages, newPage] }));
      setSelectedPageId(newPage.id);
      if (parentId) setExpandedPages((prev) => ({ ...prev, [parentId]: true }));
    },
    [data.pages]
  );

  const deletePage = useCallback(
    (pageId) => {
      const getAllDescendants = (id) => {
        const children = data.pages.filter((p) => p.parentId === id);
        return children.reduce(
          (acc, c) => [...acc, c.id, ...getAllDescendants(c.id)],
          []
        );
      };
      const toDelete = [pageId, ...getAllDescendants(pageId)];
      setData((prev) => ({
        ...prev,
        pages: prev.pages.filter((p) => !toDelete.includes(p.id)),
      }));
      if (toDelete.includes(selectedPageId)) {
        const remaining = data.pages.filter((p) => !toDelete.includes(p.id));
        setSelectedPageId(remaining.length > 0 ? remaining[0].id : null);
      }
    },
    [data.pages, selectedPageId]
  );

  const updatePage = useCallback((pageId, updates) => {
    setData((prev) => ({
      ...prev,
      pages: prev.pages.map((p) =>
        p.id === pageId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      ),
    }));
  }, []);

  const duplicatePage = useCallback(
    (pageId) => {
      const page = data.pages.find((p) => p.id === pageId);
      if (!page) return;
      const newPage = {
        ...page,
        id: uuidv4(),
        title: page.title + " (Copy)",
        order: page.order + 0.5,
        blocks: page.blocks.map((b) => ({ ...b, id: uuidv4() })),
      };
      setData((prev) => ({ ...prev, pages: [...prev.pages, newPage] }));
      setSelectedPageId(newPage.id);
    },
    [data.pages]
  );

  const saveData = () => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.appName.replace(/\s+/g, "-").toLowerCase()}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setData(parsed);
        if (parsed.pages && parsed.pages.length > 0)
          setSelectedPageId(parsed.pages[0].id);
      } catch {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className={`app ${theme}`} data-theme={theme}>
      <header className="app-header">
        <div className="header-left">
          <button
            className="icon-btn sidebar-toggle"
            onClick={() => setSidebarOpen((s) => !s)}
            title="Toggle sidebar"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="app-brand">
            {editingAppName ? (
              <input
                className="app-name-input"
                value={data.appName}
                autoFocus
                onChange={(e) =>
                  setData((d) => ({ ...d, appName: e.target.value }))
                }
                onBlur={() => setEditingAppName(false)}
                onKeyDown={(e) => e.key === "Enter" && setEditingAppName(false)}
              />
            ) : (
              <span
                className="app-name"
                onClick={() => setEditingAppName(true)}
                title="Click to rename"
              >
                <span className="app-name-icon">◈</span>
                {data.appName}
              </span>
            )}
          </div>
          {/* Global search bar */}
          <button
            className="global-search-trigger"
            onClick={() => setShowSearch(true)}
            title="Search (Ctrl+K)"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
        </div>
        <div className="header-right">
          <span className="header-credit">
            Engineered by Akhil Antony Joseph Rio
          </span>
          <button
            className="icon-btn"
            onClick={() => fileInputRef.current.click()}
            title="Load JSON"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Load</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={loadData}
          />
          <button
            className={`icon-btn${isLocked ? " lock-btn-locked" : ""}`}
            onClick={() => setIsLocked((l) => !l)}
            title={isLocked ? "Unlock editing" : "Lock editing"}
          >
            {isLocked ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 019.9-1" />
              </svg>
            )}
            <span>{isLocked ? "Locked" : "Lock"}</span>
          </button>
          <button
            className="icon-btn accent-btn"
            onClick={saveData}
            title="Save JSON"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>Save</span>
          </button>
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="app-body">
        {sidebarOpen && (
          <>
            <div
              className="sidebar-overlay"
              onClick={() => setSidebarOpen(false)}
            />
            <Sidebar
              pages={data.pages}
              selectedPageId={selectedPageId}
              expandedPages={expandedPages}
              setExpandedPages={setExpandedPages}
              onSelectPage={setSelectedPageId}
              onCreatePage={createPage}
              onDeletePage={deletePage}
              onDuplicatePage={duplicatePage}
              onUpdatePage={updatePage}
              getRootPages={getRootPages}
              getChildPages={getChildPages}
              isLocked={isLocked}
              onClose={() => setSidebarOpen(false)}
            />
          </>
        )}
        <main className="main-content">
          {selectedPage ? (
            <Editor
              key={selectedPage.id}
              page={selectedPage}
              onUpdatePage={updatePage}
              allPages={data.pages}
              onSelectPage={setSelectedPageId}
              isLocked={isLocked}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">◈</div>
              <h2>No page selected</h2>
              <p>Select a page from the sidebar or create a new one</p>
              <button className="create-btn" onClick={() => createPage(null)}>
                Create your first page
              </button>
            </div>
          )}
        </main>
      </div>

      {showSearch && (
        <GlobalSearch
          pages={data.pages}
          onSelectPage={setSelectedPageId}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}

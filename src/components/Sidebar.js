import React, { useState, useRef, useEffect } from "react";

const ICON_LIST = [
  { name: "description", label: "Page" },
  { name: "article", label: "Article" },
  { name: "edit_note", label: "Notes" },
  { name: "sticky_note_2", label: "Sticky" },
  { name: "book", label: "Book" },
  { name: "menu_book", label: "Menu Book" },
  { name: "auto_stories", label: "Stories" },
  { name: "import_contacts", label: "Journal" },
  { name: "assignment", label: "Assignment" },
  { name: "list_alt", label: "List" },
  { name: "person", label: "Person" },
  { name: "face", label: "Face" },
  { name: "account_circle", label: "Account" },
  { name: "badge", label: "Badge" },
  { name: "contacts", label: "Contacts" },
  { name: "group", label: "Team" },
  { name: "code", label: "Code" },
  { name: "terminal", label: "Terminal" },
  { name: "memory", label: "Memory" },
  { name: "developer_mode", label: "Dev" },
  { name: "api", label: "API" },
  { name: "bug_report", label: "Bug" },
  { name: "build", label: "Build" },
  { name: "settings", label: "Settings" },
  { name: "tune", label: "Tune" },
  { name: "engineering", label: "Engineering" },
  { name: "rocket_launch", label: "Rocket" },
  { name: "star", label: "Star" },
  { name: "flag", label: "Flag" },
  { name: "task_alt", label: "Task" },
  { name: "checklist", label: "Checklist" },
  { name: "pending_actions", label: "Actions" },
  { name: "work", label: "Work" },
  { name: "business_center", label: "Business" },
  { name: "folder", label: "Folder" },
  { name: "folder_open", label: "Folder Open" },
  { name: "archive", label: "Archive" },
  { name: "lightbulb", label: "Idea" },
  { name: "school", label: "School" },
  { name: "science", label: "Science" },
  { name: "psychology", label: "Mind" },
  { name: "explore", label: "Explore" },
  { name: "travel_explore", label: "Globe" },
  { name: "map", label: "Map" },
  { name: "home", label: "Home" },
  { name: "cottage", label: "Cottage" },
  { name: "fitness_center", label: "Fitness" },
  { name: "restaurant", label: "Food" },
  { name: "local_cafe", label: "Cafe" },
  { name: "favorite", label: "Heart" },
  { name: "calendar_today", label: "Calendar" },
  { name: "event", label: "Event" },
  { name: "bar_chart", label: "Bar Chart" },
  { name: "show_chart", label: "Line Chart" },
  { name: "pie_chart", label: "Pie Chart" },
  { name: "attach_money", label: "Money" },
  { name: "account_balance", label: "Finance" },
  { name: "savings", label: "Savings" },
  { name: "lock", label: "Lock" },
  { name: "security", label: "Security" },
  { name: "info", label: "Info" },
  { name: "help_outline", label: "Help" },
  { name: "link", label: "Link" },
  { name: "tag", label: "Tag" },
  { name: "label", label: "Label" },
  { name: "bookmark", label: "Bookmark" },
  { name: "photo_camera", label: "Camera" },
  { name: "brush", label: "Design" },
  { name: "palette", label: "Palette" },
  { name: "movie", label: "Movie" },
  { name: "music_note", label: "Music" },
  { name: "sports_esports", label: "Gaming" },
  { name: "local_library", label: "Library" },
  { name: "apartment", label: "Office" },
  { name: "devices", label: "Devices" },
  { name: "cloud_off", label: "Offline" },
  { name: "storage", label: "Storage" },
  { name: "timeline", label: "Timeline" },
  { name: "insights", label: "Insights" },
  { name: "analytics", label: "Analytics" },
  { name: "format_list_bulleted", label: "List" },
  { name: "format_list_numbered", label: "Numbered" },
  { name: "table_chart", label: "Table" },
  { name: "image", label: "Image" },
  { name: "videocam", label: "Video" },
  { name: "mic", label: "Voice" },
  { name: "chat_bubble", label: "Chat" },
  { name: "forum", label: "Forum" },
  { name: "wifi_off", label: "No WiFi" },
  { name: "hiking", label: "Hiking" },
  { name: "language", label: "Language" },
  { name: "public", label: "Public" },
  { name: "place", label: "Place" },
  { name: "heart_broken", label: "Problems" },
  { name: "bolt", label: "Bolt" },
  { name: "eco", label: "Eco" },
  { name: "water_drop", label: "Water" },
  { name: "park", label: "Nature" },
];

export function PageIconDisplay({ icon, size = 16 }) {
  if (!icon)
    return (
      <span className="material-icons page-mat-icon" style={{ fontSize: size }}>
        description
      </span>
    );
  if (/\p{Emoji}/u.test(icon) && icon.length <= 4) {
    return <span style={{ fontSize: size - 2, lineHeight: 1 }}>{icon}</span>;
  }
  return (
    <span className="material-icons page-mat-icon" style={{ fontSize: size }}>
      {icon}
    </span>
  );
}

function PageItem({
  page,
  depth,
  selected,
  expanded,
  onSelect,
  onToggle,
  onCreate,
  onDelete,
  onDuplicate,
  onUpdate,
  getChildPages,
  isLocked,
}) {
  const [contextMenu, setContextMenu] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingIcon, setEditingIcon] = useState(false);
  const [titleVal, setTitleVal] = useState(page.title);
  const [iconSearch, setIconSearch] = useState("");
  const menuRef = useRef(null);
  const children = getChildPages(page.id);
  const hasChildren = children.length > 0;

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setContextMenu(null);
    };
    if (contextMenu) document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [contextMenu]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const finishEdit = () => {
    setEditingTitle(false);
    onUpdate(page.id, { title: titleVal });
  };

  const filteredIcons = iconSearch.trim()
    ? ICON_LIST.filter(
        (i) =>
          i.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
          i.name.includes(iconSearch.toLowerCase())
      )
    : ICON_LIST;

  return (
    <div className="page-item-wrap">
      <div
        className={`page-item ${selected ? "selected" : ""}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSelect(page.id)}
        onContextMenu={!isLocked ? handleContextMenu : undefined}
      >
        <button
          className={`page-expand-btn ${
            hasChildren || expanded ? "" : "invisible"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(page.id);
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            style={{
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
            }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <span
          className="page-icon"
          onClick={(e) => {
            if (!isLocked) {
              e.stopPropagation();
              setEditingIcon(true);
              setIconSearch("");
            }
          }}
        >
          <PageIconDisplay icon={page.icon} size={16} />
        </span>

        {editingTitle ? (
          <input
            className="page-title-input"
            value={titleVal}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={finishEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") finishEdit();
              if (e.key === "Escape") {
                setEditingTitle(false);
                setTitleVal(page.title);
              }
            }}
          />
        ) : (
          <span
            className="page-title"
            onDoubleClick={(e) => {
              if (!isLocked) {
                e.stopPropagation();
                setEditingTitle(true);
              }
            }}
          >
            {page.title}
          </span>
        )}

        {!isLocked && (
          <button
            className="page-add-btn"
            title="Add subpage"
            onClick={(e) => {
              e.stopPropagation();
              onCreate(page.id);
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
        )}
      </div>

      {editingIcon && (
        <div
          className="icon-picker"
          style={{ marginLeft: `${8 + depth * 16}px` }}
        >
          <div className="icon-picker-search">
            <span
              className="material-icons"
              style={{
                fontSize: 14,
                color: "var(--text-faint)",
                flexShrink: 0,
              }}
            >
              search
            </span>
            <input
              autoFocus
              placeholder="Search icons..."
              value={iconSearch}
              onChange={(e) => setIconSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setEditingIcon(false)}
            />
          </div>
          <div className="icon-picker-grid">
            {filteredIcons.map((ic) => (
              <button
                key={ic.name}
                className="icon-opt"
                title={ic.label}
                onClick={() => {
                  onUpdate(page.id, { icon: ic.name });
                  setEditingIcon(false);
                }}
              >
                <span className="material-icons">{ic.name}</span>
              </button>
            ))}
          </div>
          <button
            className="icon-picker-close"
            onClick={() => setEditingIcon(false)}
          >
            <span className="material-icons" style={{ fontSize: 14 }}>
              close
            </span>{" "}
            Close
          </button>
        </div>
      )}

      {contextMenu && (
        <div
          ref={menuRef}
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => {
              onSelect(page.id);
              setContextMenu(null);
            }}
          >
            Open
          </button>
          <button
            onClick={() => {
              setEditingTitle(true);
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            onClick={() => {
              onCreate(page.id);
              setContextMenu(null);
            }}
          >
            Add subpage
          </button>
          <button
            onClick={() => {
              onDuplicate(page.id);
              setContextMenu(null);
            }}
          >
            Duplicate
          </button>
          <div className="context-divider" />
          <button
            className="danger"
            onClick={() => {
              onDelete(page.id);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}

      {expanded && hasChildren && (
        <div className="page-children">
          {children.map((child) => (
            <PageItem
              key={child.id}
              page={child}
              depth={depth + 1}
              selected={selected === child.id}
              expanded={expanded}
              onSelect={onSelect}
              onToggle={onToggle}
              onCreate={onCreate}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onUpdate={onUpdate}
              getChildPages={getChildPages}
              isLocked={isLocked}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  pages,
  selectedPageId,
  expandedPages,
  setExpandedPages,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  onDuplicatePage,
  onUpdatePage,
  getRootPages,
  getChildPages,
  isLocked,
  onClose,
}) {
  const [search, setSearch] = useState("");

  const toggleExpand = (id) =>
    setExpandedPages((prev) => ({ ...prev, [id]: !prev[id] }));

  const filteredPages = search.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : null;

  const handleSelectPage = (id) => {
    onSelectPage(id);
    if (onClose && window.innerWidth < 768) onClose();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-search">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button className="clear-search" onClick={() => setSearch("")}>
            ✕
          </button>
        )}
      </div>

      <div className="sidebar-section-header">
        <span>Pages</span>
        {!isLocked && (
          <button
            className="icon-btn-sm"
            onClick={() => onCreatePage(null)}
            title="New root page"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}
      </div>

      <div className="sidebar-pages">
        {filteredPages ? (
          filteredPages.length === 0 ? (
            <div className="no-results">No pages found</div>
          ) : (
            filteredPages.map((p) => (
              <PageItem
                key={p.id}
                page={p}
                depth={0}
                selected={selectedPageId === p.id}
                expanded={expandedPages[p.id]}
                onSelect={handleSelectPage}
                onToggle={toggleExpand}
                onCreate={onCreatePage}
                onDelete={onDeletePage}
                onDuplicate={onDuplicatePage}
                onUpdate={onUpdatePage}
                getChildPages={getChildPages}
                isLocked={isLocked}
              />
            ))
          )
        ) : (
          getRootPages().map((p) => (
            <PageItem
              key={p.id}
              page={p}
              depth={0}
              selected={selectedPageId === p.id}
              expanded={expandedPages[p.id]}
              onSelect={handleSelectPage}
              onToggle={toggleExpand}
              onCreate={onCreatePage}
              onDelete={onDeletePage}
              onDuplicate={onDuplicatePage}
              onUpdate={onUpdatePage}
              getChildPages={getChildPages}
              isLocked={isLocked}
            />
          ))
        )}
      </div>
    </aside>
  );
}

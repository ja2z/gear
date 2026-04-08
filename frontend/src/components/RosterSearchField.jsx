import { useId, useLayoutEffect, useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const MAX_VISIBLE = 5;

/**
 * Match if every whitespace-separated token appears somewhere in the full name (case-insensitive).
 */
export function filterRosterByNameQuery(users, query) {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return users;
  return users.filter((u) => {
    const name = (u.fullName || '').toLowerCase();
    return tokens.every((t) => name.includes(t));
  });
}

/** @deprecated use filterRosterByNameQuery */
export function filterScoutsByNameQuery(users, query) {
  return filterRosterByNameQuery(users, query);
}

/**
 * Searchable roster picker (youth or adults). Dropdown only when ≤ MAX_VISIBLE matches.
 * List is portaled to `document.body` with fixed positioning.
 */
export default function RosterSearchField({
  users,
  value,
  onChange,
  searchText,
  onSearchTextChange,
  disabled = false,
  fieldId: fieldIdProp,
}) {
  const genId = useId();
  const fieldId = fieldIdProp ?? genId;
  const listId = useId();
  const anchorRef = useRef(null);
  const blurCloseTimerRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);
  const [inputFocused, setInputFocused] = useState(false);

  const filtered = useMemo(() => filterRosterByNameQuery(users, searchText), [users, searchText]);

  const selectedUser = useMemo(
    () => (value ? users.find((u) => String(u.id) === String(value)) : null),
    [users, value],
  );

  const baseShowDropdown = useMemo(() => {
    if (filtered.length === 0) return false;
    if (filtered.length > MAX_VISIBLE) return false;
    const q = searchText.trim();
    if (q.length === 0 && users.length > MAX_VISIBLE) return false;
    return true;
  }, [filtered.length, searchText, users.length]);

  /**
   * Hide the list while a saved selection is showing as plain text (edit outing, etc.).
   * Re-opens on focus so the user can pick someone else.
   */
  const hideListWhileClosedSelection = useMemo(() => {
    if (!value || inputFocused) return false;
    if (!selectedUser) return false;
    const nameMatch =
      (selectedUser.fullName || '').trim().toLowerCase() === searchText.trim().toLowerCase();
    const onlySelectedInResults =
      filtered.length === 1 && String(filtered[0].id) === String(value);
    return nameMatch || onlySelectedInResults;
  }, [value, inputFocused, selectedUser, searchText, filtered]);

  const showDropdown = useMemo(() => {
    if (!baseShowDropdown) return false;
    if (hideListWhileClosedSelection) return false;
    return true;
  }, [baseShowDropdown, hideListWhileClosedSelection]);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current || !showDropdown) {
      setMenuStyle(null);
      return;
    }
    const r = anchorRef.current.getBoundingClientRect();
    const maxH = Math.max(120, window.innerHeight - r.bottom - 12);
    setMenuStyle({
      position: 'fixed',
      left: r.left,
      top: r.bottom + 4,
      width: r.width,
      maxHeight: maxH,
      zIndex: 200,
    });
  }, [showDropdown]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, searchText, filtered.length, showDropdown]);

  useEffect(() => {
    if (!showDropdown) return;
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [showDropdown, updatePosition]);

  const selectUser = (u) => {
    onChange(String(u.id));
    onSearchTextChange(u.fullName || '');
  };

  const handleFocus = useCallback(() => {
    if (blurCloseTimerRef.current) {
      clearTimeout(blurCloseTimerRef.current);
      blurCloseTimerRef.current = null;
    }
    setInputFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    blurCloseTimerRef.current = setTimeout(() => {
      setInputFocused(false);
      blurCloseTimerRef.current = null;
    }, 150);
  }, []);

  useEffect(
    () => () => {
      if (blurCloseTimerRef.current) clearTimeout(blurCloseTimerRef.current);
    },
    [],
  );

  const dropdown =
    showDropdown &&
    menuStyle &&
    createPortal(
      <ul
        id={`${listId}-listbox`}
        role="listbox"
        style={menuStyle}
        className="overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
      >
        {filtered.map((u) => (
          <li key={u.id} role="option" aria-selected={String(u.id) === String(value)}>
            <button
              type="button"
              className="w-full px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-scout-blue/8 touch-target"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectUser(u)}
            >
              {u.fullName}
            </button>
          </li>
        ))}
      </ul>,
      document.body
    );

  return (
    <div>
      <div className="relative" ref={anchorRef}>
        <input
          id={fieldId}
          type="search"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          placeholder="Search by name…"
          value={searchText}
          onChange={(e) => {
            const t = e.target.value;
            onSearchTextChange(t);
            if (value) onChange('');
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="search-input w-full"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? `${listId}-listbox` : undefined}
          aria-autocomplete="list"
        />
        {dropdown}
      </div>
    </div>
  );
}

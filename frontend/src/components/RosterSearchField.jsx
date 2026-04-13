import { useId, useMemo, useState, useEffect, useCallback, useRef } from 'react';

const MAX_VISIBLE = 3;

/**
 * Match if every whitespace-separated token appears somewhere in the full name (case-insensitive).
 */
export function filterRosterByNameQuery(users, query) {
  const list = Array.isArray(users) ? users : [];
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return list;
  return list.filter((u) => {
    const name = (u.fullName || '').toLowerCase();
    return tokens.every((t) => name.includes(t));
  });
}

/** @deprecated use filterRosterByNameQuery */
export function filterScoutsByNameQuery(users, query) {
  return filterRosterByNameQuery(users, query);
}

/**
 * Searchable roster picker (youth or adults). Dropdown when ≤ MAX_VISIBLE matches.
 *
 * The list is in normal document flow below the input: it adds height under the field so
 * only content *below* moves down. We do not scroll the modal programmatically — scrolling
 * would increase scrollTop and shift everything above the field upward on screen.
 */
export default function RosterSearchField({
  users,
  value,
  onChange,
  searchText,
  onSearchTextChange,
  disabled = false,
  fieldId: fieldIdProp,
  /** Tighter vertical spacing (e.g. event form modal). */
  compact = false,
}) {
  const genId = useId();
  const fieldId = fieldIdProp ?? genId;
  const listId = useId();
  const inputRef = useRef(null);
  const blurCloseTimerRef = useRef(null);
  const [inputFocused, setInputFocused] = useState(false);

  const userList = Array.isArray(users) ? users : [];
  const filtered = useMemo(() => filterRosterByNameQuery(userList, searchText), [userList, searchText]);

  const selectedUser = useMemo(
    () => (value ? userList.find((u) => String(u.id) === String(value)) : null),
    [userList, value],
  );

  const baseShowDropdown = useMemo(() => {
    if (filtered.length === 0) return false;
    if (filtered.length > MAX_VISIBLE) return false;
    const q = searchText.trim();
    if (q.length === 0 && userList.length > MAX_VISIBLE) return false;
    return true;
  }, [filtered.length, searchText, userList.length]);

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

  const selectUser = (u) => {
    onChange(String(u.id));
    onSearchTextChange(u.fullName || '');
    /** mousedown preventDefault on options keeps focus on the input — blur so the list can dismiss. */
    if (blurCloseTimerRef.current) {
      clearTimeout(blurCloseTimerRef.current);
      blurCloseTimerRef.current = null;
    }
    setInputFocused(false);
    requestAnimationFrame(() => {
      inputRef.current?.blur();
    });
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

  return (
    <div className={`flex w-full flex-col ${compact ? 'gap-1' : 'gap-2'}`}>
      <input
        ref={inputRef}
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
      {showDropdown && (
        <ul
          id={`${listId}-listbox`}
          role="listbox"
          className="w-full max-h-[min(14rem,45dvh)] overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white py-1 shadow-sm ring-1 ring-black/5"
        >
          {filtered.map((u) => (
            <li key={u.id} role="option" aria-selected={String(u.id) === String(value)}>
              <button
                type="button"
                className="touch-target w-full px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-scout-blue/8"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectUser(u)}
              >
                {u.fullName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

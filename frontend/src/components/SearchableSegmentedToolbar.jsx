import { useState, useRef, useEffect, useCallback } from 'react';
import SegmentedControl from './SegmentedControl';

/** Clip reveal stays inside the bar; eased for a softer stop at the end. */
const toolbarReveal =
  'transition-[clip-path] duration-[420ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';

/** Opacity only — no translate on close/open (avoids sub-pixel vertical jitter with the input). */
const toolbarSearchContentBase = 'transition-opacity motion-reduce:transition-none';

/** If transitionend never fires (edge cases), still close — must exceed content fade (180ms). */
const SEARCH_CLOSE_FALLBACK_MS = 260;

/**
 * Segmented control + search icon; search opens as an in-bar clip-path overlay (Manage Members pattern).
 */
function SearchableSegmentedToolbar({
  tabs = [],
  segmentValue = '',
  onSegmentChange = () => {},
  searchQuery,
  onSearchQueryChange,
  searchOpen,
  onSearchOpenChange,
  searchPlaceholder,
  /** When true, omit segmented control (same search chrome as manage lists). */
  hideSegments = false,
  searchOnlyLabel = '',
  /** Optional compact control between segments and search (e.g. Add item). */
  toolbarAccessory = null,
  /** Optional control after the search icon (e.g. Add member) — stays on the main row. */
  toolbarEndAccessory = null,
}) {
  const [searchClosing, setSearchClosing] = useState(false);
  const searchInputRef = useRef(null);
  const closeSearchTimeoutRef = useRef(null);
  const pendingSearchCloseRef = useRef(false);

  useEffect(() => {
    return () => {
      if (closeSearchTimeoutRef.current) {
        clearTimeout(closeSearchTimeoutRef.current);
        closeSearchTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!searchOpen || searchClosing) return undefined;
    const id = window.setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    }, 100);
    return () => window.clearTimeout(id);
  }, [searchOpen, searchClosing]);

  const clearPendingSearchClose = useCallback(() => {
    if (closeSearchTimeoutRef.current) {
      clearTimeout(closeSearchTimeoutRef.current);
      closeSearchTimeoutRef.current = null;
    }
  }, []);

  const finishSearchClose = useCallback(() => {
    clearPendingSearchClose();
    pendingSearchCloseRef.current = false;
    onSearchOpenChange(false);
    setSearchClosing(false);
    onSearchQueryChange('');
  }, [clearPendingSearchClose, onSearchOpenChange, onSearchQueryChange]);

  const openSearchPanel = () => {
    clearPendingSearchClose();
    pendingSearchCloseRef.current = false;
    setSearchClosing(false);
    onSearchOpenChange(true);
  };

  const handleSearchContentTransitionEnd = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'opacity' || !pendingSearchCloseRef.current) return;
    finishSearchClose();
  };

  const handleCancelSearch = () => {
    clearPendingSearchClose();
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishSearchClose();
      return;
    }
    pendingSearchCloseRef.current = true;
    setSearchClosing(true);
    closeSearchTimeoutRef.current = window.setTimeout(() => {
      if (pendingSearchCloseRef.current) {
        finishSearchClose();
      }
      closeSearchTimeoutRef.current = null;
    }, SEARCH_CLOSE_FALLBACK_MS);
  };

  const searchContentVisible = searchOpen && !searchClosing;

  return (
    <div className="relative overflow-hidden border-b border-gray-200 bg-white">
      <div
        className={`flex items-center gap-2 px-5 py-2 ${
          searchOpen || searchClosing ? 'pointer-events-none' : ''
        }`}
        aria-hidden={searchOpen}
        inert={searchOpen || undefined}
      >
        <div className="min-w-0 flex-1">
          {hideSegments ? (
            <span className="block px-1 text-sm font-medium text-gray-700">
              {searchOnlyLabel || '\u00a0'}
            </span>
          ) : (
            <SegmentedControl tabs={tabs} value={segmentValue} onChange={onSegmentChange} />
          )}
        </div>
        {toolbarAccessory ? (
          <div className="flex shrink-0 items-center">{toolbarAccessory}</div>
        ) : null}
        <button
          type="button"
          onClick={openSearchPanel}
          className="flex touch-target shrink-0 items-center justify-center text-gray-500"
          aria-label="Search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        {toolbarEndAccessory ? (
          <div className="flex shrink-0 items-center">{toolbarEndAccessory}</div>
        ) : null}
      </div>
      <div
        className={`absolute inset-0 z-10 flex items-center bg-white ${toolbarReveal} ${
          searchOpen
            ? '[clip-path:inset(0_0_0_0)]'
            : '[clip-path:inset(0_0_0_100%)] pointer-events-none'
        }`}
        aria-hidden={!searchOpen}
        inert={!searchOpen || undefined}
      >
        <div
          onTransitionEnd={handleSearchContentTransitionEnd}
          className={`flex w-full min-w-0 items-center gap-2 px-5 py-2 ${toolbarSearchContentBase} ${
            searchClosing ? 'duration-[180ms] ease-in' : 'duration-[280ms] ease-out'
          } ${
            searchContentVisible
              ? 'opacity-100 delay-[85ms] motion-reduce:delay-0'
              : 'opacity-0 delay-0'
          }`}
        >
          <div className="relative min-w-0 flex-1">
            <input
              ref={searchInputRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              role="searchbox"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="search-input w-full pr-8"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange('')}
                className="absolute right-2 top-1/2 flex -translate-y-1/2 touch-target items-center justify-center text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleCancelSearch}
            className="touch-target shrink-0 whitespace-nowrap px-1 text-sm font-medium text-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchableSegmentedToolbar;

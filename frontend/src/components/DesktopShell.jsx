import { useState, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HUB_SIDEBAR } from '../config/homeHubActions';
import HeaderProfileMenu from './HeaderProfileMenu';

const COLLAPSE_KEY = 'desktop_sidebar_collapsed';

function usePersistedCollapse() {
  const [collapsed, setCollapsed] = useState(
    () => sessionStorage.getItem(COLLAPSE_KEY) === '1'
  );
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      sessionStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }, []);
  return [collapsed, toggle];
}

/**
 * Shared desktop (lg+) layout shell: scout-blue sidebar + header bar + scrollable content.
 * Mounted once via DesktopLayoutRoute; sidebar collapse state persists in sessionStorage.
 */
export default function DesktopShell({ title, subtitle, children, headerRight }) {
  const [collapsed, toggleCollapsed] = usePersistedCollapse();

  return (
    <div className="flex h-screen-small w-full min-h-0 overflow-hidden">
      {/* ── Sidebar — full viewport height (stretch with shell) ── */}
      <aside
        className={`flex h-full min-h-0 shrink-0 flex-col border-r border-scout-blue/15 bg-scout-blue transition-[width] duration-200 ${
          collapsed ? 'w-[3.75rem]' : 'w-[13.5rem]'
        }`}
        aria-label="Troop hub navigation"
      >
        <div className="flex items-center gap-2.5 border-b border-white/10 px-3.5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-scout-orange text-xs font-bold text-white">
            222
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-white">Troop 222</p>
              <p className="truncate text-[11px] text-white/70">Scouts BSA</p>
            </div>
          )}
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
          {HUB_SIDEBAR.map((item) => {
            const Icon = item.Icon;
            return (
              <NavLink
                key={item.id}
                to={item.to}
                end={item.to === '/home'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    collapsed ? 'justify-center px-0' : ''
                  } ${isActive ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'}`
                }
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex w-full items-center justify-center rounded-lg py-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-gray-50">
        <header className="shrink-0 border-b border-gray-200/80 bg-scout-blue/[0.04] px-6 py-2.5">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900">{title}</h1>
              {subtitle && (
                <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {headerRight}
              <HeaderProfileMenu />
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5">
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

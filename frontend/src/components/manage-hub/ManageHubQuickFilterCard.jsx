import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Compact list of filter shortcuts (inventory status, etc.) — one white card, divided rows.
 * @param {boolean} [compact] — Tighter row padding.
 */
export function ManageHubQuickFilterCard({ title, rows = [], compact = false }) {
  if (rows.length === 0) return null;

  const rowPad = compact ? 'px-3 py-2.5' : 'px-4 py-3';

  return (
    <div>
      <h2
        className={`px-1 font-semibold uppercase tracking-wide text-gray-500 ${
          compact ? 'mb-1.5 text-xs' : 'mb-2 text-sm'
        }`}
      >
        {title}
      </h2>
      <div className="card divide-y divide-gray-100 overflow-hidden p-0 shadow-sm">
        {rows.map((row) => (
          <Link
            key={row.key}
            to={row.to}
            className={`flex items-center justify-between gap-3 no-underline transition-colors hover:bg-gray-50 active:bg-gray-100 ${rowPad}`}
          >
            <span className="text-sm font-medium text-gray-700">{row.label}</span>
            <span className="flex shrink-0 items-center gap-1.5 tabular-nums text-sm font-semibold">
              <span className={row.valueClassName ?? 'text-gray-900'}>{row.value}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

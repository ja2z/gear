import { Link } from 'react-router-dom';

/**
 * Compact at-a-glance summary for manage section hubs (gray background, white card).
 * @param {boolean} [compact] — Tighter padding and type (less vertical space).
 * @param {string} [to] — When set, the card is a link (e.g. to manage inventory items).
 */
export function ManageHubSummaryStrip({ label, headline, loading, chips = [], compact = false, to }) {
  if (loading) {
    return (
      <div className={`card animate-pulse ${compact ? 'p-3' : 'p-4'}`}>
        <div className="h-3 w-28 rounded bg-gray-200" />
        <div className={`rounded bg-gray-200 ${compact ? 'mt-2 h-8 w-14' : 'mt-3 h-9 w-16'}`} />
        {!compact && (
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="h-6 w-20 rounded-full bg-gray-200" />
            <div className="h-6 w-24 rounded-full bg-gray-200" />
          </div>
        )}
      </div>
    );
  }

  const cardInner = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-0.5 font-bold tabular-nums text-gray-900 ${compact ? 'text-2xl' : 'text-3xl'}`}
      >
        {headline}
      </p>
      {chips.length > 0 && (
        <div className={`flex flex-wrap gap-2 ${compact ? 'mt-2' : 'mt-3'}`}>
          {chips.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
            >
              {c.label}: <span className="ml-0.5 tabular-nums">{c.value}</span>
            </span>
          ))}
        </div>
      )}
    </>
  );

  const cardClass = compact
    ? `card flex min-h-[4.5rem] flex-col justify-center p-3 transition-colors ${
        to ? 'hover:bg-gray-50 active:bg-gray-100' : ''
      }`
    : `card p-4 transition-colors ${to ? 'hover:bg-gray-50 active:bg-gray-100' : ''}`;

  if (to) {
    return (
      <Link
        to={to}
        className="touch-target block min-w-0 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scout-blue/40"
      >
        <div className={cardClass}>{cardInner}</div>
      </Link>
    );
  }

  return <div className={compact ? 'card p-3' : 'card p-4'}>{cardInner}</div>;
}

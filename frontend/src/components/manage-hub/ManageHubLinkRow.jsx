import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const rowClass =
  'card flex w-full items-center gap-4 text-left no-underline transition-shadow hover:shadow-md';

/**
 * Manage hub destination row — matches ManageTables card rows (icon + title + description + chevron).
 */
export function ManageHubLinkRow({
  to,
  icon: Icon,
  title,
  description,
  onClick,
  iconWrapperClassName = 'bg-gray-100 text-gray-500',
}) {
  const inner = (
    <>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconWrapperClassName}`}
      >
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-gray-900">{title}</span>
        <p className="mt-0.5 text-sm text-gray-600">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
    </>
  );

  if (to) {
    return (
      <Link to={to} className={rowClass}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={rowClass}>
      {inner}
    </button>
  );
}

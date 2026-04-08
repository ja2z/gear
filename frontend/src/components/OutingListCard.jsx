import { Calendar, Footprints, Tent, Users } from 'lucide-react';
import { formatOutingDate } from '../utils/outingFormat';

/** Badge classes — match TYPE_CONFIG for consistent type identity */
export const OUTING_TYPE_BADGES = {
  'Day Outing': 'bg-green-100 text-green-800',
  'Overnight Outing': 'bg-blue-100 text-blue-800',
  Meeting: 'bg-gray-100 text-gray-700',
};

const TYPE_CONFIG = {
  'Day Outing': {
    rail: 'bg-green-500',
    Icon: Footprints,
    iconClass: 'text-green-600',
  },
  'Overnight Outing': {
    rail: 'bg-scout-blue',
    Icon: Tent,
    iconClass: 'text-scout-blue/80',
  },
  Meeting: {
    rail: 'bg-gray-400',
    Icon: Users,
    iconClass: 'text-gray-500',
  },
};

function getTypeConfig(eventType) {
  return TYPE_CONFIG[eventType] ?? {
    rail: 'bg-gray-300',
    Icon: Calendar,
    iconClass: 'text-gray-500',
  };
}

/**
 * @param {{ ev: object, onEdit: () => void, onDelete: () => void }} props
 */
export default function OutingListCard({ ev, onEdit, onDelete }) {
  const cfg = getTypeConfig(ev.eventType);
  const Icon = cfg.Icon;
  const badgeClass = OUTING_TYPE_BADGES[ev.eventType] || 'bg-gray-100 text-gray-700';
  const dateLine =
    ev.startDate &&
    `${formatOutingDate(ev.startDate)}${ev.endDate ? ` – ${formatOutingDate(ev.endDate)}` : ''}`;
  const hasLeaders = Boolean(ev.eventSplName || ev.adultLeaderName);

  return (
    <article className="card flex h-full w-full overflow-hidden rounded-lg p-0 shadow-sm transition-[box-shadow,border-color] duration-200">
      <div className={`w-1 shrink-0 self-stretch rounded-l-[0.5rem] ${cfg.rail}`} aria-hidden />

      {/* Three regions: left (title + date) | middle (leaders) | right (actions) */}
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-2 p-2 sm:p-2.5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_auto] md:items-center md:gap-x-2 md:gap-y-0 lg:gap-x-3">
        {/* Left: type icon (vertically centered) + title, badge, date */}
        <div className="flex min-w-0 items-center gap-3 sm:gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 ring-1 ring-gray-100/80 ${cfg.iconClass}`}
          >
            <Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex flex-col gap-0.5">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{ev.name}</h3>
            {ev.eventType && (
              <span
                className={`inline-flex w-fit rounded-full px-2 py-px text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
              >
                {ev.eventType}
              </span>
            )}
            {dateLine && (
              <p className="flex items-center gap-1.5 pt-0.5 text-xs text-gray-800">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-scout-blue/55" strokeWidth={2} aria-hidden />
                <span className="leading-snug">{dateLine}</span>
              </p>
            )}
          </div>
        </div>

        {/* Middle: leaders only — vertically centered on md+ */}
        <div className="flex min-h-0 min-w-0 flex-col justify-center gap-1 border-y border-gray-100 py-1.5 md:border-x md:border-y-0 md:px-3 lg:px-4">
          {hasLeaders ? (
            <>
              {ev.eventSplName && (
                <p className="text-[11px] leading-snug text-gray-800">
                  <span className="font-medium text-gray-500">Outing leader</span>
                  <span className="text-gray-900"> — {ev.eventSplName}</span>
                </p>
              )}
              {ev.adultLeaderName && (
                <p className="text-[11px] leading-snug text-gray-800">
                  <span className="font-medium text-gray-500">Adult leader</span>
                  <span className="text-gray-900"> — {ev.adultLeaderName}</span>
                </p>
              )}
            </>
          ) : (
            <p className="text-left text-[11px] italic leading-snug text-gray-400">No leaders listed</p>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex shrink-0 flex-row gap-1.5 md:w-[5rem] md:flex-col md:justify-center">
          <button
            type="button"
            onClick={onEdit}
            className="touch-target flex min-h-10 flex-1 items-center justify-center rounded-md border border-scout-blue/20 bg-white py-1 text-xs font-semibold text-scout-blue hover:bg-scout-blue/[0.06] md:min-h-8 md:w-full md:flex-none"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="touch-target flex min-h-10 flex-1 items-center justify-center rounded-md border border-scout-red/35 bg-white py-1 text-xs font-semibold text-scout-red hover:bg-red-50 md:min-h-8 md:w-full md:flex-none"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

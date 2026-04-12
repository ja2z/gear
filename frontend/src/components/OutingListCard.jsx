import { Calendar, Footprints, Tent, Users } from 'lucide-react';
import { formatOutingDate } from '../utils/outingFormat';
import { primaryLeaderLabel } from '../utils/eventLabels';

/** Badge classes — match TYPE_CONFIG for consistent type identity */
export const OUTING_TYPE_BADGES = {
  'Day Outing': 'bg-green-100 text-green-800',
  'Overnight Outing': 'bg-blue-100 text-blue-800',
  Meeting: 'bg-gray-100 text-gray-700',
};

const TYPE_CONFIG = {
  'Day Outing': {
    rail: 'border-l-scout-green',
    Icon: Footprints,
    iconClass: 'text-scout-green/90',
    iconBg: 'bg-scout-green/10',
  },
  'Overnight Outing': {
    rail: 'border-l-scout-blue',
    Icon: Tent,
    iconClass: 'text-scout-blue',
    iconBg: 'bg-scout-blue/10',
  },
  Meeting: {
    rail: 'border-l-gray-300',
    Icon: Users,
    iconClass: 'text-gray-500',
    iconBg: 'bg-gray-100',
  },
};

/** Icons, rail, and chip colors — shared with calendar day-picker and elsewhere. */
export function getTypeConfig(eventType) {
  return (
    TYPE_CONFIG[eventType] ?? {
      rail: 'border-l-gray-300',
      Icon: Calendar,
      iconClass: 'text-gray-500',
      iconBg: 'bg-gray-100',
    }
  );
}

/**
 * Standalone event card (used in a spaced list on the Events page).
 *
 * @param {{ ev: object, onEdit: () => void, onDelete: () => void }} props
 */
export default function OutingListCard({ ev, onEdit, onDelete }) {
  const cfg = getTypeConfig(ev.eventType);
  const splLabel = primaryLeaderLabel(ev.eventType);
  const Icon = cfg.Icon;
  const badgeClass = OUTING_TYPE_BADGES[ev.eventType] || 'bg-gray-100 text-gray-700';
  const dateLine =
    ev.startDate &&
    `${formatOutingDate(ev.startDate)}${ev.endDate ? ` – ${formatOutingDate(ev.endDate)}` : ''}`;
  const hasLeaders = Boolean(ev.eventSplName || ev.adultLeaderName);

  return (
    <div
      className={`group flex items-start gap-2 rounded-2xl border border-gray-200/90 bg-white py-3 pl-2.5 pr-1.5 shadow-sm transition-[border-color,box-shadow] border-l-[3px] ${cfg.rail} hover:border-scout-blue/20 hover:shadow-md sm:gap-2.5 sm:pl-3 sm:pr-2`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${cfg.iconBg} ${cfg.iconClass}`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-semibold leading-tight text-gray-900">{ev.name}</h3>
        {ev.eventType && (
          <span
            className={`mt-0.5 inline-flex w-fit max-w-full rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide ${badgeClass}`}
          >
            {ev.eventType}
          </span>
        )}
        {dateLine && (
          <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-gray-600">
            <Calendar className="mt-0.5 h-3 w-3 shrink-0 text-scout-blue/45" strokeWidth={2} aria-hidden />
            <span className="min-w-0">{dateLine}</span>
          </p>
        )}
        {hasLeaders ? (
          <div className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-gray-800">
            {ev.eventSplName && (
              <p className="min-w-0">
                <span className="font-medium text-gray-600">{splLabel}:</span>{' '}
                <span className="text-gray-900">{ev.eventSplName}</span>
              </p>
            )}
            {ev.adultLeaderName && (
              <p className="min-w-0">
                <span className="font-medium text-gray-600">Adult leader:</span>{' '}
                <span className="text-gray-900">{ev.adultLeaderName}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] italic leading-snug text-gray-400">No leaders listed</p>
        )}
      </div>

      <div className="mt-0.5 flex w-[4.75rem] shrink-0 flex-col gap-1.5 self-start sm:w-[5.25rem]">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onEdit();
          }}
          className="touch-target min-h-9 w-full rounded-md border border-scout-blue/22 bg-scout-blue/[0.09] px-2 py-1.5 text-[11px] font-semibold text-scout-blue/85 shadow-sm transition-colors hover:bg-scout-blue/14 active:bg-scout-blue/18 sm:min-h-10 sm:text-xs"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className="touch-target min-h-9 w-full rounded-md border border-scout-red/28 bg-white px-2 py-1.5 text-[11px] font-semibold text-scout-red shadow-sm transition-colors hover:bg-scout-red/[0.06] active:bg-scout-red/10 sm:min-h-10 sm:text-xs"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

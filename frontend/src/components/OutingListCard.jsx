import { Calendar, Footprints, Tent, Users } from 'lucide-react';
import { formatEventDateTime } from '../utils/outingFormat';
import { adultLeaderNameFromEvent, primaryLeaderLabel, primaryLeaderNameFromEvent } from '../utils/eventLabels';

/** Badge classes — match TYPE_CONFIG for consistent type identity */
export const OUTING_TYPE_BADGES = {
  'Day Outing': 'bg-green-100 text-green-800',
  'Overnight Outing': 'bg-blue-100 text-blue-800',
  Meeting: 'bg-amber-100 text-amber-900',
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
    rail: 'border-l-amber-400',
    Icon: Users,
    iconClass: 'text-amber-800',
    iconBg: 'bg-amber-100',
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
  const splName = primaryLeaderNameFromEvent(ev);
  const adultName = adultLeaderNameFromEvent(ev);
  const Icon = cfg.Icon;
  const badgeClass = OUTING_TYPE_BADGES[ev.eventType] || 'bg-gray-100 text-gray-700';
  const dateLine =
    ev.startDate &&
    `${formatEventDateTime(ev.startDate, ev.timezone)}${ev.endDate ? ` – ${formatEventDateTime(ev.endDate, ev.timezone)}` : ''}`;

  return (
    <div
      className={`group flex items-stretch gap-2.5 rounded-2xl border border-gray-200/90 bg-white px-3 py-3 shadow-sm transition-[border-color,box-shadow] border-l-[3px] ${cfg.rail} hover:border-scout-blue/20 hover:shadow-md sm:gap-3 sm:px-4 sm:py-3.5`}
    >
      <div className="flex shrink-0 items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${cfg.iconBg} ${cfg.iconClass}`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </div>
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
        <div className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-gray-800">
          <p className="min-w-0">
            <span className="font-medium text-gray-600">{splLabel}:</span>{' '}
            <span className={splName ? 'text-gray-900' : 'text-gray-400'}>{splName || '—'}</span>
          </p>
          <p className="min-w-0">
            <span className="font-medium text-gray-600">Adult leader:</span>{' '}
            <span className={adultName ? 'text-gray-900' : 'text-gray-400'}>{adultName || '—'}</span>
          </p>
        </div>
      </div>

      <div className="flex min-h-0 shrink-0 flex-col items-stretch justify-between self-stretch border-l border-gray-100 pl-3 sm:pl-3.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onEdit();
          }}
          className="touch-target inline-flex min-h-10 w-full min-w-[5.25rem] shrink-0 items-center justify-center rounded-lg border border-scout-blue/22 bg-scout-blue/[0.09] px-3 py-2 text-xs font-semibold text-scout-blue/85 shadow-sm transition-colors hover:bg-scout-blue/14 active:bg-scout-blue/18 sm:min-h-11 sm:min-w-[5.5rem] sm:px-3.5"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onDelete();
          }}
          className="touch-target inline-flex min-h-10 w-full min-w-[5.25rem] shrink-0 items-center justify-center rounded-lg border border-scout-red/28 bg-white px-3 py-2 text-xs font-semibold text-scout-red shadow-sm transition-colors hover:bg-scout-red/[0.06] active:bg-scout-red/10 sm:min-h-11 sm:min-w-[5.5rem] sm:px-3.5"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

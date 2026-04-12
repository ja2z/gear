import { format } from 'date-fns';
import { X } from 'lucide-react';
import { OUTING_TYPE_BADGES, getTypeConfig } from './OutingListCard';

/** List of events for one calendar day; choose an event to open the detail modal. */
export default function CalendarDayModal({ day, events, onClose, onSelectEvent, getDaySpan }) {
  const titleFull = format(day, 'EEEE, MMMM d, yyyy');
  /** Short weekday in the header (e.g. Tue); full name remains in `title` / `titleFull`. */
  const titleLine = format(day, 'EEE, MMM d, yyyy');
  const eventsLabel =
    events.length === 0
      ? 'No events'
      : `${events.length} ${events.length === 1 ? 'event' : 'events'}`;
  const headerTitleAttr = `${titleFull} — ${eventsLabel}`;

  return (
    <div
      className="modal-dialog-overlay-root select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-day-modal-title"
    >
      <div
        role="presentation"
        aria-hidden
        className="modal-dialog-backdrop-surface modal-dialog-backdrop-enter z-0"
        onClick={onClose}
      />
      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 py-3 sm:px-5 sm:py-4">
        <div
          className="pointer-events-auto relative flex max-h-[min(85dvh,36rem)] w-full max-w-xs flex-col overflow-hidden rounded-2xl bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-2xl ring-1 ring-gray-200/90 modal-dialog-panel-enter sm:max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 px-3 py-1.5 sm:px-3.5 sm:py-2">
            <div className="min-w-0 flex-1">
              <h2
                id="calendar-day-modal-title"
                className="text-lg font-bold leading-snug text-gray-900 line-clamp-1 [overflow-wrap:anywhere]"
                title={headerTitleAttr}
              >
                {titleLine}
                <span className="font-medium text-gray-500">
                  {' '}
                  · {eventsLabel}
                </span>
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Padding on inner wrapper so bottom inset scrolls with content (overflow padding bug in WebKit). */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="px-2.5 pt-1 pb-2.5 sm:px-3 sm:pt-1.5 sm:pb-3">
              {events.length === 0 ? (
                <p className="py-5 text-center text-sm text-gray-500">Nothing scheduled for this day.</p>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {events.map((ev) => {
                    const cfg = getTypeConfig(ev.eventType);
                    const Icon = cfg.Icon;
                    const badgeClass = OUTING_TYPE_BADGES[ev.eventType] || 'bg-gray-100 text-gray-700';
                    const span = getDaySpan?.(ev);
                    const showSpan = span && span.total > 1;
                    const nameLineTitle = showSpan
                      ? `(Day ${span.current}/${span.total}) ${ev.name}`
                      : ev.name;

                    return (
                    <li key={ev.id} className="m-0 p-0">
                      <button
                        type="button"
                        title={nameLineTitle}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={`card flex h-[5rem] w-full min-w-0 flex-row items-center gap-1 border-l-[3px] py-1 pl-1 pr-1.5 text-left transition-colors hover:border-scout-blue/30 sm:h-[5.25rem] sm:gap-1.5 sm:py-1.5 sm:pl-1.5 sm:pr-2 ${cfg.rail}`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${cfg.iconBg} ${cfg.iconClass}`}
                          aria-hidden
                        >
                          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-start gap-0.5">
                          <p className="m-0 min-w-0 shrink-0 break-words text-[13px] font-semibold leading-snug text-gray-900 line-clamp-1 [overflow-wrap:anywhere]">
                            {showSpan && (
                              <span className="whitespace-nowrap font-mono text-[11px] font-semibold tabular-nums text-gray-600">
                                (Day {span.current}/{span.total}){' '}
                              </span>
                            )}
                            {ev.name}
                          </p>
                          {ev.eventType && (
                            <div className="flex shrink-0 flex-wrap gap-1">
                              <span
                                className={`inline-flex max-w-full rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide ${badgeClass}`}
                              >
                                {ev.eventType}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

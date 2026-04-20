import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Package, ClipboardList, UtensilsCrossed, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useInventory } from '../hooks/useInventory';
import { OUTING_TYPE_BADGES } from './OutingListCard';
import { parseTroopApiDateToLocalDate, formatEventDateTime } from '../utils/outingFormat';
import {
  adultLeaderNameFromEvent,
  primaryLeaderLabel,
  primaryLeaderNameFromEvent,
} from '../utils/eventLabels';

function parseYmd(s) {
  return parseTroopApiDateToLocalDate(s);
}

export default function CalendarEventModal({ event, onClose }) {
  const { getData } = useInventory();
  const [gear, setGear] = useState([]);
  const [gearLoading, setGearLoading] = useState(true);
  /** True while exit animation plays; parent keeps modal mounted until onClose runs. */
  const [exiting, setExiting] = useState(false);
  const exitHandledRef = useRef(false);
  /** Ignore backdrop taps immediately after open (avoids closing when stacked after day-picker tap). */
  const openedAtRef = useRef(0);

  const loadGear = useCallback(async () => {
    if (!event?.id) { setGearLoading(false); return; }
    setGearLoading(true);
    try {
      const items = await getData(`/inventory/checked-out/${encodeURIComponent(event.id)}`);
      setGear(items || []);
    } catch {
      setGear([]);
    } finally {
      setGearLoading(false);
    }
  }, [getData, event?.id]);

  useEffect(() => { loadGear(); }, [loadGear]);

  useEffect(() => {
    openedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }, [event?.id]);

  const finishClose = useCallback(() => {
    if (exitHandledRef.current) return;
    exitHandledRef.current = true;
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (exiting) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishClose();
      return;
    }
    exitHandledRef.current = false;
    setExiting(true);
  }, [exiting, finishClose]);

  useEffect(() => {
    exitHandledRef.current = false;
    setExiting(false);
  }, [event?.id]);

  useEffect(() => {
    if (!exiting) return;
    const id = setTimeout(() => {
      finishClose();
    }, 450);
    return () => clearTimeout(id);
  }, [exiting, finishClose]);

  const handlePanelAnimationEnd = (e) => {
    if (!exiting) return;
    if (e.target !== e.currentTarget) return;
    finishClose();
  };

  const handleBackdropPointerDown = useCallback(
    (e) => {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (now - openedAtRef.current < 450) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      requestClose();
    },
    [requestClose],
  );

  const badgeClass = OUTING_TYPE_BADGES[event.eventType] || 'bg-gray-100 text-gray-700';

  const startDate = parseYmd(event.startDate);
  const endDate = parseYmd(event.endDate);
  const isMultiDay = startDate && endDate && event.startDate !== event.endDate;
  const dateStr = startDate
    ? isMultiDay
      ? `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d, yyyy')}`
      : formatEventDateTime(event.startDate, event.timezone)
    : null;

  const splName = primaryLeaderNameFromEvent(event);
  const adultName = adultLeaderNameFromEvent(event);

  return (
    <div
      className="modal-dialog-overlay-root select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-event-modal-title"
    >
      <div
        role="presentation"
        aria-hidden
        className={`modal-dialog-backdrop-surface ${exiting ? 'modal-dialog-backdrop-exit' : 'modal-dialog-backdrop-enter'}`}
        onPointerDown={handleBackdropPointerDown}
      />
      {/* Mobile: flex justify-end grows a taller max-h upward — shell pins top (26rem bottom-sheet era) so extra height extends downward only. sm+: centered card. */}
      <div className="pointer-events-none absolute inset-0 flex min-h-0 flex-col items-center justify-end overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom,0px)+max(7.5rem,22dvh))] max-sm:justify-start max-sm:overflow-hidden max-sm:p-0 max-sm:pb-0 sm:justify-center sm:overflow-visible sm:p-4 sm:pb-4">
        <div
          className="relative z-[101] flex min-h-0 w-full max-w-xs flex-col max-sm:pointer-events-auto max-sm:absolute max-sm:left-1/2 max-sm:top-[calc(100svh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-max(7.5rem,22dvh)-26rem-60px)] max-sm:w-[min(calc(100%-2rem),20rem)] max-sm:max-h-[min(34rem,calc(26rem+60px+max(7.5rem,22dvh)-max(4rem,14dvh)))] max-sm:-translate-x-1/2 max-sm:translate-y-0 sm:relative sm:top-auto sm:w-full sm:max-w-sm sm:translate-x-0 sm:max-h-[min(100%,42rem,calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-3.5rem))]"
        >
          <div
            className={`pointer-events-auto flex max-sm:h-full min-h-0 min-w-0 w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:h-auto ${
              exiting ? 'modal-dialog-panel-exit' : 'modal-dialog-panel-enter'
            }`}
            onAnimationEnd={handlePanelAnimationEnd}
          >
        {/* Header — shrink-0 + min-h-0 scroll body so title stays visible on mobile (vh/dvh safe) */}
        <div className="flex shrink-0 items-start gap-2 border-b border-gray-100 px-3 pt-3 pb-2 sm:px-4 sm:pt-4">
          <div className="min-w-0 flex-1">
            <h2 id="calendar-event-modal-title" className="text-lg font-bold text-gray-900 leading-snug">{event.name}</h2>
            {event.eventType && (
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}>
                {event.eventType}
              </span>
            )}
            {dateStr && (
              <p className="mt-1 text-sm text-gray-500">{dateStr}</p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:px-5">
          {/* Leaders — always two lines (placeholders) so layout matches every event */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Leaders</h3>
            <div className="space-y-1">
              <p className={`text-sm ${splName ? 'text-gray-700' : 'text-gray-400'}`}>
                <span className="font-medium text-gray-500">{primaryLeaderLabel(event.eventType)}</span>
                {' — '}
                {splName || '—'}
              </p>
              <p className={`text-sm ${adultName ? 'text-gray-700' : 'text-gray-400'}`}>
                <span className="font-medium text-gray-500">Adult leader</span>
                {' — '}
                {adultName || '—'}
              </p>
            </div>
          </section>

          {/* Gear checked out */}
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              <Package className="h-3.5 w-3.5" />
              Gear checked out
            </h3>
            {gearLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
              </div>
            ) : gear.length === 0 ? (
              <p className="py-4 text-center text-sm italic text-gray-400">No gear checked out</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
                {gear.map((item) => (
                  <li key={item.itemId} className="flex items-center gap-3 px-3 py-2 bg-white">
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-gray-600">{item.itemId}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-800">{item.description || item.itemId}</p>
                      {item.checkedOutTo && (
                        <p className="text-[11px] text-gray-400">→ {item.checkedOutTo}</p>
                      )}
                    </div>
                    {item.condition && (
                      <span className={`shrink-0 text-[10px] font-medium ${
                        item.condition === 'Usable' ? 'text-green-600' : item.condition === 'Not usable' ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {item.condition}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Duty roster — coming soon */}
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              <ClipboardList className="h-3.5 w-3.5" />
              Duty roster
            </h3>
            <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-6">
              <p className="text-sm italic text-gray-400">Coming soon</p>
            </div>
          </section>

          {/* Meals — coming soon */}
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Meals
            </h3>
            <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-6">
              <p className="text-sm italic text-gray-400">Coming soon</p>
            </div>
          </section>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

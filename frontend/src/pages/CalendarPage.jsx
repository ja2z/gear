import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  differenceInCalendarDays,
} from 'date-fns';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import CalendarEventModal from '../components/CalendarEventModal';
import CalendarDayModal from '../components/CalendarDayModal';
import { useInventory } from '../hooks/useInventory';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';
import { parseTroopApiDateToLocalDate } from '../utils/outingFormat';
import { calendarYmdTroop } from '../utils/outingFilters';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EVENT_COLORS = {
  'Day Outing': { bg: 'bg-green-500', text: 'text-white' },
  'Overnight Outing': { bg: 'bg-scout-blue', text: 'text-white' },
  Meeting: { bg: 'bg-amber-500', text: 'text-white' },
};

function getEventColor(eventType) {
  return EVENT_COLORS[eventType] ?? { bg: 'bg-gray-400', text: 'text-white' };
}

/** Calendar grid: same calendar day as troop roster (handles DATE + ISO from API). */
function parseYmd(s) {
  return parseTroopApiDateToLocalDate(s);
}

function eventSpansDay(ev, day) {
  const start = parseYmd(ev.startDate);
  if (!start) return false;
  const end = parseYmd(ev.endDate) || start;
  return isWithinInterval(day, { start, end });
}

/** 1-based index of this calendar day within the event, and inclusive span length. */
function getEventDaySpan(ev, day) {
  const start = parseYmd(ev.startDate);
  if (!start) return { current: 1, total: 1 };
  const end = parseYmd(ev.endDate) || start;
  const total = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const current = Math.min(
    total,
    Math.max(1, differenceInCalendarDays(day, start) + 1)
  );
  return { current, total };
}

function sortEventsForDay(a, b) {
  const sa = calendarYmdTroop(a.startDate) || '';
  const sb = calendarYmdTroop(b.startDate) || '';
  if (sa !== sb) return sa.localeCompare(sb);
  return (a.name || '').localeCompare(b.name || '');
}

const CalendarPage = () => {
  const { getData } = useInventory();
  const isDesktop = useIsDesktop();
  useDesktopHeader({ title: 'Calendar', subtitle: 'Troop schedule' });

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  /** When set, shows the list of events for that day; choose one to open the event detail modal. */
  const [selectedDay, setSelectedDay] = useState(null);

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getData('/events');
      setEvents(Array.isArray(data) ? data : []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [getData]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const navigate = useCallback(
    (dir) => setAnchor((a) => addMonths(a, dir)),
    []
  );

  const monthGrid = useMemo(() => {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [anchor]);

  const weekCount = monthGrid.length / 7;

  const headerLabel = format(anchor, 'MMMM yyyy');

  const dayModalEvents = useMemo(() => {
    if (!selectedDay) return [];
    return events.filter((ev) => eventSpansDay(ev, selectedDay)).sort(sortEventsForDay);
  }, [selectedDay, events]);

  const openDayModal = useCallback((day) => {
    setSelectedDay(day);
  }, []);

  function renderEventPill(ev, day) {
    const color = getEventColor(ev.eventType);
    const { current, total } = getEventDaySpan(ev, day);
    const showCounter = total > 1;
    const detailTitle = showCounter
      ? `${ev.name} — day ${current} of ${total}`
      : ev.name;

    return (
      <div
        key={`${ev.id}-${format(day, 'yyyy-MM-dd')}`}
        title={detailTitle}
        className={`${color.bg} ${color.text} mx-auto block w-full max-w-[5rem] min-w-0 shrink-0 rounded-md p-1 text-left sm:max-w-[5.75rem] sm:p-1.5`}
      >
        {/* Inline (1/X) + name in one <p> so line-clamp-2 can truncate (no extra text after 2 lines; ellipsis). Float breaks line-clamp. */}
        <div className="min-w-0">
          <p className="m-0 line-clamp-2 break-words text-[7px] font-medium leading-[1.25] text-inherit [overflow-wrap:anywhere] sm:text-[8px] sm:leading-[1.25]">
            {showCounter ? (
              <>
                <span className="whitespace-nowrap font-mono text-[6px] leading-none opacity-90 tabular-nums sm:text-[7px]">
                  ({current}/{total}){' '}
                </span>
                {ev.name}
              </>
            ) : (
              ev.name
            )}
          </p>
        </div>
      </div>
    );
  }

  function renderDayCell(day) {
    const inMonth = isSameMonth(day, anchor);
    const isToday_ = isSameDay(day, today);

    const dayEvents = events
      .filter((ev) => eventSpansDay(ev, day))
      .sort(sortEventsForDay);
    return (
      <div
        key={day.toISOString()}
        role="button"
        tabIndex={0}
        onClick={() => openDayModal(day)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openDayModal(day);
          }
        }}
        aria-label={
          dayEvents.length > 0
            ? `${format(day, 'EEEE, MMMM d')}, ${dayEvents.length} ${dayEvents.length === 1 ? 'event' : 'events'}`
            : format(day, 'EEEE, MMMM d')
        }
        className={`flex h-full min-h-0 min-w-0 cursor-pointer flex-col border-b border-r border-gray-100 px-0.5 py-0.5 outline-none transition-colors hover:bg-scout-blue/[0.04] focus-visible:ring-2 focus-visible:ring-scout-blue/30 sm:px-1 sm:py-1 ${
          !inMonth ? 'bg-gray-50/60' : 'bg-white'
        }`}
      >
        <span
          className={`pointer-events-none mx-auto flex h-6 w-6 shrink-0 items-center justify-center text-xs font-medium sm:h-7 sm:w-7 sm:text-sm ${
            isToday_
              ? 'rounded-full bg-scout-blue text-white font-bold'
              : inMonth
                ? 'text-gray-900'
                : 'text-gray-300'
          }`}
        >
          {format(day, 'd')}
        </span>
        <div className="pointer-events-auto mt-px min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch] flex flex-col gap-0.5">
          {dayEvents.map((ev) => renderEventPill(ev, day))}
        </div>
      </div>
    );
  }

  const content = (
    <>
      <div className="shrink-0 bg-white px-3 pt-2 pb-2 shadow-sm sm:px-4 sm:pt-3 sm:pb-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="min-w-0 flex-1 text-center text-sm font-semibold text-gray-900 sm:text-base">
            {headerLabel}
          </h2>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-scout-blue" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden bg-white">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
                {d}
              </div>
            ))}
          </div>

          <div
            className="grid flex-1 grid-cols-7 overflow-hidden"
            style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
          >
            {monthGrid.map((day) => renderDayCell(day))}
          </div>
        </div>
      )}

      {selectedDay && (
        <CalendarDayModal
          day={selectedDay}
          events={dayModalEvents}
          onClose={() => setSelectedDay(null)}
          onSelectEvent={(ev) => {
            setSelectedDay(null);
            window.setTimeout(() => setSelectedEvent(ev), 0);
          }}
          getDaySpan={(ev) => getEventDaySpan(ev, selectedDay)}
        />
      )}
      {selectedEvent && (
        <CalendarEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );

  if (isDesktop) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {content}
      </div>
    );
  }

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className="header">
        <Link to="/home" className="back-button no-underline">←</Link>
        <h1>Calendar</h1>
        <HeaderProfileMenu />
      </div>
      <AnimateMain className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {content}
      </AnimateMain>
    </div>
  );
};

export default CalendarPage;

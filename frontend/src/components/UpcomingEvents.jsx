import { Tent, Users, UsersRound } from 'lucide-react';
import { UPCOMING_EVENTS } from '../data/upcomingEvents';

const KIND_CONFIG = {
  outing: {
    Icon: Tent,
    iconClass: 'bg-scout-green/10 text-scout-green/70',
  },
  meeting: {
    Icon: Users,
    iconClass: 'bg-scout-blue/10 text-scout-blue/70',
  },
  plc: {
    Icon: UsersRound,
    iconClass: 'bg-scout-teal/10 text-scout-teal/70',
  },
};

/** Glass over hero — balanced so the photo still shows but text stays legible */
const cardFloating =
  'rounded-xl border border-white/70 bg-white/58 shadow-md backdrop-blur-[6px] sm:bg-white/65 sm:backdrop-blur-md';

/**
 * @param {'floating' | 'panel'} variant — floating: translucent cards over the hero; panel: legacy single card on gray
 */
const UpcomingEvents = ({ events = UPCOMING_EVENTS, variant = 'panel' }) => {
  if (!events?.length) return null;

  if (variant === 'floating') {
    return (
      <section
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex max-h-[72%] items-end px-2 pb-2.5 pt-6 sm:px-3 sm:pb-3"
        aria-label="Upcoming events"
      >
        <div className="flex w-full min-w-0 gap-1.5 sm:gap-2">
          {events.map((ev) => {
            const cfg = KIND_CONFIG[ev.kind] ?? KIND_CONFIG.meeting;
            const Icon = cfg.Icon;
            return (
              <article
                key={ev.id}
                className={`relative flex min-w-0 flex-1 cursor-default flex-col items-center gap-1 px-1.5 py-2 text-center select-none sm:gap-1.5 sm:px-2 sm:py-2.5 ${cardFloating}`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${cfg.iconClass}`}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
                </div>
                <p className="w-full text-[8px] font-semibold uppercase leading-tight tracking-wide text-gray-800 [text-shadow:0_1px_1px_rgba(255,255,255,0.7)] sm:text-[9px]">
                  {ev.label}
                </p>
                <p className="line-clamp-2 w-full text-[11px] font-semibold leading-snug text-gray-950 [text-shadow:0_1px_1px_rgba(255,255,255,0.65)] sm:text-xs">
                  {ev.title}
                </p>
                <p className="line-clamp-2 w-full text-[9px] leading-snug text-gray-800 [text-shadow:0_1px_1px_rgba(255,255,255,0.6)] sm:text-[10px]">
                  {ev.detail}
                </p>
              </article>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-4 shrink-0" aria-labelledby="upcoming-heading">
      <h2
        id="upcoming-heading"
        className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500"
      >
        Upcoming
      </h2>
      <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
        {events.map((ev, i) => {
          const cfg = KIND_CONFIG[ev.kind] ?? KIND_CONFIG.meeting;
          const Icon = cfg.Icon;
          return (
            <div
              key={ev.id}
              className={`flex gap-3 px-3 py-2.5 sm:py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${cfg.iconClass}`}
              >
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} aria-hidden />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  {ev.label}
                </p>
                <p className="truncate text-sm font-semibold leading-snug text-gray-900">{ev.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-gray-600 line-clamp-2">{ev.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default UpcomingEvents;

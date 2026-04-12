import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  ChevronRight,
  Clock,
  Loader2,
  Megaphone,
  User,
  Users,
} from 'lucide-react';
import { useDesktopHeader } from '../../context/DesktopHeaderContext';
import { useAuth } from '../../context/AuthContext';
import { useInventory } from '../../hooks/useInventory';
import { normalizeAnnouncements } from '../../utils/normalizeAnnouncements';
import { formatTroopEventDate } from '../../utils/outingFormat';

const TYPE_BADGE_COLOR = {
  'Day Outing':       'bg-scout-green/10 text-scout-green',
  'Overnight Outing': 'bg-scout-blue/10 text-scout-blue',
  'Meeting':          'bg-gray-100 text-gray-500',
};

function todayLong() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatEventDate(startDate, endDate) {
  if (!startDate) return null;
  const fmt = (d) => formatTroopEventDate(d, { short: true });
  return endDate ? `${fmt(startDate)}–${fmt(endDate)}` : fmt(startDate);
}

function formatAnnouncementDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** TroopTrack-style panel: white card, header row, body */
function DashboardPanel({ id, title, icon: Icon, children, badge }) {
  return (
    <section
      aria-labelledby={id}
      className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm"
    >
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-scout-blue/8 text-scout-blue/80">
            <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
          </div>
        )}
        <h2 id={id} className="min-w-0 flex-1 text-sm font-semibold text-gray-900">
          {title}
        </h2>
        {badge != null && (
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-gray-600">
            {badge}
          </span>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

/** Narrow shortcut — main hub story is center column; this is just a door to /advancement */
function AdvancementShortcut() {
  return (
    <Link
      to="/advancement"
      className="flex items-center gap-2.5 rounded-xl border border-gray-200/90 bg-white px-3 py-2.5 text-sm shadow-sm outline-none ring-scout-blue/30 transition-colors hover:border-scout-blue/25 hover:bg-scout-blue/[0.03] focus-visible:ring-2"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-scout-blue/8 text-scout-blue/80">
        <Award className="h-4 w-4" strokeWidth={2} aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">Advancement</p>
        <p className="text-[11px] text-gray-400">Placeholder until connected</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
    </Link>
  );
}

function useDashboardData() {
  const { getData } = useInventory();
  const [events, setEvents] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [outingsData, setOutingsData] = useState([]);
  const [checkedOutItems, setCheckedOutItems] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [reservationCount, setReservationCount] = useState(0);
  const [inShedCount, setInShedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsData, inventoryData, outingsList, reservationsRaw, announcementsRaw] =
        await Promise.all([
          getData('/events').catch(() => []),
          getData('/inventory').catch(() => []),
          getData('/inventory/outings').catch(() => []),
          getData('/reservations').catch(() => []),
          getData('/announcements').catch(() => null),
        ]);

      setEvents(eventsData);
      setInventory(inventoryData);
      setOutingsData(Array.isArray(outingsList) ? outingsList : []);
      setAnnouncements(normalizeAnnouncements(announcementsRaw));

      const resList = Array.isArray(reservationsRaw) ? reservationsRaw : [];
      setReservationCount(resList.length);

      const active = inventoryData.filter((i) => i.status !== 'Removed from inventory');
      setInShedCount(active.filter((i) => i.status === 'In shed').length);

      const itemPromises = outingsList.slice(0, 3).map((o) =>
        getData(`/inventory/checked-out/${o.eventId}`).catch(() => [])
      );
      const itemArrays = await Promise.all(itemPromises);
      setCheckedOutItems(itemArrays.flat().slice(0, 5));
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }, [getData]);

  useEffect(() => {
    load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events
    .filter((e) => e.startDate && e.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 4);

  const activeOutingsCount = outingsData.length;

  return {
    loading,
    upcoming,
    checkedOutItems,
    announcements,
    activeOutingsCount,
    inShedCount,
    reservationCount,
  };
}

/**
 * Laptop (lg+) Troop Hub. Center = announcements, itinerary, activity. Right = shortcuts (account, gear, advancement).
 */
export default function HomeDashboard() {
  const { user } = useAuth();
  const {
    loading,
    upcoming,
    checkedOutItems,
    announcements,
    activeOutingsCount,
    inShedCount,
    reservationCount,
  } = useDashboardData();

  useDesktopHeader({
    title: 'Troop 222',
    subtitle: "Welcome back — here's what's happening with the troop.",
    headerRight: <span className="text-xs font-medium tabular-nums text-gray-400">{todayLong()}</span>,
  });

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Member'
    : 'Member';
  const accountEmail = user?.email || '';

  return (
    <div className="flex flex-col gap-5">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-scout-blue/50" />
        </div>
      )}

      {!loading && (
        <>
          <p className="text-sm text-gray-500">
            Use the sidebar for full sections. Below, the center is your overview; the right column is
            quick links from your session.
          </p>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm">
              <span className="font-semibold tabular-nums text-gray-900">{upcoming.length}</span>
              upcoming events
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm">
              <span className="font-semibold tabular-nums text-gray-900">{activeOutingsCount}</span>
              {activeOutingsCount === 1 ? 'event' : 'events'} with gear out
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm">
              <span className="font-semibold tabular-nums text-gray-900">{reservationCount}</span>
              open reservations
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200/90 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-sm">
              <span className="font-semibold tabular-nums text-gray-900">{inShedCount}</span>
              items in shed
            </span>
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_16.5rem] xl:items-start xl:gap-8">
            {/* Center — primary story */}
            <div className="flex min-w-0 flex-col gap-5">
              <DashboardPanel
                id="announcements-dash"
                title="Announcements"
                icon={Megaphone}
                badge={announcements.length}
              >
                {announcements.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-sm text-gray-500">No announcements yet.</p>
                    <p className="mt-2 text-xs leading-relaxed text-gray-400">
                      Troop emails to your address can list here once the server stores them (inbox
                      webhook + database). This UI is ready for that API.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {announcements.slice(0, 6).map((a) => (
                      <li key={a.id} className="py-2.5 first:pt-0 last:pb-0">
                        <p className="text-sm font-medium text-gray-900">{a.subject}</p>
                        {a.snippet && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{a.snippet}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-gray-400">
                          {formatAnnouncementDate(a.receivedAt) && (
                            <span>{formatAnnouncementDate(a.receivedAt)}</span>
                          )}
                          {a.from && <span>· {a.from}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </DashboardPanel>

              <section aria-labelledby="activity-dash">
                <h2 id="activity-dash" className="mb-2 text-base font-semibold text-gray-900">
                  Recent activity
                </h2>
                <div className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
                  <div className="px-4 py-6 text-center text-sm text-gray-400">
                    Activity feed coming soon
                  </div>
                </div>
              </section>

              <section aria-labelledby="upcoming-dash">
                <div className="mb-2 flex items-center justify-between">
                  <h2 id="upcoming-dash" className="text-base font-semibold text-gray-900">
                    Your itinerary
                  </h2>
                  <Link
                    to="/calendar"
                    className="flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-scout-blue"
                  >
                    Calendar <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                {upcoming.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200/90 bg-white px-4 py-8 text-center text-sm text-gray-400 shadow-sm">
                    No upcoming events
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm">
                    {upcoming.map((ev) => {
                      const badgeColor = TYPE_BADGE_COLOR[ev.eventType] ?? TYPE_BADGE_COLOR.Meeting;
                      const dateStr = formatEventDate(ev.startDate, ev.endDate);
                      return (
                        <Link
                          key={ev.id}
                          to={`/hub/event/${ev.id}`}
                          className="group flex items-center gap-4 px-4 py-3.5 no-underline transition-colors hover:bg-gray-50"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                            <Users className="h-4 w-4 text-gray-400" strokeWidth={2} aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-medium text-gray-900">
                                {ev.name}
                              </span>
                              {ev.eventType && (
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeColor}`}
                                >
                                  {ev.eventType}
                                </span>
                              )}
                            </div>
                            {dateStr && (
                              <div className="mt-0.5 flex items-center gap-1">
                                <Clock className="h-3 w-3 text-gray-400" aria-hidden />
                                <span className="text-xs text-gray-500">{dateStr}</span>
                              </div>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-gray-400" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Right — shortcuts */}
            <aside className="flex min-w-0 flex-col gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Shortcuts
              </p>
              <DashboardPanel id="profile-dash" title="Signed in" icon={User}>
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                {accountEmail ? (
                  <p className="mt-1 break-all text-xs text-gray-500">{accountEmail}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">No email on session</p>
                )}
                <p className="mt-3 text-[11px] leading-snug text-gray-400">
                  Profile details will expand when that module is ready.
                </p>
              </DashboardPanel>

              <AdvancementShortcut />

              <section aria-labelledby="gear-due-dash">
                <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-sm">
                  <h2 id="gear-due-dash" className="mb-2 text-sm font-semibold text-gray-900">
                    Gear checked out
                  </h2>
                  {checkedOutItems.length === 0 ? (
                    <p className="py-2 text-center text-xs text-gray-400">
                      No gear currently checked out
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {checkedOutItems.map((g, i) => (
                        <div key={g.itemId ?? i} className="flex items-center justify-between text-xs">
                          <div className="min-w-0">
                            <span className="font-medium text-gray-900">{g.description || g.itemId}</span>
                            {g.checkedOutTo && (
                              <span className="ml-1 text-gray-500">· {g.checkedOutTo}</span>
                            )}
                          </div>
                          {g.outingName && (
                            <span className="shrink-0 text-gray-400">{g.outingName}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <Link
                    to="/gear"
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-scout-blue hover:underline"
                  >
                    View all gear <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

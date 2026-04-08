import { Link } from 'react-router-dom';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import { useAuth } from '../context/AuthContext';
import { canManageMembers } from '../utils/permissions';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';
import {
  Backpack,
  Users,
  Calendar,
  Banknote,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';

const TABLE_OPTIONS = [
  {
    id: 'gear',
    title: 'Gear inventory',
    description: 'Items, categories, and transaction logs',
    to: '/manage-inventory',
    icon: Backpack,
    comingSoon: false,
    iconClass: 'bg-scout-blue/10 text-scout-blue/70',
  },
  {
    id: 'members',
    title: 'Members',
    description: 'Roster, households, and roles',
    to: '/manage/members',
    icon: Users,
    comingSoon: false,
    adminOnly: true,
    iconClass: 'bg-scout-green/10 text-scout-green/70',
  },
  {
    id: 'events',
    title: 'Calendar & events',
    description: 'Meetings, outings, and RSVPs',
    icon: Calendar,
    comingSoon: true,
    iconClass: 'bg-gray-100 text-gray-400',
  },
  {
    id: 'finances',
    title: 'Finances',
    description: 'Accounts, dues, and receipts',
    icon: Banknote,
    comingSoon: true,
    iconClass: 'bg-gray-100 text-gray-400',
  },
  {
    id: 'other',
    title: 'Other data',
    description: 'Additional tables you can wire up later',
    icon: ClipboardList,
    comingSoon: true,
    iconClass: 'bg-gray-100 text-gray-400',
  },
];

function ManageOptionsList({ userCanManageMembers }) {
  return (
    <ul className="space-y-3">
      {TABLE_OPTIONS.map((row) => {
        const Icon = row.icon;
        const isRestricted = row.adminOnly && !userCanManageMembers;
        const inner = (
          <>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${row.iconClass}`}>
              <Icon className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{row.title}</span>
                {row.comingSoon && (
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                    Soon
                  </span>
                )}
                {isRestricted && (
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                    Admin only
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-600">{row.description}</p>
            </div>
            {!row.comingSoon && !isRestricted && (
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
            )}
          </>
        );

        if (row.to && !row.comingSoon && !isRestricted) {
          return (
            <li key={row.id}>
              <Link
                to={row.to}
                className="card flex items-center gap-4 no-underline transition-shadow hover:shadow-md"
              >
                {inner}
              </Link>
            </li>
          );
        }

        return (
          <li key={row.id}>
            <div className={`card flex items-center gap-4 opacity-75${isRestricted ? ' cursor-not-allowed' : ''}`}>
              {inner}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const ManageTables = () => {
  const { user } = useAuth();
  const userCanManageMembers = canManageMembers(user);
  const isDesktop = useIsDesktop();

  useDesktopHeader({ title: 'Manage', subtitle: 'Admin & settings' });

  if (isDesktop) {
    return (
      <>
        <p className="mb-6 text-sm text-gray-600">
          Pick a table to work on.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {TABLE_OPTIONS.map((row) => {
            const Icon = row.icon;
            const isRestricted = row.adminOnly && !userCanManageMembers;
            const inner = (
              <div
                className={`flex h-full flex-col gap-3 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-sm transition-shadow ${
                  row.comingSoon ? 'opacity-60' : isRestricted ? 'opacity-75' : 'hover:shadow-md'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${row.iconClass}`}>
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-gray-900">{row.title}</span>
                    {row.comingSoon && (
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                        Soon
                      </span>
                    )}
                    {isRestricted && (
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                        Admin only
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{row.description}</p>
              </div>
            );
            if (row.to && !row.comingSoon && !isRestricted) {
              return (
                <Link key={row.id} to={row.to} className="no-underline">
                  {inner}
                </Link>
              );
            }
            return <div key={row.id}>{inner}</div>;
          })}
        </div>
      </>
    );
  }

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <div className="header">
        <Link to="/home" className="back-button no-underline" aria-label="Back to troop hub">
          ←
        </Link>
        <h1>Manage data</h1>
        <HeaderProfileMenu />
      </div>

      <AnimateMain className="flex-1 overflow-y-auto px-4 py-6 pb-10">
        <p className="mb-4 text-center text-sm text-gray-600">
          Pick a table to work on. This is separate from the gear checkout flow on the troop hub.
        </p>
        <div className="mx-auto max-w-xl">
          <ManageOptionsList userCanManageMembers={userCanManageMembers} />
        </div>
      </AnimateMain>
    </div>
  );
};

export default ManageTables;

import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Package, ScrollText, Tag } from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { AnimateMain } from '../../components/AnimateMain';
import {
  ManageHubSummaryStrip,
  ManageHubLinkRow,
  ManageHubQuickFilterCard,
} from '../../components/manage-hub';
import HeaderProfileMenu from '../../components/HeaderProfileMenu';
import useIsDesktop from '../../hooks/useIsDesktop';
import { useDesktopHeader } from '../../context/DesktopHeaderContext';

const ManageInventoryDashboard = () => {
  const { getData } = useInventory();
  const [stats, setStats] = useState(null);
  const isDesktop = useIsDesktop();

  useDesktopHeader({ title: 'Manage Inventory' });

  useEffect(() => {
    getData('/inventory')
      .then((items) => {
        const active = items.filter((i) => i.status !== 'Removed from inventory');
        const checkedOut = active.filter((i) => i.status === 'Checked out');
        const activeOutings = new Set(checkedOut.map((i) => i.outingName).filter(Boolean)).size;
        setStats({
          total: active.length,
          inShed: active.filter((i) => i.status === 'In shed').length,
          checkedOut: checkedOut.length,
          reserved: active.filter((i) => i.status === 'Reserved').length,
          missing: active.filter((i) => i.status === 'Missing').length,
          outForRepair: active.filter((i) => i.status === 'Out for repair').length,
          activeOutings,
        });
      })
      .catch(() => {
        /* non-blocking */
      });
  }, [getData]);

  const quickFilterRows = useMemo(() => {
    if (!stats) return [];
    const statusRows = [
      {
        key: 'in-shed',
        label: 'In shed',
        value: stats.inShed,
        status: 'In shed',
        valueClassName: 'text-scout-green',
      },
      {
        key: 'checked-out',
        label: 'Checked out',
        value: stats.checkedOut,
        status: 'Checked out',
        valueClassName: 'text-scout-red',
      },
      {
        key: 'reserved',
        label: 'Reserved',
        value: stats.reserved,
        status: 'Reserved',
        valueClassName: 'text-scout-orange',
      },
      {
        key: 'missing',
        label: 'Missing',
        value: stats.missing,
        status: 'Missing',
        valueClassName: 'text-orange-700',
      },
      {
        key: 'repair',
        label: 'Out for repair',
        value: stats.outForRepair,
        status: 'Out for repair',
        valueClassName: 'text-amber-700',
      },
    ];
    return statusRows.map((r) => ({
      key: r.key,
      label: r.label,
      value: r.value,
      to: `/manage-inventory/view?status=${encodeURIComponent(r.status)}`,
      valueClassName: r.valueClassName,
    }));
  }, [stats]);

  return (
    <div className={isDesktop ? '' : 'h-screen-small flex flex-col bg-gray-100'}>
      {!isDesktop && (
        <div className="header">
          <Link to="/manage" className="back-button no-underline" aria-label="Back to manage data">
            ←
          </Link>
          <h1>Manage Inventory</h1>
          <HeaderProfileMenu />
        </div>
      )}

      <AnimateMain className={isDesktop ? '' : 'flex-1 overflow-y-auto px-4 py-4 pb-8'}>
        <div className={isDesktop ? 'space-y-4' : 'mx-auto max-w-xl space-y-3'}>
          <div className={isDesktop ? 'grid grid-cols-2 gap-4' : 'flex gap-3'}>
            <div className={isDesktop ? '' : 'min-w-0 flex-1'}>
              <ManageHubSummaryStrip
                to="/manage-inventory/view?view=item"
                label="Active inventory"
                headline={stats?.total ?? '—'}
                loading={!stats}
                chips={[]}
                compact
              />
            </div>
            <div className={isDesktop ? '' : 'min-w-0 flex-1'}>
              {!stats ? (
                <div className="card animate-pulse p-3">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="mt-2 h-8 w-12 rounded bg-gray-200" />
                </div>
              ) : (
                <Link
                  to="/manage-inventory/view?view=events"
                  className="card flex h-full min-h-[4.5rem] touch-target flex-col justify-center p-3 no-underline transition-colors hover:bg-gray-50 active:bg-gray-100"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Active events
                  </p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-gray-900">
                    {stats.activeOutings}
                  </p>
                </Link>
              )}
            </div>
          </div>

          <ManageHubQuickFilterCard
            title="Browse by status"
            rows={quickFilterRows}
            compact
          />

          <ul className="space-y-3 pt-1">
            <li>
              <ManageHubLinkRow
                to="/manage-inventory/view"
                icon={Package}
                title="Manage items"
                description="Add, edit, or remove items — browse by category or item"
              />
            </li>
            <li>
              <ManageHubLinkRow
                to="/manage-inventory/categories"
                icon={Tag}
                title="Manage categories"
                description="Add or edit gear categories"
              />
            </li>
          </ul>

          <div className="border-t border-gray-200 pt-3">
            <ul className="space-y-3">
              <li>
                <ManageHubLinkRow
                  to="/manage-inventory/view-logs"
                  icon={ScrollText}
                  title="Transaction log"
                  description="Check in and check out history"
                  iconWrapperClassName="bg-scout-red/10 text-scout-red/70"
                />
              </li>
            </ul>
          </div>
        </div>
      </AnimateMain>
    </div>
  );
};

export default ManageInventoryDashboard;

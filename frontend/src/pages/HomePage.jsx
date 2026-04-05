import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Award, Backpack, Calendar, Settings, Tent } from 'lucide-react';
import TroopBrandHeader from '../components/TroopBrandHeader';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import HomeImageCycle from '../components/HomeImageCycle';
import UpcomingEvents from '../components/UpcomingEvents';
import { AnimateMain } from '../components/AnimateMain';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const headerCenter = (
    <div className="flex flex-col items-center gap-1">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <h1 className="text-lg font-semibold leading-tight text-gray-900 sm:text-xl">Troop 222</h1>
        <span className="rounded-full bg-scout-blue/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-scout-blue/60">
          Troop hub
        </span>
      </div>
      <p className="text-sm leading-snug text-gray-500">
        Welcome, <span className="font-medium text-gray-900">{user?.first_name}</span>
      </p>
    </div>
  );

  const headerCorner = <HeaderProfileMenu />;

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <TroopBrandHeader center={headerCenter} cornerRight={headerCorner} />

      <AnimateMain className="flex min-h-0 flex-1 flex-col gap-4 px-5 pt-4 pb-8">
        <div className="relative min-h-[min(52vh,420px)] w-full flex-1 overflow-hidden rounded-2xl shadow-md">
          <HomeImageCycle className="absolute inset-0 min-h-0 h-full w-full rounded-2xl shadow-none" />
          <UpcomingEvents variant="floating" />
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/gear')}
            className="flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-3xl border border-scout-blue/15 bg-scout-blue/8 px-3 py-3 text-gray-900 shadow-sm touch-target transition-colors hover:bg-scout-blue/12 active:bg-scout-blue/15"
          >
            <Backpack className="h-6 w-6 shrink-0 text-scout-blue/70" />
            <span className="text-base font-bold">Gear</span>
            <span className="text-center text-[11px] font-normal leading-snug text-gray-500">
              Checkout, inventory, quartermaster
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/outings')}
            className="flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-3xl border border-scout-green/15 bg-scout-green/8 px-3 py-3 text-gray-900 shadow-sm touch-target transition-colors hover:bg-scout-green/12 active:bg-scout-green/15"
          >
            <Tent className="h-6 w-6 shrink-0 text-scout-green/70" />
            <span className="text-base font-bold">Outings</span>
            <span className="text-center text-[11px] font-normal text-gray-500">Coming soon</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/advancement')}
            className="flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-3xl border border-scout-orange/15 bg-scout-orange/8 px-3 py-3 text-gray-900 shadow-sm touch-target transition-colors hover:bg-scout-orange/12 active:bg-scout-orange/15"
          >
            <Award className="h-6 w-6 shrink-0 text-scout-orange/70" />
            <span className="text-base font-bold">Advancement</span>
            <span className="text-center text-[11px] font-normal text-gray-500">Coming soon</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="flex min-h-[5.5rem] flex-col items-center justify-center gap-1 rounded-3xl border border-scout-teal/15 bg-scout-teal/8 px-3 py-3 text-gray-900 shadow-sm touch-target transition-colors hover:bg-scout-teal/12 active:bg-scout-teal/15"
          >
            <Calendar className="h-6 w-6 shrink-0 text-scout-teal/70" />
            <span className="text-base font-bold">Calendar</span>
            <span className="text-center text-[11px] font-normal text-gray-500">Coming soon</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/manage')}
            className="col-span-2 flex min-h-[2.75rem] flex-row items-center justify-center gap-2 rounded-3xl border border-scout-red/15 bg-scout-red/8 px-4 py-2 text-gray-900 shadow-sm touch-target transition-colors hover:bg-scout-red/12 active:bg-scout-red/15"
          >
            <Settings className="h-5 w-5 shrink-0 text-scout-red/70" />
            <span className="text-sm font-bold">Manage</span>
            <span className="text-xs font-normal text-gray-500">Members, gear data, and more</span>
          </button>
        </div>
      </AnimateMain>
    </div>
  );
};

export default HomePage;

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TroopBrandHeader from '../components/TroopBrandHeader';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import HomeHeroCarousel from '../components/HomeHeroCarousel';
import UpcomingEvents from '../components/UpcomingEvents';
import { AnimateMain } from '../components/AnimateMain';
import HomeDashboard from './home/HomeDashboard';
import { HUB_ACTIONS, hubAccentClasses } from '../config/homeHubActions';
import useIsDesktop from '../hooks/useIsDesktop';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDesktop = useIsDesktop();

  if (isDesktop) return <HomeDashboard />;

  const headerCenter = (
    <div className="flex flex-col items-center gap-0.5">
      <h1 className="text-base font-semibold leading-tight text-gray-900 sm:text-lg">Troop 222</h1>
      <p className="text-xs leading-snug text-gray-500 sm:text-sm">
        Welcome, <span className="font-medium text-gray-900">{user?.first_name}</span>
      </p>
    </div>
  );

  const headerCorner = <HeaderProfileMenu />;

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <TroopBrandHeader center={headerCenter} cornerRight={headerCorner} />

      <AnimateMain className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-y-contain px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] [-webkit-overflow-scrolling:touch] sm:gap-4 sm:px-5 sm:pt-4 sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
          <div className="relative w-full flex-1 overflow-hidden rounded-2xl shadow-md min-h-[min(26svh,8.5rem)]">
            <HomeHeroCarousel
              variant="hub"
              className="absolute inset-0 z-0 min-h-0 h-full w-full rounded-2xl"
            />
            <UpcomingEvents variant="floating" />
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2.5">
            {HUB_ACTIONS.map((action) => {
              const a = hubAccentClasses(action.accent);
              const Icon = action.Icon;
              const isFull = action.layout === 'full';
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => navigate(action.to)}
                  className={`flex flex-col items-center justify-center rounded-2xl border px-2 py-2 text-gray-900 shadow-sm touch-target transition-colors ${a.border} ${a.bg} ${a.hover} ${a.active} ${
                    isFull
                      ? 'col-span-2 min-h-[2.5rem] flex-row gap-2'
                      : 'min-h-[4.25rem] gap-0.5'
                  }`}
                >
                  <Icon className={`shrink-0 ${a.icon} ${isFull ? 'h-4 w-4' : 'h-5 w-5'}`} strokeWidth={2} />
                  <span className={`font-bold ${isFull ? 'text-sm' : 'text-sm'}`}>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </AnimateMain>
    </div>
  );
};

export default HomePage;

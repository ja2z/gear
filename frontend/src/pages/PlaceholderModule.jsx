import { Link } from 'react-router-dom';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';

/**
 * Simple placeholder for hub modules not yet built (Calendar, Advancement, Outings).
 */
const PlaceholderModule = ({ title }) => {
  const isDesktop = useIsDesktop();
  useDesktopHeader({ title: title || 'Coming Soon' });

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {!isDesktop && (
        <div className="bg-scout-blue/6 border-b border-scout-blue/10 text-gray-900 py-4 px-4 shrink-0">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <Link to="/home" className="back-button shrink-0 no-underline text-gray-700">
              ←
            </Link>
            <h1 className="min-w-0 flex-1 text-center text-lg font-semibold">{title}</h1>
            <HeaderProfileMenu />
          </div>
        </div>
      )}
      <AnimateMain className="flex flex-1 flex-col min-h-0">
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <p className="text-center text-gray-600 text-lg">Coming soon</p>
        </div>
      </AnimateMain>
    </div>
  );
};

export default PlaceholderModule;

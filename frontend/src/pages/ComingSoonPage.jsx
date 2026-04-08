import { Link } from 'react-router-dom';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import useIsDesktop from '../hooks/useIsDesktop';
import { useDesktopHeader } from '../context/DesktopHeaderContext';

const ComingSoonPage = ({ title }) => {
  const isDesktop = useIsDesktop();
  useDesktopHeader({ title });

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {!isDesktop && (
        <div className="header">
          <Link to="/home" className="back-button no-underline">
            ←
          </Link>
          <h1>{title}</h1>
          <HeaderProfileMenu />
        </div>
      )}
      <AnimateMain className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 items-center justify-center px-5">
          <p className="text-center text-gray-400">Coming soon.</p>
        </div>
      </AnimateMain>
    </div>
  );
};

export default ComingSoonPage;

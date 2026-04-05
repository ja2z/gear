import { Link } from 'react-router-dom';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';

const OutingsPage = () => (
  <div className="h-screen-small flex flex-col bg-gray-100">
    <div className="header">
      <Link to="/home" className="back-button no-underline">←</Link>
      <h1>Outings</h1>
      <HeaderProfileMenu />
    </div>
    <AnimateMain className="flex flex-1 flex-col min-h-0">
      <div className="flex flex-1 items-center justify-center px-5">
        <p className="text-gray-400 text-center">Outings coming soon.</p>
      </div>
    </AnimateMain>
  </div>
);

export default OutingsPage;

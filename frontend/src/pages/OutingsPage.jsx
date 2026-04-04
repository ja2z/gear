import { Link } from 'react-router-dom';

const OutingsPage = () => (
  <div className="h-screen-small flex flex-col bg-gray-100">
    <div className="header">
      <Link to="/home" className="back-button no-underline">←</Link>
      <h1>Outings</h1>
      <div className="w-10 h-10" />
    </div>
    <div className="flex-1 flex items-center justify-center px-5">
      <p className="text-gray-400 text-center">Outings coming soon.</p>
    </div>
  </div>
);

export default OutingsPage;

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Backpack, Settings, Tent } from 'lucide-react';

const HomePage = () => {
  const navigate         = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-scout-blue text-white py-5 px-4 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img src="/BSA_Logo.webp" alt="BSA Logo" className="h-10 w-auto mr-3" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">Troop 222 Gear Tracker</h1>
              <p className="text-sm text-white/70">Welcome, {user?.first_name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/60 text-sm hover:text-white/90 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex-1 flex flex-col justify-end px-5 pb-8 space-y-3">
        <button
          onClick={() => navigate('/gear')}
          className="flex flex-col items-center justify-center gap-1.5
                     rounded-3xl py-7 bg-scout-blue text-white
                     font-bold text-lg shadow-sm transition-all"
        >
          <Backpack className="h-7 w-7" />
          Gear
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/outings')}
            className="flex-1 flex flex-col items-center justify-center gap-1.5
                       rounded-3xl py-6 bg-scout-green text-white
                       font-bold text-base shadow-sm transition-all"
          >
            <Tent className="h-6 w-6" />
            Outings
          </button>

          <button
            onClick={() => navigate('/manage')}
            className="flex-1 flex flex-col items-center justify-center gap-1.5
                       rounded-3xl py-6 border-2 border-scout-red text-scout-red
                       bg-transparent font-bold text-base transition-all"
          >
            <Settings className="h-6 w-6" />
            Manage
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

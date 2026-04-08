import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimateMain } from '../components/AnimateMain';
import { useDesktopHeader } from '../context/DesktopHeaderContext';

const ReservationSuccess = () => {
  const [searchParams] = useSearchParams();
  const count = parseInt(searchParams.get('count') || '0', 10);
  const outing = searchParams.get('outing') || '';
  const [animate, setAnimate] = useState(false);

  useDesktopHeader({ title: 'Reservation Confirmed' });

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="h-screen-small flex flex-col bg-gray-100">
      <AnimateMain className="flex flex-1 flex-col min-h-0">
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center lg:max-w-lg lg:mx-auto lg:mt-8">
        <div
          className="text-7xl mb-6 inline-block"
          style={{
            animation: animate ? 'successBounce 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards' : 'none',
          }}
        >
          📋
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Reservation confirmed!</h2>
        {outing && (
          <p className="text-gray-700 font-medium mb-1">{outing}</p>
        )}
        <p className="text-gray-500 text-lg mb-2">
          {count} {count === 1 ? 'item' : 'items'} reserved
        </p>
        <p className="text-gray-400 text-sm mb-8">Check your email for a confirmation and PDF summary.</p>

        <Link
          to="/home"
          className="inline-flex items-center justify-center rounded-md bg-scout-blue/12 border border-scout-blue/20 text-scout-blue px-8 py-3 text-base font-medium touch-target no-underline"
        >
          Return to Home
        </Link>
      </div>
      <div className="shrink-0 flex justify-center pb-8">
        <img src="/BSA_Logo.webp" alt="BSA Logo" className="h-10 w-auto opacity-40" />
      </div>
      </AnimateMain>
    </div>
  );
};

export default ReservationSuccess;

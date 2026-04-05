import { Link, useSearchParams } from 'react-router-dom';
import { AnimateMain } from '../components/AnimateMain';
import HeaderProfileMenu from '../components/HeaderProfileMenu';
import { useEffect, useState, useRef } from 'react';

const Success = () => {
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action') || 'checkout';
  const count = parseInt(searchParams.get('count')) || 0;
  // Removed complex logo sizing - using fixed 150px height
  
  const [animate, setAnimate] = useState(false);

  // Reset scroll position when component mounts
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo(0, 0);
    };
    requestAnimationFrame(scrollToTop);
    // Trigger bounce animation shortly after mount
    const t = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Removed complex logo sizing calculations - using fixed 150px height
  
  const isCheckin = action === 'checkin';
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <div className="header">
        <div className="h-10 w-10 shrink-0" aria-hidden />
        <h1 className="flex-1 text-center">{isCheckin ? 'Check-in Complete!' : 'Checkout Complete!'}</h1>
        <HeaderProfileMenu />
      </div>

      <AnimateMain className="flex-1">
      <div className="px-5 py-12">
        <div className="text-center">
          <div
            className="text-7xl mb-6 inline-block transition-transform duration-500 ease-out"
            style={{
              transform: animate ? 'scale(1)' : 'scale(0)',
              animation: animate ? 'successBounce 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) forwards' : 'none'
            }}
          >
            ✅
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {isCheckin ? 'All checked in!' : 'All checked out!'}
          </h2>
          <p className="text-gray-500 text-lg mb-6">
            {isCheckin
              ? `${count} ${count === 1 ? 'item' : 'items'} returned`
              : `${count} ${count === 1 ? 'item' : 'items'} ready to go`
            }
          </p>
          
          <div className="space-y-3">
            <Link
              to="/home"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-full p-4 text-center touch-target bg-scout-blue/12 border border-scout-blue/20 text-scout-blue shadow-xs hover:bg-scout-blue/18 no-underline"
            >
              🏠 Return to Home
            </Link>
          </div>
        </div>
        
        {/* Troop 222 Logo - Fixed 150px height */}
        <div className="mt-8 sm:mt-12 lg:mt-16 flex justify-center">
          <img 
            src="/Troop%20222%20Logo.webp" 
            alt="Troop 222 Logo" 
            className="h-36 w-auto object-contain"
            style={{ height: '150px' }}
          />
        </div>
      </div>
      </AnimateMain>
    </div>
  );
};

export default Success;

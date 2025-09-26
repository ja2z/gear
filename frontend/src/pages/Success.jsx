import { Link, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

const Success = () => {
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action') || 'checkout';
  const count = parseInt(searchParams.get('count')) || 0;
  
  // Reset scroll position when component mounts
  useEffect(() => {
    // Scroll to top when navigating to success page
    // Use requestAnimationFrame to ensure this happens after the DOM is fully updated
    const scrollToTop = () => {
      window.scrollTo(0, 0);
    };
    
    requestAnimationFrame(scrollToTop);
  }, []);
  
  const isCheckin = action === 'checkin';
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="header">
        <h1>{isCheckin ? 'Check-in Complete!' : 'Checkout Complete!'}</h1>
      </div>

      <div className="px-5 py-12">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isCheckin ? 'Success!' : 'Success!'}
          </h2>
          <p className="text-gray-600 mb-6">
            {isCheckin 
              ? `You checked in ${count} ${count === 1 ? 'item' : 'items'}`
              : `You checked out ${count} ${count === 1 ? 'item' : 'items'}`
            }
          </p>
          
          <div className="space-y-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-full p-4 text-center touch-target bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 no-underline"
            >
              🏠 Return to Home
            </Link>
          </div>
        </div>
        
        {/* Troop 222 Logo - 50px below Return to Home button */}
        <div className="mt-16 flex justify-center">
          <img 
            src="/Troop%20222%20Logo.webp" 
            alt="Troop 222 Logo" 
            className="max-w-xs w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default Success;

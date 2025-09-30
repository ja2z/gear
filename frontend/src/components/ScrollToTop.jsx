import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Ensure scroll restoration stays manual
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Force scroll past sticky header position and back to trigger proper positioning
    window.scrollTo(0, 1);
    
    // iOS double RAF to scroll back to actual top
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    });
  }, [pathname]);

  return null;
}

export default ScrollToTop;
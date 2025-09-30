import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Ensure scroll restoration stays manual
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    // Reset scroll on navigation
    window.scrollTo(0, 0);

    // iOS double RAF for reliability
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo(0, 0);
      });
    });
  }, [pathname]);

  return null;
}

export default ScrollToTop;

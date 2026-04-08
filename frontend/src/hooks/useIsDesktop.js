import { useState, useEffect } from 'react';

const MQ = '(min-width: 1024px)';

export default function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(MQ).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(MQ);
    const handler = (e) => setIsDesktop(e.matches);
    // Safari < 14: MediaQueryList has addListener/removeListener, not addEventListener
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  return isDesktop;
}

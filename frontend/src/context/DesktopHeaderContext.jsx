import { createContext, useContext, useEffect, useRef } from 'react';

const DesktopHeaderContext = createContext(null);

/**
 * Pages call this to set the desktop shell header title, subtitle, and optional
 * right-hand actions. On mobile (context is null) it's a no-op.
 *
 * @param {{ title?: string, subtitle?: string, headerRight?: React.ReactNode }} meta
 */
export function useDesktopHeader(meta) {
  const setter = useContext(DesktopHeaderContext);
  const prev = useRef(meta);
  prev.current = meta;

  useEffect(() => {
    if (setter) setter(prev.current);
  }, [setter, meta.title, meta.subtitle, meta.headerRight]);
}

export default DesktopHeaderContext;

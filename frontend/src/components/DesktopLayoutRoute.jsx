import { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import useIsDesktop from '../hooks/useIsDesktop';
import DesktopHeaderContext from '../context/DesktopHeaderContext';
import DesktopShell from './DesktopShell';

export default function DesktopLayoutRoute() {
  const isDesktop = useIsDesktop();
  const [meta, setMeta] = useState({ title: '', subtitle: '', headerRight: null });

  const updateMeta = useCallback((m) => {
    setMeta((prev) => {
      if (
        prev.title === m.title &&
        prev.subtitle === m.subtitle &&
        prev.headerRight === m.headerRight
      ) {
        return prev;
      }
      return m;
    });
  }, []);

  if (!isDesktop) {
    return (
      <DesktopHeaderContext.Provider value={null}>
        <Outlet />
      </DesktopHeaderContext.Provider>
    );
  }

  return (
    <DesktopHeaderContext.Provider value={updateMeta}>
      <DesktopShell
        title={meta.title}
        subtitle={meta.subtitle}
        headerRight={meta.headerRight}
      >
        <Outlet />
      </DesktopShell>
    </DesktopHeaderContext.Provider>
  );
}

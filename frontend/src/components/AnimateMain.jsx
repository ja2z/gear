import { useLocation } from 'react-router-dom';

/**
 * Wraps the scrollable/main area below a page header. Re-mounts on route
 * change so the main content fades/slides in; keep headers outside this wrapper.
 */
export function AnimateMain({ children, className = '' }) {
  const { pathname, search } = useLocation();
  const routeKey = `${pathname}${search}`;
  return (
    <div key={routeKey} className={`page-main-animate ${className}`.trim()}>
      {children}
    </div>
  );
}

/**
 * Wrap content that updates when a SegmentedControl (or tab) value changes.
 * Parent should pass key={segmentValue} on this component so it remounts and
 * runs the same page-main-in animation as AnimateMain.
 */
export function SegmentSwitchAnimate({ children, className = '' }) {
  return <div className={`page-main-animate ${className}`.trim()}>{children}</div>;
}

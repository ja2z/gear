/**
 * Single-row top bar: [BSA logo | center | right slot].
 * Right slot is the second logo (sign-in) or avatar + Sign out (home) — same min-height everywhere.
 * Uses a 3-column grid so side icons align to the padded viewport edges on any width (no max-width inset).
 * @param {{ center: React.ReactNode, cornerRight?: React.ReactNode, contentClassName?: string }} props
 */
const logoClass = 'h-9 w-auto shrink-0 sm:h-10';

/**
 * Match main content gutters (e.g. HomePage `px-3 sm:px-5`), with safe-area as minimum.
 * Slightly more inset than bare 0.75rem so BSA + avatar align with tiles/hero below.
 */
const edgePadding =
  'pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:pl-[max(1.25rem,env(safe-area-inset-left))] sm:pr-[max(1.25rem,env(safe-area-inset-right))]';

const headerInnerClass = `mx-auto grid w-full max-w-none grid-cols-[auto_1fr_auto] items-center gap-2 ${edgePadding} py-3 min-h-[3.75rem] sm:min-h-16 sm:gap-3 sm:py-3.5`;

const TroopBrandHeader = ({ center, cornerRight, contentClassName }) => {
  const innerClass = contentClassName ?? headerInnerClass;

  return (
    <div className="bg-scout-blue/6 border-b border-scout-blue/10 text-gray-900 shrink-0">
      <div className={innerClass}>
        <div className="flex min-w-0 justify-start">
          <img src="/BSA_Logo.webp" alt="" className={logoClass} />
        </div>

        <div className="min-w-0 self-center px-1 text-center sm:px-2">{center}</div>

        <div className="flex min-w-0 items-center justify-end">
          {cornerRight ? (
            <div className="flex items-center gap-1.5 sm:gap-2">{cornerRight}</div>
          ) : (
            <img src="/BSA_Logo.webp" alt="" className={logoClass} />
          )}
        </div>
      </div>
    </div>
  );
};

export default TroopBrandHeader;

/**
 * Single-row top bar: [BSA logo | center | right slot].
 * Right slot is the second logo (sign-in) or avatar + Sign out (home) — same min-height everywhere.
 * @param {{ center: React.ReactNode, cornerRight?: React.ReactNode, wide?: boolean, contentClassName?: string }} props
 */
const logoClass = 'h-9 w-auto shrink-0 sm:h-10';

const defaultInner =
  'mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-3 min-h-[3.75rem] sm:min-h-16 sm:gap-3 sm:px-5 sm:py-3.5';

/** When `wide`, keep phone-width bar on small screens; expand to full width on lg+ (troop hub dashboard). */
const wideInner =
  'mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-3 min-h-[3.75rem] sm:min-h-16 sm:gap-3 sm:px-5 sm:py-3.5 lg:max-w-none lg:gap-4 lg:px-10 lg:py-3.5 xl:px-12';

const TroopBrandHeader = ({ center, cornerRight, wide = false, contentClassName }) => {
  const innerClass = contentClassName ?? (wide ? wideInner : defaultInner);

  return (
  <div className="bg-scout-blue/6 border-b border-scout-blue/10 text-gray-900 shrink-0">
    <div className={innerClass}>
      <div className="flex w-24 shrink-0 justify-start">
        <img src="/BSA_Logo.webp" alt="" className={logoClass} />
      </div>

      <div className="min-w-0 flex-1 self-center text-center px-1 sm:px-2">{center}</div>

      <div
        className={`flex shrink-0 items-center justify-end ${
          cornerRight ? 'min-w-[7rem] max-w-[40%]' : 'w-24'
        }`}
      >
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

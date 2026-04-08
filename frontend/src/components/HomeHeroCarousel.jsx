import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import ImagePreloader from './ImagePreloader';
import {
  getRandomHomeImageSubset,
  getOptimizedEntriesForPaths,
  getHeroSlideImageUrl,
} from '../utils/imageRotation';
import { getHeroBackgroundPosition, HERO_COVER_RELAX_FACTOR } from '../utils/heroCrop';

const SWIPE_MIN_PX = 48;

const SLIDE_TRANSITION =
  'transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none motion-reduce:duration-0';

/**
 * @param {object} props
 * @param {string} [props.className]
 * @param {'page' | 'hub'} [props.variant] — `hub`: nav z-index above UpcomingEvents
 */
export default function HomeHeroCarousel({ className = '', variant = 'page' }) {
  const isHub = variant === 'hub';

  const imagePaths = useMemo(() => getRandomHomeImageSubset(), []);
  const [index, setIndex] = useState(() =>
    Math.floor(Math.random() * Math.max(1, imagePaths.length))
  );

  const heroRelaxPct = `${HERO_COVER_RELAX_FACTOR * 100}%`;
  const n = imagePaths.length;
  const showNav = n > 1;

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + n) % n);
  }, [n]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % n);
  }, [n]);

  const regionRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const onTouchStart = useCallback((e) => {
    if (!showNav) return;
    const t = e.targetTouches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  }, [showNav]);

  const onTouchEnd = useCallback(
    (e) => {
      if (!showNav) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      if (Math.abs(dx) < SWIPE_MIN_PX) return;
      if (Math.abs(dx) < Math.abs(dy)) return;
      if (dx > 0) goPrev();
      else goNext();
    },
    [showNav, goPrev, goNext]
  );

  useEffect(() => {
    const el = regionRef.current;
    if (!el || !showNav) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, showNav]);

  const preloadEntries = useMemo(
    () => getOptimizedEntriesForPaths(imagePaths),
    [imagePaths]
  );

  const navZ = isHub ? 'z-[35]' : 'z-20';

  const trackTransform =
    n > 0 ? `translateX(-${(index * 100) / n}%)` : 'translateX(0)';

  return (
    <>
      {preloadEntries.length > 0 && <ImagePreloader images={preloadEntries} />}

      <div
        ref={regionRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Troop photos. Swipe left or right to change photo."
        tabIndex={showNav ? 0 : undefined}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`relative min-h-0 overflow-hidden outline-none focus-visible:outline-none ${
          isHub ? 'h-full w-full' : 'flex-1 min-h-0 w-full'
        } ${className}`.trim()}
      >
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          style={{
            width: heroRelaxPct,
            height: heroRelaxPct,
            minWidth: heroRelaxPct,
            minHeight: heroRelaxPct,
          }}
        >
          <div
            className={`flex h-full ${SLIDE_TRANSITION}`}
            style={{
              width: `${n * 100}%`,
              transform: trackTransform,
            }}
          >
            {imagePaths.map((path, i) => (
              <div
                key={`${path}-${i}`}
                className="h-full shrink-0 grow-0"
                style={{
                  flex: `0 0 ${100 / n}%`,
                  backgroundImage: `url(${getHeroSlideImageUrl(path)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: getHeroBackgroundPosition(path),
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: '#1E398A',
                }}
              />
            ))}
          </div>
        </div>

        {!isHub && (
          <div className="pointer-events-none absolute bottom-0 inset-x-0 z-[1] h-20 bg-gradient-to-b from-transparent to-white sm:h-24" />
        )}

        {showNav && (
          <div
            className={`pointer-events-none absolute bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-0.5 sm:bottom-1.5 ${navZ}`}
            role="group"
            aria-label="Choose photo"
          >
            {imagePaths.map((_, i) => {
              const active = i === index;
              return (
                <button
                  key={i}
                  type="button"
                  aria-label={`Photo ${i + 1} of ${n}`}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => setIndex(i)}
                  className="pointer-events-auto flex min-h-[28px] min-w-[14px] items-center justify-center rounded-full px-0.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  <span
                    className={`block shrink-0 rounded-full transition-[width,background-color] duration-200 ${
                      active
                        ? 'h-[3px] w-[14px] bg-white'
                        : 'h-[3px] w-[3px] bg-white/45 hover:bg-white/65'
                    }`}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          Photo {index + 1} of {n}
        </span>
      </div>
    </>
  );
}

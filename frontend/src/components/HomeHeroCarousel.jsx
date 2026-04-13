import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  getRandomHomeImageSubset,
  getHeroSlideImageUrl,
} from '../utils/imageRotation';
import { getHeroBackgroundPosition, HERO_COVER_RELAX_FACTOR } from '../utils/heroCrop';

const SWIPE_MIN_PX = 48;
const WHEEL_THRESHOLD = 28;
/** Auto-advance interval on the home hero (front page / hub). */
const AUTO_ADVANCE_MS = 5000;

const CENTER = -100 / 3;
const NEXT_OFFSET = -200 / 3;
const PREV_OFFSET = 0;

/**
 * Three-panel sliding window carousel.
 *
 * Track is 300% wide: [prev | current | next], each 33.33%.
 * Default translate: -33.33% (showing center panel).
 * Next: animate to -66.67%, transitionend snaps back to -33.33% with shifted index.
 * Prev: animate to 0%, transitionend snaps back to -33.33% with shifted index.
 * Wrap (last↔first) is identical — (i+1)%n naturally wraps.
 */
export default function HomeHeroCarousel({ className = '', variant = 'page' }) {
  const isHub = variant === 'hub';

  const imagePaths = useMemo(() => getRandomHomeImageSubset(), []);
  const n = imagePaths.length;
  const showNav = n > 1;

  const [logicalIndex, setLogicalIndex] = useState(() =>
    n <= 1 ? 0 : Math.floor(Math.random() * n)
  );
  /** Bumped on manual navigation so autoplay restarts before `logicalIndex` updates (e.g. mid-swipe). */
  const [autoplayEpoch, setAutoplayEpoch] = useState(0);
  const [offset, setOffset] = useState(CENTER);
  const [animate, setAnimate] = useState(false);

  const bumpAutoplayEpoch = useCallback(() => {
    setAutoplayEpoch((x) => x + 1);
  }, []);

  const slidingRef = useRef(false);
  const regionRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0 });

  const prevIdx = (logicalIndex - 1 + n) % n;
  const nextIdx = (logicalIndex + 1) % n;

  const goNext = useCallback(() => {
    if (n <= 1 || slidingRef.current) return;
    slidingRef.current = true;
    setAnimate(true);
    setOffset(NEXT_OFFSET);
  }, [n]);

  const goPrev = useCallback(() => {
    if (n <= 1 || slidingRef.current) return;
    slidingRef.current = true;
    setAnimate(true);
    setOffset(PREV_OFFSET);
  }, [n]);

  const handleTransitionEnd = useCallback(
    (e) => {
      if (e.propertyName !== 'transform') return;
      if (e.target !== e.currentTarget) return;

      if (offset === NEXT_OFFSET) {
        setLogicalIndex((i) => (i + 1) % n);
      } else if (offset === PREV_OFFSET) {
        setLogicalIndex((i) => (i - 1 + n) % n);
      }
      setAnimate(false);
      setOffset(CENTER);
      slidingRef.current = false;
    },
    [n, offset]
  );

  const goToLogical = useCallback(
    (target) => {
      if (n <= 1 || target === logicalIndex) return;
      bumpAutoplayEpoch();
      slidingRef.current = false;
      setAnimate(false);
      setLogicalIndex(target);
      setOffset(CENTER);
    },
    [n, logicalIndex, bumpAutoplayEpoch]
  );

  const onPointerDown = useCallback(
    (e) => {
      if (!showNav) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target instanceof Element && e.target.closest('button')) return;
      dragRef.current = { active: true, startX: e.clientX, startY: e.clientY };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [showNav]
  );

  const onPointerUp = useCallback(
    (e) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) < SWIPE_MIN_PX) return;
      if (Math.abs(dx) < Math.abs(dy)) return;
      bumpAutoplayEpoch();
      if (dx > 0) goPrev();
      else goNext();
    },
    [goPrev, goNext, bumpAutoplayEpoch]
  );

  const onPointerCancel = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  useEffect(() => {
    const el = regionRef.current;
    if (!el || !showNav) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        bumpAutoplayEpoch();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        bumpAutoplayEpoch();
        goNext();
      }
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, showNav, bumpAutoplayEpoch]);

  useEffect(() => {
    const el = regionRef.current;
    if (!el || !showNav) return;
    const onWheel = (e) => {
      let delta = 0;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        delta = e.deltaX;
      } else if (e.shiftKey) {
        delta = e.deltaY;
      }
      if (Math.abs(delta) < WHEEL_THRESHOLD) return;
      e.preventDefault();
      bumpAutoplayEpoch();
      if (delta > 0) goNext();
      else goPrev();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [goNext, goPrev, showNav, bumpAutoplayEpoch]);

  /** Advance automatically; reset on slide change, manual swipe, dots, keys, wheel; pause when tab hidden. */
  useEffect(() => {
    if (!showNav || n <= 1) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let intervalId;
    const arm = () => {
      clearInterval(intervalId);
      intervalId = window.setInterval(() => goNext(), AUTO_ADVANCE_MS);
    };

    const onVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        arm();
      }
    };

    arm();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [showNav, n, goNext, logicalIndex, autoplayEpoch]);

  /** Pre-decode images 2 steps away so they're ready when they enter the three-panel window */
  useEffect(() => {
    if (n <= 2) return;
    const paths = [
      imagePaths[(logicalIndex + 2) % n],
      imagePaths[(logicalIndex - 2 + n) % n],
    ];
    paths.forEach((p) => {
      const img = new Image();
      img.src = getHeroSlideImageUrl(p);
      img.decode().catch(() => {});
    });
  }, [logicalIndex, imagePaths, n]);

  const navZ = isHub ? 'z-[35]' : 'z-20';
  const heroRelaxPct = `${HERO_COVER_RELAX_FACTOR * 100}%`;

  const trackTransform = `translate3d(${offset}%, 0, 0)`;
  const trackTransitionClass = animate
    ? 'transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none'
    : 'transition-none';

  const panelIndices = n <= 1 ? [0] : [prevIdx, logicalIndex, nextIdx];

  return (
    <div
      ref={regionRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Troop photos"
      tabIndex={showNav ? 0 : undefined}
      className={`relative min-h-0 overflow-hidden bg-scout-blue outline-none focus-visible:outline-none ${
        isHub ? 'h-full w-full' : 'flex-1 min-h-0 w-full'
      } ${className}`.trim()}
    >
      <div
        className="absolute left-1/2 top-1/2 isolate -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-scout-blue select-none"
        style={{
          width: heroRelaxPct,
          height: heroRelaxPct,
          minWidth: heroRelaxPct,
          minHeight: heroRelaxPct,
        }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          className={`flex h-full min-w-0 gap-0 bg-scout-blue ${trackTransitionClass}`}
          style={{
            width: n <= 1 ? '100%' : '300%',
            transform: n <= 1 ? 'none' : trackTransform,
            backfaceVisibility: 'hidden',
          }}
          onTransitionEnd={n > 1 ? handleTransitionEnd : undefined}
        >
          {panelIndices.map((idx, slot) => (
            <div
              key={`panel-${slot}`}
              className="relative h-full min-h-0 min-w-0 shrink-0 overflow-hidden"
              style={{
                flex: n <= 1 ? '0 0 100%' : '0 0 calc(100% / 3)',
                backfaceVisibility: 'hidden',
              }}
            >
              <img
                src={getHeroSlideImageUrl(imagePaths[idx])}
                alt=""
                draggable={false}
                decoding="auto"
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: getHeroBackgroundPosition(imagePaths[idx]) }}
              />
            </div>
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
            const active = i === logicalIndex;
            return (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1} of ${n}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => goToLogical(i)}
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
        Photo {logicalIndex + 1} of {n}
      </span>
    </div>
  );
}

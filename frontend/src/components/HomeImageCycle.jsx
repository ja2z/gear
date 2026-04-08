import { useState } from 'react';
import ImagePreloader from './ImagePreloader';
import { getRandomHomeImage } from '../utils/imageRotation';
import { useOptimizedImage } from '../hooks/useOptimizedImage';
import { getHeroBackgroundPosition, HERO_COVER_RELAX_FACTOR } from '../utils/heroCrop';

/**
 * Same photo pipeline as the gear landing page (Landing.jsx): one random hero image
 * per visit, stable for the session, with LQIP/WebP via useOptimizedImage.
 * Crop focal comes from build-time saliency (see pregenImages.js) + optional overrides.
 * Pass className to fill a parent (e.g. absolute inset-0).
 */
const HomeImageCycle = ({ className = '' }) => {
  const [selectedImagePath] = useState(() => getRandomHomeImage());
  const { currentImage, imageData } = useOptimizedImage(selectedImagePath);
  const bgPos = getHeroBackgroundPosition(selectedImagePath);
  const relaxPct = `${HERO_COVER_RELAX_FACTOR * 100}%`;

  return (
    <>
      {imageData && <ImagePreloader images={[imageData]} />}

      <div
        className={`relative h-full min-h-[140px] w-full overflow-hidden rounded-2xl bg-scout-blue shadow-sm ${className}`}
        role="img"
        aria-label="Troop photos"
      >
        {/* Slightly oversized bg layer (clipped) softens cover’s tight crop */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: relaxPct,
            height: relaxPct,
            minWidth: relaxPct,
            minHeight: relaxPct,
            backgroundImage: currentImage
              ? `url(${currentImage})`
              : 'linear-gradient(to bottom, #1E398A, #0f1f5c)',
            backgroundSize: 'cover',
            backgroundPosition: bgPos,
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#1E398A',
          }}
        />
        {/* Light bottom wash — translucent event cards still need a bit of contrast */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[48%] bg-gradient-to-t from-black/35 via-black/10 to-transparent"
          aria-hidden
        />
      </div>
    </>
  );
};

export default HomeImageCycle;

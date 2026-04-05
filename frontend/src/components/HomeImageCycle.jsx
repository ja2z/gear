import { useState } from 'react';
import ImagePreloader from './ImagePreloader';
import { getRandomHomeImage } from '../utils/imageRotation';
import { useOptimizedImage } from '../hooks/useOptimizedImage';

/**
 * Same photo pipeline as the gear landing page (Landing.jsx): one random hero image
 * per visit, stable for the session, with LQIP/WebP via useOptimizedImage.
 * Pass className to fill a parent (e.g. absolute inset-0).
 */
const HomeImageCycle = ({ className = '' }) => {
  const [selectedImagePath] = useState(() => getRandomHomeImage());
  const { currentImage, imageData } = useOptimizedImage(selectedImagePath);

  return (
    <>
      {imageData && <ImagePreloader images={[imageData]} />}

      <div
        className={`relative h-full min-h-[140px] w-full overflow-hidden rounded-2xl bg-scout-blue shadow-sm ${className}`}
        role="img"
        aria-label="Troop photos"
        style={{
          backgroundImage: currentImage
            ? `url(${currentImage})`
            : 'linear-gradient(to bottom, #1E398A, #0f1f5c)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#1E398A',
        }}
      >
        {/* Light bottom wash — translucent event cards still need a bit of contrast */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black/35 via-black/10 to-transparent"
          aria-hidden
        />
      </div>
    </>
  );
};

export default HomeImageCycle;

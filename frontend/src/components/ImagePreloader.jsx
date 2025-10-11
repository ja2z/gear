import { useEffect } from 'react';
import { getImageLoadingStrategy } from '../utils/mobileDetection';

/**
 * Component for preloading hero images in the document head
 * This provides instant visual feedback by preloading both LQIP and full images
 */
const ImagePreloader = ({ images }) => {
  useEffect(() => {
    if (!images || images.length === 0) return;

    const strategy = getImageLoadingStrategy();
    const preloadLinks = [];

    images.forEach(imageData => {
      // Preload LQIP with highest priority for instant display
      if (strategy.useLQIP && imageData.lqip) {
        const lqipLink = document.createElement('link');
        lqipLink.rel = 'preload';
        lqipLink.as = 'image';
        lqipLink.href = imageData.lqip;
        lqipLink.setAttribute('fetchpriority', 'high');
        document.head.appendChild(lqipLink);
        preloadLinks.push(lqipLink);
      }

      // Also preload the full-quality image (WebP if supported, otherwise original)
      const fullImagePath = strategy.useWebP && imageData.webp ? imageData.webp : imageData.original;
      if (fullImagePath) {
        const fullLink = document.createElement('link');
        fullLink.rel = 'preload';
        fullLink.as = 'image';
        fullLink.href = fullImagePath;
        // Lower priority than LQIP so LQIP loads first
        fullLink.setAttribute('fetchpriority', 'auto');
        document.head.appendChild(fullLink);
        preloadLinks.push(fullLink);
      }
    });

    // Cleanup function to remove preload links when component unmounts
    return () => {
      preloadLinks.forEach(link => {
        if (link.parentNode === document.head) {
          document.head.removeChild(link);
        }
      });
    };
  }, [images]);

  return null; // This component doesn't render anything
};

export default ImagePreloader;

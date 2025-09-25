import { useEffect } from 'react';

/**
 * Component for preloading LQIP images in the document head
 * This provides instant visual feedback while the full image loads
 */
const ImagePreloader = ({ images }) => {
  useEffect(() => {
    if (!images || images.length === 0) return;

    // Add preload links for LQIP images
    images.forEach(imageData => {
      if (imageData.lqip) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = imageData.lqip;
        link.setAttribute('fetchpriority', 'high');
        document.head.appendChild(link);
      }
    });

    // Cleanup function to remove preload links when component unmounts
    return () => {
      const preloadLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
      preloadLinks.forEach(link => {
        if (images.some(img => img.lqip === link.href)) {
          document.head.removeChild(link);
        }
      });
    };
  }, [images]);

  return null; // This component doesn't render anything
};

export default ImagePreloader;

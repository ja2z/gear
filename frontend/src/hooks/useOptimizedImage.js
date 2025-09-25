import { useState, useEffect } from 'react';
import { getImageLoadingStrategy, isMobileDevice, supportsWebP } from '../utils/mobileDetection';

/**
 * Custom hook for optimized image loading with LQIP and WebP support
 * @param {string} originalImagePath - Path to the original image
 * @returns {object} Image loading state and optimized image data
 */
export const useOptimizedImage = (originalImagePath) => {
  const [imageData, setImageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);

  useEffect(() => {
    const loadOptimizedImage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Import the optimized image data (this will be generated during build)
        let optimizedData = null;
        try {
          const optimizedModule = await import('../utils/optimizedImageList.js');
          optimizedData = optimizedModule.getImageData(originalImagePath);
        } catch (error) {
          console.warn('Optimized image list not available, using original image');
        }

        if (!optimizedData) {
          // Fallback to original image if no optimized version exists
          setImageData({
            original: originalImagePath,
            webp: originalImagePath,
            lqip: null
          });
          setCurrentImage(originalImagePath);
          setIsLoading(false);
          return;
        }

        setImageData(optimizedData);

        // Determine loading strategy based on device capabilities
        const strategy = getImageLoadingStrategy();
        
        if (strategy.useLQIP && optimizedData.lqip) {
          // Load LQIP first for instant feedback
          setCurrentImage(optimizedData.lqip);
          
          // Then load the full quality image
          const fullImage = strategy.useWebP ? optimizedData.webp : optimizedData.original;
          
          // Preload the full image
          const img = new Image();
          img.onload = () => {
            setCurrentImage(fullImage);
            setIsLoading(false);
          };
          img.onerror = () => {
            // Fallback to original if WebP fails
            if (strategy.useWebP) {
              const fallbackImg = new Image();
              fallbackImg.onload = () => {
                setCurrentImage(optimizedData.original);
                setIsLoading(false);
              };
              fallbackImg.onerror = () => {
                setError('Failed to load image');
                setIsLoading(false);
              };
              fallbackImg.src = optimizedData.original;
            } else {
              setError('Failed to load image');
              setIsLoading(false);
            }
          };
          img.src = fullImage;
        } else {
          // Load directly without LQIP
          const imageToLoad = strategy.useWebP ? optimizedData.webp : optimizedData.original;
          const img = new Image();
          img.onload = () => {
            setCurrentImage(imageToLoad);
            setIsLoading(false);
          };
          img.onerror = () => {
            // Fallback to original if WebP fails
            if (strategy.useWebP) {
              const fallbackImg = new Image();
              fallbackImg.onload = () => {
                setCurrentImage(optimizedData.original);
                setIsLoading(false);
              };
              fallbackImg.onerror = () => {
                setError('Failed to load image');
                setIsLoading(false);
              };
              fallbackImg.src = optimizedData.original;
            } else {
              setError('Failed to load image');
              setIsLoading(false);
            }
          };
          img.src = imageToLoad;
        }

      } catch (err) {
        console.error('Error loading optimized image:', err);
        setError('Failed to load image');
        setCurrentImage(originalImagePath); // Fallback to original
        setIsLoading(false);
      }
    };

    if (originalImagePath) {
      loadOptimizedImage();
    }
  }, [originalImagePath]);

  return {
    currentImage,
    imageData,
    isLoading,
    error,
    isMobile: isMobileDevice(),
    supportsWebP: supportsWebP()
  };
};

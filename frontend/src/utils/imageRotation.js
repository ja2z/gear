import { OPTIMIZED_IMAGES } from './optimizedImageList.js';

export const getRandomHomeImage = () => {
  if (OPTIMIZED_IMAGES.length === 0) return '/images/bwca_home.png';
  return OPTIMIZED_IMAGES[Math.floor(Math.random() * OPTIMIZED_IMAGES.length)].original;
};

export const getAllOptimizedImageData = () => OPTIMIZED_IMAGES;

export const getAllHomeImages = () => OPTIMIZED_IMAGES.map(img => img.original);

export const getImageCount = () => OPTIMIZED_IMAGES.length;

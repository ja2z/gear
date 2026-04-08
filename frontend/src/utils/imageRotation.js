import { OPTIMIZED_IMAGES, getImageData } from './optimizedImageList.js';

/** URL for hero slide backgrounds (WebP when available; HEIC originals use generated WebP). */
export function getHeroSlideImageUrl(path) {
  const d = getImageData(path);
  if (!d) return path;
  const ext = d.original?.split('.').pop()?.toLowerCase();
  if (ext === 'heic' || ext === 'heif') return d.webp;
  return d.webp || d.original;
}

/** How many photos the home carousel shows per visit (random subset; keeps dot count small). */
export const HOME_CAROUSEL_BATCH_SIZE = 20;

export const getRandomHomeImage = () => {
  if (OPTIMIZED_IMAGES.length === 0) return '/images/bwca_home.png';
  return OPTIMIZED_IMAGES[Math.floor(Math.random() * OPTIMIZED_IMAGES.length)].original;
};

export const getAllOptimizedImageData = () => OPTIMIZED_IMAGES;

export const getAllHomeImages = () => OPTIMIZED_IMAGES.map(img => img.original);

export const getImageCount = () => OPTIMIZED_IMAGES.length;

function shuffleInPlace(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Random subset of gallery images for the home hero carousel.
 * New shuffle each call — use once per carousel mount so each homepage visit gets a fresh batch.
 */
export function getRandomHomeImageSubset(maxCount = HOME_CAROUSEL_BATCH_SIZE) {
  if (OPTIMIZED_IMAGES.length === 0) {
    return ['/images/bwca_home.png'];
  }
  const originals = OPTIMIZED_IMAGES.map((img) => img.original);
  if (originals.length <= maxCount) {
    return shuffleInPlace([...originals]);
  }
  return shuffleInPlace([...originals]).slice(0, maxCount);
}

/** Preload payloads for ImagePreloader — only paths that exist in the optimized list. */
export function getOptimizedEntriesForPaths(paths) {
  return paths.map((p) => getImageData(p)).filter(Boolean);
}

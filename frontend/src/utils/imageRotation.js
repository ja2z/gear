// Import the auto-generated list of images
import { HOME_IMAGES } from './imageList.js';

/**
 * Get a random background image for the home page
 * @returns {string} Path to a random image from the discovered images
 */
export const getRandomHomeImage = () => {
  if (HOME_IMAGES.length === 0) {
    // Fallback to a default image if no images are found
    return '/images/bwca_home.png';
  }
  
  const randomIndex = Math.floor(Math.random() * HOME_IMAGES.length);
  return HOME_IMAGES[randomIndex];
};

/**
 * Get all available home page images
 * @returns {string[]} Array of all image paths
 */
export const getAllHomeImages = () => {
  return [...HOME_IMAGES];
};

/**
 * Get the count of available images
 * @returns {number} Number of available images
 */
export const getImageCount = () => {
  return HOME_IMAGES.length;
};

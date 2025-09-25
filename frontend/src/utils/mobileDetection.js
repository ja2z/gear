/**
 * Mobile device detection utilities
 * Provides methods to detect mobile devices and optimize image loading accordingly
 */

/**
 * Check if the current device is mobile based on user agent and screen size
 * @returns {boolean} True if device is considered mobile
 */
export const isMobileDevice = () => {
  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  const isMobileUA = mobileRegex.test(userAgent);
  
  // Check screen size (mobile typically < 768px width)
  const isMobileScreen = window.innerWidth < 768;
  
  // Check for touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Consider it mobile if it matches user agent OR (small screen AND touch capable)
  return isMobileUA || (isMobileScreen && isTouchDevice);
};

/**
 * Check if the device supports WebP format
 * @returns {boolean} True if WebP is supported
 */
export const supportsWebP = () => {
  // Create a canvas element to test WebP support
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  // Try to encode as WebP
  const webpDataURL = canvas.toDataURL('image/webp');
  return webpDataURL.indexOf('data:image/webp') === 0;
};

/**
 * Get the optimal image format for the current device
 * @returns {string} 'webp' if supported and mobile, 'original' otherwise
 */
export const getOptimalImageFormat = () => {
  if (isMobileDevice() && supportsWebP()) {
    return 'webp';
  }
  return 'original';
};

/**
 * Check if the device has a slow connection
 * @returns {boolean} True if connection is considered slow
 */
export const isSlowConnection = () => {
  // Check for slow connection indicators
  if ('connection' in navigator) {
    const connection = navigator.connection;
    const slowConnections = ['slow-2g', '2g', '3g'];
    return slowConnections.includes(connection.effectiveType);
  }
  
  // Fallback: assume slow if mobile (conservative approach)
  return isMobileDevice();
};

/**
 * Get image loading strategy based on device capabilities
 * @returns {object} Loading strategy configuration
 */
export const getImageLoadingStrategy = () => {
  const isMobile = isMobileDevice();
  const supportsWebPFormat = supportsWebP();
  const isSlow = isSlowConnection();
  
  return {
    useWebP: isMobile && supportsWebPFormat,
    useLQIP: isMobile || isSlow,
    preloadLQIP: isMobile || isSlow,
    lazyLoad: !isMobile && !isSlow
  };
};

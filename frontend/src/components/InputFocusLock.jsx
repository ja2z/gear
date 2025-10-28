import { useEffect } from 'react';

/**
 * Component to prevent body scrolling when inputs are focused on iOS
 * This fixes the issue where the keyboard opening allows unwanted scrolling
 */
const InputFocusLock = () => {
  useEffect(() => {
    let scrollPosition = 0;

    const handleFocus = (e) => {
      // Only apply to input and textarea elements
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // Save current scroll position
        scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        
        // Add class to prevent body scrolling
        document.body.classList.add('input-focused');
        
        // Lock the scroll position
        document.body.style.top = `-${scrollPosition}px`;
      }
    };

    const handleBlur = (e) => {
      // Only apply to input and textarea elements
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        // Remove the class
        document.body.classList.remove('input-focused');
        
        // Restore scroll position
        document.body.style.top = '';
        window.scrollTo(0, scrollPosition);
      }
    };

    // Add event listeners (using capture phase to catch all inputs)
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    // Cleanup
    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      document.body.classList.remove('input-focused');
      document.body.style.top = '';
    };
  }, []);

  return null; // This component doesn't render anything
};

export default InputFocusLock;


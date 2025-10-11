import { useEffect } from 'react';

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  return (
    <div 
      className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg max-w-md ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
      } text-white text-center`}
    >
      {message}
    </div>
  );
};

export default Toast;


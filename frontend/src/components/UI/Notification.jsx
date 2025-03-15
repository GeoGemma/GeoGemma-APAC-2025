// src/components/UI/Notification.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { getNotificationColor } from '../../utils/mapUtils';

const Notification = ({ message, type = 'info' }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [message]);
  
  const colorClass = getNotificationColor(type);
  
  return (
    <div 
      className={`
        fixed bottom-20 left-1/2 -translate-x-1/2 
        p-3 rounded-md text-white font-medium z-50
        shadow-lg max-w-[80%] text-center
        transition-opacity duration-300
        ${colorClass}
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      {message}
    </div>
  );
};

Notification.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info'])
};

export default Notification;
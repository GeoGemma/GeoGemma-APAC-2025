// src/components/UI/Notification.jsx
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

const Notification = ({ message, type = 'info' }) => {
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [message]);
  
  // Define icon and color based on notification type
  const getNotificationStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle size={20} />,
          bgColor: 'bg-google-green',
          textColor: 'text-background-dark',
          iconColor: 'text-background-dark'
        };
      case 'error':
        return {
          icon: <AlertCircle size={20} />,
          bgColor: 'bg-google-red',
          textColor: 'text-white',
          iconColor: 'text-white'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={20} />,
          bgColor: 'bg-google-yellow',
          textColor: 'text-background-dark',
          iconColor: 'text-background-dark'
        };
      case 'info':
      default:
        return {
          icon: <Info size={20} />,
          bgColor: 'bg-google-blue',
          textColor: 'text-white',
          iconColor: 'text-white'
        };
    }
  };
  
  const { icon, bgColor, textColor, iconColor } = getNotificationStyles();
  
  return (
    <div 
      className={`
        fixed bottom-20 left-1/2 -translate-x-1/2 
        py-2 px-4 rounded-full ${bgColor} ${textColor}
        shadow-lg z-50 elevation-2
        transition-all duration-300 flex items-center
        ${isVisible ? 'opacity-100 transform-none' : 'opacity-0 translate-y-4'}
      `}
    >
      <span className={`mr-2 ${iconColor}`}>{icon}</span>
      <span className="font-roboto font-medium">{message}</span>
    </div>
  );
};

Notification.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info'])
};

export default Notification;
// src/components/UI/StatusIndicator.jsx
import PropTypes from 'prop-types';

const StatusIndicator = ({ message = 'Processing...' }) => {
  return (
    <div className="fixed top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-md z-50 shadow-lg">
      {message}
    </div>
  );
};

StatusIndicator.propTypes = {
  message: PropTypes.string
};

export default StatusIndicator;
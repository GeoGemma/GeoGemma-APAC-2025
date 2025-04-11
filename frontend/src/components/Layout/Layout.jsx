// src/components/Layout/Layout.jsx
import React from 'react';
import PropTypes from 'prop-types';
import TopBar from './TopBar';

const Layout = ({ children, showNotification }) => {
  return (
    <div className="flex flex-col h-screen bg-background-dark text-google-grey-100 overflow-hidden relative font-roboto">
      <TopBar showNotification={showNotification} />
      <div className="flex-1 relative">
        {children}
      </div>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  showNotification: PropTypes.func.isRequired
};

export default Layout;
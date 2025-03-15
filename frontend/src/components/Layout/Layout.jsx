// src/components/Layout/Layout.jsx
import React from 'react';
import PropTypes from 'prop-types';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-background-dark text-white overflow-hidden relative">
      {children}
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired
};

export default Layout;
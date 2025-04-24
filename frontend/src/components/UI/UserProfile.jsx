import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/userProfile.css';

const UserProfile = () => {
  const { currentUser, logout } = useAuth();

  if (!currentUser) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="user-profile">
      <div className="user-profile-info">
        <img 
          src={currentUser.photoURL || 'https://www.gravatar.com/avatar/?d=mp'} 
          alt="Profile" 
          className="user-avatar" 
        />
        <div className="user-details">
          <div className="user-name">{currentUser.displayName || 'User'}</div>
          <div className="user-email">{currentUser.email}</div>
        </div>
      </div>
      <button onClick={handleLogout} className="logout-button">
        Sign Out
      </button>
    </div>
  );
};

export default UserProfile; 
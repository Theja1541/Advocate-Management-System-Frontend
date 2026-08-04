import React, { useState, useEffect } from 'react';
import './GlobalLoader.css';

const GlobalLoader = ({ forceShow = false }) => {
  const [isApiLoading, setIsApiLoading] = useState(false);

  useEffect(() => {
    if (forceShow) return;

    const handleLoader = (e) => {
      setIsApiLoading(e.detail);
    };

    window.addEventListener('globalLoader', handleLoader);
    return () => window.removeEventListener('globalLoader', handleLoader);
  }, [forceShow]);

  if (!forceShow && !isApiLoading) return null;

  return (
    <div className="global-loader-overlay">
      <div className="global-loader-spinner"></div>
    </div>
  );
};

export default GlobalLoader;

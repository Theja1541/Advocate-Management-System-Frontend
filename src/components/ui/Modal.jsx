import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ isOpen, onClose, title, children, className = '', allowFullscreen = false }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsFullscreen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  return createPortal(
    <div className="modal-overlay" onClick={onClose} style={isFullscreen ? { padding: 0 } : {}}>
      <div
        className={`modal-content ${className} ${isFullscreen ? 'fullscreen' : ''}`.trim()}
        onClick={e => e.stopPropagation()}
        style={isFullscreen ? { width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', margin: 0, borderRadius: 0, border: 'none', display: 'flex', flexDirection: 'column' } : {}}
      >
        <div className="modal-h" style={{ flexShrink: 0 }}>
          <h3>{title}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {allowFullscreen && (
              <button 
                type="button" 
                onClick={toggleFullscreen} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                )}
              </button>
            )}
            <button type="button" className="modal-close" onClick={onClose}>&times;</button>
          </div>
        </div>
        <div className="modal-body" style={isFullscreen ? { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' } : {}}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

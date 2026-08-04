import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontWeight: '500',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              animation: 'slideIn 0.25s ease-out forwards',
              pointerEvents: 'auto',
              border: '1px solid var(--border)',
              borderLeft: '4px solid',
              // Dynamic background colors
              backgroundColor: 'var(--card)',
              borderLeftColor: t.type === 'success' ? 'var(--success)' : t.type === 'error' ? 'var(--danger)' : 'var(--primary)',
            }}
          >
            <span style={{ fontSize: '16px' }}>
              {t.type === 'success' ? '✅' : t.type === 'error' ? '⚠️' : 'ℹ️'}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

import React from 'react';

export function FormSection({ title, description, children, className = '' }) {
  return (
    <div className={`form-section ${className}`.trim()} style={{ marginBottom: 'var(--space-5)' }}>
      {(title || description) && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          {title && (
            <h4 style={{ 
              margin: 0, 
              fontFamily: 'var(--font-heading)', 
              fontSize: '16px', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}>
              {title}
            </h4>
          )}
          {description && (
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '13px', 
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              {description}
            </p>
          )}
        </div>
      )}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {children}
      </div>
    </div>
  );
}

export function FormGrid({ children, columns = 2 }) {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: `repeat(auto-fit, minmax(${columns === 2 ? '240px' : '100%'}, 1fr))`, 
      gap: '24px' 
    }}>
      {children}
    </div>
  );
}

export function FormField({ label, required, children, error, helperText }) {
  return (
    <div className="f" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && (
        <label style={{ 
          fontFamily: 'var(--font-sans)', 
          fontSize: '13px', 
          fontWeight: 500, 
          color: '#64748b', 
          marginBottom: '2px', 
          letterSpacing: '-0.01em',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          {label}
          {required && <span style={{ color: 'var(--danger)' }}>*</span>}
        </label>
      )}
      {children}
      {helperText && !error && (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{helperText}</span>
      )}
      {error && (
        <span style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '2px', fontWeight: 500 }}>{error}</span>
      )}
    </div>
  );
}

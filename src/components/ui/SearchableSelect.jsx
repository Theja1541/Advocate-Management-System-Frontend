import React, { useState, useEffect, useRef } from 'react';

export default function SearchableSelect({
  options = [],
  value = '',
  onChange,
  onBlur,
  placeholder = 'Select option...',
  disabled = false,
  loading = false,
  error = '',
  name = '',
  clearable = true,
  _registerProps = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedOption = options.find(opt => String(opt.id) === String(value));

  const filteredOptions = options.filter(opt =>
    (opt.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        if (onBlur) onBlur();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const handleSelect = (option) => {
    onChange({ target: { name, value: option ? option.id : '' } });
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    handleSelect(null);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen) {
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
      } else {
        setIsOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div 
      className={`searchable-select-container ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`} 
      ref={containerRef}
      style={{ position: 'relative', width: '100%' }}
    >
      <div
        className="select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 10px',
          border: error ? '1px solid var(--tape)' : '1px solid var(--rule)',
          borderRadius: '5px',
          background: disabled ? 'var(--panel)' : 'var(--card)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '35px',
          outline: 'none',
        }}
      >
        <span className={!selectedOption ? 'placeholder' : ''} style={{ color: !selectedOption ? 'var(--muted)' : 'var(--ink)', fontSize: '12.5px' }}>
          {loading ? 'Loading...' : (selectedOption ? selectedOption.name : placeholder)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              className="clear-btn"
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {isOpen && (
        <div
          className="select-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            marginTop: '4px',
            border: '1px solid var(--rule)',
            borderRadius: '5px',
            background: 'var(--card)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: '200px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '8px', borderBottom: '1px solid var(--rule-2)', background: 'var(--panel)' }}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid var(--rule)',
                borderRadius: '5px',
                fontSize: '12.5px',
                outline: 'none',
                background: 'var(--card)',
                color: 'var(--ink)',
              }}
            />
          </div>

          <div className="options-list" style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '10px 12px', color: 'var(--muted)', textAlign: 'center', fontSize: '12.5px' }}>Loading...</div>
            ) : filteredOptions.length === 0 ? (
              <div style={{ padding: '10px 12px', color: 'var(--muted)', textAlign: 'center', fontSize: '12.5px' }}>No records found</div>
            ) : (
              filteredOptions.map((opt, index) => (
                <div
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    color: 'var(--ink)',
                    background: String(opt.id) === String(value)
                      ? 'var(--brass-l)'
                      : index === highlightedIndex
                        ? 'var(--panel)'
                        : 'transparent',
                    fontWeight: String(opt.id) === String(value) ? 600 : 400,
                  }}
                >
                  {opt.name}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {error && (
        <span className="field-error" style={{ color: 'var(--tape)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
          {error}
        </span>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAlerts } from '../../services/alertService';

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [searchVal, setSearchVal] = useState('');
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchAlerts = () => {
      getAlerts({ status: 'active' }).then((list) => {
        setActiveAlerts(list);
      }).catch(console.error);
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = activeAlerts.filter(a => !a.isRead).length;
  const avatar = user?.av || (user?.n || '?').split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchVal.trim();
    if (!query) return;

    // Detect if search looks like a section / act query and redirect appropriately
    const isActSearch = /^(bns|bnss|bsa|cpc|tpa|sra|ror|ra|aplg|section|sec\.|s\.)/i.test(query);
    if (isActSearch) {
      navigate(`/acts?search=${encodeURIComponent(query)}`);
    } else {
      navigate(`/cases?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <header>
      <div className="hwrap">
        <div className="logo" style={{ display: 'flex', alignItems: 'center' }}>
          <button 
            onClick={toggleSidebar} 
            className="sb-toggle-btn mobile-only"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
            style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="hright">
          <form className="find" onSubmit={handleSearchSubmit}>
            <button type="submit" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px', color: '#8B95AF' }}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4-4" />
              </svg>
            </button>
            <input 
              id="q" 
              placeholder="Search case no., party, citation, section…" 
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
            />
          </form>
          <div 
            className="bell" 
            title="Notification Center" 
            style={{ cursor: 'pointer', transition: 'background 0.2s', position: 'relative' }}
            ref={dropdownRef}
          >
            <div onClick={() => setShowDropdown(!showDropdown)} style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
              {unreadCount > 0 && <span className="b" id="bc">{unreadCount}</span>}
            </div>

            {showDropdown && (
              <div
                className="dropdown"
                style={{
                  top: '40px',
                  right: 0,
                  width: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--rule)', fontWeight: 600, fontSize: '14px', color: 'var(--fg)' }}>
                  Notifications
                </div>
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {activeAlerts.length > 0 ? (
                    activeAlerts.slice(0, 10).map((a) => (
                      <div
                        key={a.id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--rule)',
                          cursor: 'pointer',
                          backgroundColor: !a.isRead ? 'rgba(var(--brand-rgb), 0.05)' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                        onClick={() => {
                          setShowDropdown(false);
                          navigate('/alerts');
                        }}
                      >
                        <div style={{ fontSize: '13px', fontWeight: !a.isRead ? 600 : 500, color: 'var(--fg)', marginBottom: '4px' }}>
                          {a.alertType ? a.alertType.replace(/_/g, ' ') : a.type}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4 }}>
                          {a.message || a.description}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
                      No active notifications
                    </div>
                  )}
                </div>
                <div
                  style={{
                    padding: '10px',
                    textAlign: 'center',
                    borderTop: '1px solid var(--rule)',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--brand)',
                  }}
                  onClick={() => {
                    setShowDropdown(false);
                    navigate('/alerts');
                  }}
                >
                  View All
                </div>
              </div>
            )}
          </div>
          <div className="me" style={{ gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="av">{avatar}</div>
              <div className="w">
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Signed in</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                  {user?.n}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {user?.role ? user.role.replace(/\s+\d+$/, '') : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn outline"
                onClick={() => navigate('/change-password')}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Change Password
              </button>
              <button
                className="btn signout-btn"
                onClick={() => {
                  void logout();
                }}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

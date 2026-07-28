import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLegalData } from '../../context/DataContext';

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const { alerts } = useLegalData();
  const navigate = useNavigate();

  const [searchVal, setSearchVal] = useState('');
  const urgentCount = alerts.filter(a => a.sev === 'tape' && !a.isResolved).length;
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
            style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', color: '#F1F2EE' }}
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
            title="Alerts" 
            style={{ cursor: 'pointer', transition: 'background 0.2s' }}
            onClick={() => navigate('/alerts')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.7 21a2 2 0 01-3.4 0" />
            </svg>
            {urgentCount > 0 && <span className="b" id="bc">{urgentCount}</span>}
          </div>
          <div className="me" style={{ gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="av">{avatar}</div>
              <div className="w">
                <div style={{ fontSize: '10px', color: '#9AA3B5', letterSpacing: '0.04em' }}>Signed in</div>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#F1F2EE', lineHeight: 1.25 }}>
                  {user?.n}
                </div>
                <div style={{ fontSize: '10.5px', color: '#C3CADB' }}>{user?.role}</div>
              </div>
            </div>
            <button
              className="btn sm"
              onClick={() => {
                void logout();
              }}
              style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.16)',
                color: '#C3CADB', padding: '4px 8px', borderRadius: '5px'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV } from '../../data/mockData';
import { useLegalData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const getIcon = (key) => {
  switch (key) {
    case 'dash':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="9"></rect>
          <rect x="14" y="3" width="7" height="5"></rect>
          <rect x="14" y="12" width="7" height="9"></rect>
          <rect x="3" y="16" width="7" height="5"></rect>
        </svg>
      );
    case 'cases':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    case 'approve':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      );
    case 'hearings':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      );
    case 'docs':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
      );
    case 'refs':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      );
    case 'land':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
          <polyline points="2 17 12 22 22 17"></polyline>
          <polyline points="2 12 12 17 22 12"></polyline>
        </svg>
      );
    case 'opinions':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      );
    case 'advs':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      );
    case 'clients':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      );
    case 'member':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      );
    case 'daybook':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
      );
    case 'pay':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      );
    case 'notifications':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      );
    case 'reports':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
      );
    case 'acts':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      );
    case 'amend':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
        </svg>
      );
    case 'tools':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2"></path>
          <path d="M12 20v2"></path>
          <path d="M4.93 4.93l1.41 1.41"></path>
          <path d="M17.66 17.66l1.41 1.41"></path>
          <path d="M2 12h2"></path>
          <path d="M20 12h2"></path>
          <path d="M6.34 17.66l-1.41 1.41"></path>
          <path d="M19.07 4.93l-1.41 1.41"></path>
        </svg>
      );
    case 'tasks':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          <line x1="9" y1="12" x2="15" y2="12"></line>
          <line x1="9" y1="16" x2="15" y2="16"></line>
        </svg>
      );
    case 'roles':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      );
    case 'masters':
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      );
    default:
      return null;
  }
};

export default function Sidebar({ isCollapsed, toggleSidebar }) {
  const {
    cases,
    alerts,
    daybook,
    advocates,
    clients,
    lands,
    opinions
  } = useLegalData();
  const { hasPermission } = useAuth();

  // Manage collapsed state for dropdown menus (groups)
  const [collapsedGroups, setCollapsedGroups] = useState({
    Matters: false,
    'Land & Title': false,
    People: false,
    Office: false,
    Library: false,
    Tools: false,
    Admin: false,
  });

  const getRoutePath = (key) => {
    if (key === 'dash') return '/';
    if (key === 'masters') return '/settings/masters';
    return `/${key}`;
  };

  const handleNavLinkClick = () => {
    if (window.innerWidth <= 768 && !isCollapsed) {
      toggleSidebar();
    }
  };

  const toggleGroup = (groupName) => {
    if (isCollapsed) return; // Disallow toggle when sidebar is fully collapsed
    setCollapsedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  return (
    <nav id="nav" className={isCollapsed ? 'collapsed' : ''}>
      <div className="sidebar-brand" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        padding: '6px 4px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div className="seal" style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--brass)',
            color: 'var(--ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Spectral', serif",
            fontWeight: 700,
            fontSize: '13px',
            flex: 'none'
          }}>LD</div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <h2 style={{
                margin: 0,
                fontSize: '14.5px',
                fontFamily: "'Spectral', serif",
                fontWeight: 700,
                color: '#F1F2EE',
                lineHeight: 1.2
              }}>Legal Desk</h2>
              <div style={{
                fontSize: '7.5px',
                fontFamily: "'Inter', sans-serif",
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#9BA6C2',
                marginTop: '1px'
              }}>Advocate Case Management</div>
            </div>
          )}
        </div>
        <button 
          onClick={toggleSidebar} 
          className="nav-collapse-btn" 
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          style={{ background: 'none', border: 'none', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--muted)', borderRadius: '5px' }}
        >
          {isCollapsed ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          )}
        </button>
      </div>
      {NAV.map(group => {
        // Filter items in the group by permissions
        const visibleItems = group.items.filter(i => hasPermission(i.k, 'V'));

        // If no items are visible, hide the group header
        if (visibleItems.length === 0) return null;

        // Dashboard is Today, keep flat
        if (group.g === 'Today') {
          return (
            <div className="ngrp" key={group.g}>
              <ul className="nlist">
                {visibleItems.map(item => (
                  <li key={item.k}>
                    <NavLink
                      to={getRoutePath(item.k)}
                      className={({ isActive }) => `nb ${isActive ? 'on' : ''}`}
                      title={isCollapsed ? item.l : undefined}
                      onClick={handleNavLinkClick}
                    >
                      {getIcon(item.k)}
                      <span className="nb-label" style={{ fontSize: '13px', fontWeight: '400', color: 'rgba(255, 255, 255, 0.75)' }}>{item.l}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        const isGroupCollapsed = collapsedGroups[group.g];

        return (
          <div className="ngrp" key={group.g} style={{ marginBottom: '8px' }}>
            <div 
              className="gt" 
              onClick={() => toggleGroup(group.g)}
              style={{
                cursor: isCollapsed ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                borderRadius: '4px',
                transition: 'background 0.2s',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => { if (!isCollapsed) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={(e) => { if (!isCollapsed) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: '#8F9BBA' }}>{group.g}</span>
              {!isCollapsed && (
                <svg 
                  viewBox="0 0 24 24" 
                  width="12" 
                  height="12" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2.5" 
                  style={{
                    transform: isGroupCollapsed ? 'rotate(-90deg)' : 'none',
                    transition: 'transform 0.2s',
                    opacity: 0.6,
                    color: '#8F9BBA'
                  }}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              )}
            </div>
            {(!isGroupCollapsed || isCollapsed) && (
              <ul className="nlist" style={{ marginTop: '2px' }}>
                {visibleItems.map(item => (
                  <li key={item.k}>
                    <NavLink
                      to={getRoutePath(item.k)}
                      className={({ isActive }) => `nb ${isActive ? 'on' : ''}`}
                      title={isCollapsed ? item.l : undefined}
                      onClick={handleNavLinkClick}
                      style={{ paddingLeft: isCollapsed ? '10px' : '18px' }}
                    >
                      {getIcon(item.k)}
                      <span className="nb-label" style={{ fontSize: '12.5px', fontWeight: '400', color: 'rgba(255, 255, 255, 0.75)' }}>{item.l}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}

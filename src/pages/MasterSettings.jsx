import React, { useEffect, useState, useCallback } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { getPublicSettings, uploadSuperAdminLogo } from '../services/settingsService';
import { uploadTenantLogo } from '../services/tenantService';
import { useAuth } from '../context/AuthContext';
import { toggleMfa } from '../services/authService';

export default function MasterSettings() {
  const { user, setUser } = useAuth();
  const isSuperAdmin = user?.role === 'Super Admin';
  const tenantId = user?.tenantId || user?.tenant?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [currentLogo, setCurrentLogo] = useState(null);

  // MFA state
  const [mfaPassword, setMfaPassword] = useState('');
  const [showMfaPassword, setShowMfaPassword] = useState(false);
  const [mfaErrorMsg, setMfaErrorMsg] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const settings = await getPublicSettings();
        if (settings?.logo) setCurrentLogo(settings.logo);
      } else {
        if (user?.tenant?.logo) setCurrentLogo(user.tenant.logo);
      }
    } catch (err) {
      setError(err.message || 'Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSystemLogoUpload = async (e) => {
    e.preventDefault();
    if (!logoFile) return;
    setSaving(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const data = await uploadSuperAdminLogo(logoFile);
        if (data?.logo) {
          setCurrentLogo(data.logo);
          setLogoFile(null);
          alert('Super Admin logo updated successfully.');
          window.location.reload();
        }
      } else {
        if (!tenantId) throw new Error("Tenant ID not found.");
        const data = await uploadTenantLogo(tenantId, logoFile);
        if (data?.logo) {
          setCurrentLogo(data.logo);
          setLogoFile(null);
          alert('Tenant logo updated successfully.');
          window.location.reload();
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to upload logo.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMfa = async (e) => {
    e.preventDefault();
    setMfaErrorMsg('');
    setMfaLoading(true);

    try {
      const targetState = !user?.mfaEnabled;
      const res = await toggleMfa(mfaPassword, targetState);
      if (res.status === 'success') {
        setUser((prev) => ({
          ...prev,
          mfaEnabled: res.mfaEnabled,
        }));
        
        // Update user in localStorage to persist the change
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          parsedUser.mfaEnabled = res.mfaEnabled;
          localStorage.setItem('user', JSON.stringify(parsedUser));
        }

        setMfaPassword('');
      } else {
        setMfaErrorMsg(res.message || 'Failed to update MFA settings.');
      }
    } catch (err) {
      console.error(err);
      setMfaErrorMsg(
        err.response?.data?.message || err.message || 'An error occurred while updating MFA settings.'
      );
    } finally {
      setMfaLoading(false);
    }
  };

  const titleText = isSuperAdmin ? "Global System Logo" : "Tenant Logo";
  const descText = isSuperAdmin 
    ? "This logo will be displayed on the public login page and the Super Admin sidebar." 
    : "This logo will be displayed on the sidebar for all users in your tenant.";

  return (
    <>
      <PageHeader 
        title="Settings" 
        description="Configure system preferences and branding."
      />

      {error && (
        <div className="card" style={{ marginBottom: 'var(--space-3)', borderColor: 'var(--danger)', color: 'var(--danger)', fontSize: 'var(--text-sm)' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card" style={{ maxWidth: '600px' }}>
            <h3>{titleText}</h3>
            <p className="mut mb-4">{descText}</p>
            
            {currentLogo && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>Current Logo</label>
                <img 
                  src={`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${currentLogo}`} 
                  alt="Current Logo" 
                  style={{ maxWidth: '200px', maxHeight: '100px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }} 
                />
              </div>
            )}

            <form onSubmit={handleSystemLogoUpload}>
              <div className="f mb-4">
                <label>Upload New Logo (PNG, JPG, WEBP, SVG)</label>
                <input 
                  type="file" 
                  accept=".png,.jpg,.jpeg,.webp,.svg"
                  onChange={(e) => setLogoFile(e.target.files[0])}
                />
              </div>
              <button type="submit" className="btn primary" style={{ marginTop: '16px' }} disabled={saving || !logoFile}>
                {saving ? 'Uploading...' : 'Upload Logo'}
              </button>
            </form>
          </div>

          {isSuperAdmin && (
            <div className="card" style={{ maxWidth: '600px' }}>
              <h3>Multi-Factor Authentication</h3>
              
              <div style={{ background: 'var(--bg-sec, #f8fafc)', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '16px' }}>
                <div style={{ flexShrink: 0, marginTop: '2px', color: 'var(--brand)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-main)' }}>Two-Step Verification (MFA)</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Protect your workspace with an extra layer of security. A 6-digit code will be sent to your email during login.
                  </p>
                </div>
              </div>

              {mfaErrorMsg && <div className="login-error" style={{ marginBottom: '16px', padding: '10px', backgroundColor: 'var(--error-bg, #fee2e2)', color: 'var(--error-text, #ef4444)', borderRadius: 'var(--radius-md)' }}>{mfaErrorMsg}</div>}

              <form onSubmit={handleToggleMfa} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  <label htmlFor="mfaPassword" style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Confirm Password to {user?.mfaEnabled ? 'Disable' : 'Enable'}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="mfaPassword"
                      type={showMfaPassword ? "text" : "password"}
                      value={mfaPassword}
                      onChange={(e) => setMfaPassword(e.target.value)}
                      required
                      placeholder="Enter current password"
                      style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: '8px', fontSize: '14px', backgroundColor: 'var(--bg-card, #fff)' }}
                    />
                    <button type="button" onClick={() => setShowMfaPassword(!showMfaPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} title="Toggle password visibility">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                </div>

                <div>
                  <button type="submit" disabled={mfaLoading || !mfaPassword} style={{ 
                    padding: '10px 16px', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    fontWeight: 600,
                    backgroundColor: user?.mfaEnabled ? '#ef4444' : '#059669', 
                    color: '#fff',
                    border: 'none',
                    cursor: (mfaLoading || !mfaPassword) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: (mfaLoading || !mfaPassword) ? 0.7 : 1
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {user?.mfaEnabled ? (
                        <>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </>
                      ) : (
                        <>
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                          <polyline points="9 12 11 14 15 10"></polyline>
                        </>
                      )}
                    </svg>
                    {mfaLoading ? 'Processing...' : (user?.mfaEnabled ? 'Disable MFA' : 'Enable MFA')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}


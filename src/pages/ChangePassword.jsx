import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService';

export default function ChangePassword() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const isForced = user?.mustChangePassword;

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (res.status === 'success') {
        setUser((prev) => ({
          ...prev,
          mustChangePassword: false,
        }));
        
        // Update user in localStorage to persist the change
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          parsedUser.mustChangePassword = false;
          localStorage.setItem('user', JSON.stringify(parsedUser));
        }

        navigate('/');
      } else {
        setErrorMsg(res.message || 'Failed to change password.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message || err.message || 'An error occurred while changing password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const content = (
      <section className={isForced ? "login-panel" : ""} style={isForced ? { margin: 'auto' } : { maxWidth: '500px', background: 'var(--bg-card, #fff)', border: '1px solid var(--border-color, #e2e8f0)', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div className={isForced ? "login-panel-inner" : ""}>
          <p className={isForced ? "login-panel-eyebrow" : ""} style={!isForced ? { fontSize: '12px', fontWeight: '600', color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' } : {}}>{isForced ? 'Action Required' : 'Security Settings'}</p>
          <h2 className={isForced ? "login-panel-title" : ""} style={!isForced ? { fontSize: '24px', fontWeight: '700', color: 'var(--text-main)', margin: '0 0 8px 0' } : {}}>Change Password</h2>
          <p className={isForced ? "login-panel-desc" : ""} style={!isForced ? { fontSize: '14px', color: 'var(--muted)', marginBottom: '24px' } : {}}>
            {isForced 
              ? 'You must change your temporary password before accessing the system.'
              : 'Update your account password securely.'}
          </p>

          {errorMsg && <div className="login-error">{errorMsg}</div>}

          <form onSubmit={handleSubmit} className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="login-field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', position: 'relative' }}>
              <label htmlFor="currentPassword" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-card, #fff)' }}
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} title="Toggle password visibility">
                  {showCurrent ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            
            <div className="login-field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', position: 'relative' }}>
              <label htmlFor="newPassword" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-card, #fff)' }}
                />
                <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} title="Toggle password visibility">
                  {showNew ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="login-field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', position: 'relative' }}>
              <label htmlFor="confirmPassword" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1px solid var(--border-color, #cbd5e1)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', backgroundColor: 'var(--bg-card, #fff)' }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} title="Toggle password visibility">
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="submit" className="btn primary" disabled={loading} style={{ flex: 1, padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '15px' }}>
                {loading ? 'Changing...' : 'Change Password'}
              </button>
              {isForced ? (
                <button type="button" onClick={logout} className="btn outline" disabled={loading} style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '15px' }}>
                  Logout
                </button>
              ) : (
                <button type="button" onClick={() => navigate(-1)} className="btn outline" disabled={loading} style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '15px' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </section>
  );

  if (isForced) {
    return (
      <div className="login-page">
        {content}
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {content}
    </div>
  );
}

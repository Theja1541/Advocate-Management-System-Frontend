import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_CREDENTIALS } from '../data/credentials';
import { login as loginRequest } from '../services/authService';
import { getPublicSettings } from '../services/settingsService';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const settings = await getPublicSettings();
        if (settings?.logo) {
          setLogoUrl(settings.logo);
        }
      } catch (err) {
        console.error('Failed to load public settings:', err);
      }
    };
    fetchLogo();
  }, []);

  const initialsFromName = (name = '') =>
    name.split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const applyDemo = (cred) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setErrorMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const data = await loginRequest(email, password);

      if ((data.status === 'success' || data.status === 'PASSWORD_CHANGE_REQUIRED') && data.token && data.data?.user) {
        const name = data.data.user.name;
        const mappedUser = {
          id: data.data.user.id,
          n: name,
          role: data.data.user.role,
          av: initialsFromName(name),
          advocateId: data.data.user.advocateId ?? null,
          mustChangePassword: data.data.user.mustChangePassword,
        };

        login(mappedUser, data.token);
        if (data.status === 'PASSWORD_CHANGE_REQUIRED' || data.data.user.mustChangePassword) {
          navigate('/change-password');
        } else {
          navigate('/');
        }
      } else {
        setErrorMsg(data.message || 'Incorrect email or password');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.status
          ? err.message || 'Incorrect email or password'
          : 'Failed to connect to authentication server. Is the backend running?'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-brand" aria-hidden={false}>
        <div className="login-brand-top">
          {logoUrl ? (
            <img src={`${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${logoUrl}`} alt="Legal Desk" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '8px' }} />
          ) : (
            <div className="login-seal">LD</div>
          )}
        </div>

        <div className="login-brand-hero">
          <h1 className="login-brand-name">Legal Desk</h1>
          <div className="login-brand-line" />
          <p className="login-brand-headline">
            Chambers-grade case management for modern advocates.
          </p>
          <p className="login-brand-sub">
            Hearings, clients, filings, and fees — one quiet, ordered desk.
          </p>
        </div>

        <div className="login-brand-foot">Advocate Case Management</div>
      </aside>

      <section className="login-panel">
        <div className="login-panel-inner">
          <p className="login-panel-eyebrow">Secure access</p>
          <h2 className="login-panel-title">Sign in</h2>
          <p className="login-panel-desc">
            Enter your chamber credentials to continue.
          </p>

          {errorMsg && <div className="login-error">{errorMsg}</div>}

          <form onSubmit={handleLogin} className="login-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="login-field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor="login-email" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Email Address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@legaldesk.in"
                required
                autoComplete="email"
                style={{ padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', backgroundColor: 'var(--card)' }}
              />
            </div>

            <div className="login-field" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', position: 'relative' }}>
              <label htmlFor="login-password" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ width: '100%', padding: '10px 40px 10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-primary)', backgroundColor: 'var(--card)' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }} title="Toggle password visibility">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn primary" disabled={loading} style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '15px' }}>
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>

          <div className="login-demos" style={{ marginTop: '24px' }}>
            <div className="login-demos-label" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '12px' }}>Demo credentials — click to fill</div>
            <div className="login-demos-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  className={`btn outline sm${email === cred.email ? ' is-active' : ''}`}
                  onClick={() => applyDemo(cred)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}
                >
                  <div style={{ minWidth: 0, textAlign: 'left' }}>
                    <div className="login-demo-role" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{cred.role}</div>
                    <div className="login-demo-email" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{cred.email}</div>
                  </div>
                  <div className="login-demo-pass" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{cred.password}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

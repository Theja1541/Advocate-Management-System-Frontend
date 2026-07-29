import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEMO_CREDENTIALS } from '../data/credentials';
import { login as loginRequest } from '../services/authService';


export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

      if (data.status === 'success' && data.token && data.data?.user) {
        const name = data.data.user.name;
        const mappedUser = {
          id: data.data.user.id,
          n: name,
          role: data.data.user.role,
          av: initialsFromName(name),
          advocateId: data.data.user.advocateId ?? null,
        };

        login(mappedUser, data.token);
        navigate('/');
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
          <div className="login-seal">LD</div>
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

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email">Email Address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@legaldesk.in"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>

          <div className="login-demos">
            <div className="login-demos-label">Demo credentials — click to fill</div>
            <div className="login-demos-list">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.email}
                  type="button"
                  className={`login-demo${email === cred.email ? ' is-active' : ''}`}
                  onClick={() => applyDemo(cred)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div className="login-demo-role">{cred.role}</div>
                    <div className="login-demo-email">{cred.email}</div>
                  </div>
                  <div className="login-demo-pass">{cred.password}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

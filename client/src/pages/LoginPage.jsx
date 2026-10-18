import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { societySeal } from '../lib/format';
import { Icon } from '../components/Icon';

export function LoginPage() {
  const { brand, notice, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const usernameRef = useRef(null);

  useEffect(() => {
    document.title = `${brand.society_name} · Sign in`;
    const timer = setTimeout(() => usernameRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [brand.society_name]);

  async function handleSubmit(event) {
    event.preventDefault();
    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setError('Enter both your username and password.');
      (cleanUsername ? document.getElementById('login-password') : usernameRef.current)?.focus();
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      await login(cleanUsername, password);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Unable to sign in.');
      setSubmitting(false);
      document.getElementById('login-password')?.select();
    }
  }

  return (
    <div className="app-root">
      <div className="login-page">
        <section className="login-hero">
          <div className="hero-brand">
            <span className="seal">{societySeal(brand.society_name)}</span>
            <span>{brand.society_name}</span>
          </div>

          <div className="hero-copy">
            <p className="eyebrow">Membership desk</p>
            <h1>
              Where every
              <br />
              <em>argument</em> begins.
            </h1>
            <p className="hero-text">
              Register general and executive members, collect dues online or at the desk, and keep
              the whole roster in one careful place.
            </p>
          </div>

          <div>
            <div className="hero-stats">
              <div>
                <strong>Two tiers</strong>
                <span>General &amp; executive</span>
              </div>
              <div>
                <strong>Two ways</strong>
                <span>Online &amp; offline</span>
              </div>
              <div>
                <strong>One desk</strong>
                <span>Admin &amp; desk access</span>
              </div>
            </div>
            <p className="hero-quote" style={{ marginTop: 22 }}>
              {brand.tagline}
            </p>
          </div>
        </section>

        <main className="login-panel">
          <form className="login-card" onSubmit={handleSubmit} noValidate>
            <div className="login-card-head">
              <p className="eyebrow">Sign in</p>
              <h2>Welcome back</h2>
              <p className="muted">Use your admin or desk account to continue.</p>
            </div>

            <p className="form-error" role="alert">
              {error || notice}
            </p>

            <div className="field">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="none"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                ref={usernameRef}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrap">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="reveal"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
              {submitting ? 'Signing in…' : (
                <>
                  Sign in <Icon name="arrowRight" />
                </>
              )}
            </button>

            <details className="demo-note">
              <summary>First-time setup</summary>
              <p>
                Accounts are created on the first start. Ask your society administrator for your
                login details, and change the seeded passwords from <strong>Settings</strong> after
                signing in.
              </p>
            </details>
          </form>
        </main>
      </div>
    </div>
  );
}

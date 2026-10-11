import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, loading, authError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/hub');
    } catch {
      // Error handled in auth context
    }
  };

  return (
    <div className="auth-page">
      {/* ── Left panel ── */}
      <div className="auth-left">
        <div className="auth-left-divider" aria-hidden="true" />
        <div className="auth-left-content">
          <img src="/codescope-logo.png" alt="CodeScope" className="auth-logo-img" />
          <div className="auth-wordmark">
            <span className="auth-wordmark-impact">Code</span>
            <span className="auth-wordmark-iq">Scope</span>
          </div>
          <div className="auth-left-rule" aria-hidden="true" />
          <h2 className="auth-heading">
            AI-powered code intelligence for complex software systems.
          </h2>
          <p className="auth-tagline">
            Understand change impact, coordinate intelligent analysis, and review code with confidence.
          </p>
        </div>
        <div className="auth-features" aria-hidden="true">
          <div className="auth-feature-item">
            <span className="auth-feature-dot" />
            Semantic codebase indexing
          </div>
          <div className="auth-feature-item">
            <span className="auth-feature-dot" />
            AI-driven impact analysis
          </div>
          <div className="auth-feature-item">
            <span className="auth-feature-dot" />
            Automated pre-review &amp; PR generation
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right">
        <div className="auth-card">
          <h2 className="auth-card-title">Welcome back</h2>
          <p className="auth-card-subtitle">Sign in to your CodeScope workspace</p>

          {authError && (
            <div className="auth-error">
              <AlertCircle size={15} />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email */}
            <div>
              <label className="auth-label">Email</label>
              <div className="auth-input-wrap">
                <Mail size={15} color="#606060" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="auth-input"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="auth-label-row">
                <label className="auth-label" style={{ margin: 0 }}>Password</label>
                <Link to="/forgot-password" className="auth-forgot-link">
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-wrap">
                <Lock size={15} color="#606060" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="auth-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-eye-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? 'Authenticating...' : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="auth-toggle">
            Don&apos;t have an account?{' '}
            <Link to="/register">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

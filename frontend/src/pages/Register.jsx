import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  User,
  Briefcase,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import './auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { register, loading, authError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Senior Staff Engineer');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!name.trim()) { setLocalError('Please enter your full name.'); return; }
    if (!email.trim() || !email.includes('@')) { setLocalError('Please enter a valid email address.'); return; }
    if (password.length < 6) { setLocalError('Password must be at least 6 characters.'); return; }

    try {
      await register(name.trim(), email.trim(), password, role);
      navigate('/hub');
    } catch (err) {
      setLocalError(err.message || 'Registration failed. Please try again.');
    }
  };

  const displayedError = localError || authError;

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
          <h2 className="auth-card-title">Create account</h2>
          <p className="auth-card-subtitle">Get started with CodeScope</p>

          {displayedError && (
            <div className="auth-error">
              <AlertCircle size={15} />
              <span>{displayedError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {/* Full Name */}
            <div>
              <label className="auth-label">Full Name</label>
              <div className="auth-input-wrap">
                <User size={15} color="#606060" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  required
                  className="auth-input"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="auth-label">Work Email</label>
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

            {/* Role */}
            <div>
              <label className="auth-label">Engineering Role</label>
              <div className="auth-input-wrap">
                <Briefcase size={15} color="#606060" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="auth-select"
                >
                  <option value="Senior Staff Engineer">Senior Staff Engineer</option>
                  <option value="Principal Architect">Principal Architect</option>
                  <option value="Tech Lead / Engineering Manager">Tech Lead / Engineering Manager</option>
                  <option value="Full-Stack Developer">Full-Stack Developer</option>
                  <option value="QA / SDET Automation Lead">QA / SDET Automation Lead</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={15} color="#606060" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
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
              {loading ? 'Creating Account...' : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <div className="auth-toggle">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

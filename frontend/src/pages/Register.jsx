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
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Registration failed. Please try again.');
    }
  };

  const displayedError = localError || authError;

  const inputWrapStyle = {
    display: 'flex', alignItems: 'center',
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '10px 14px', gap: '8px',
  };

  const inputStyle = {
    background: 'transparent', border: 'none', outline: 'none',
    color: 'var(--text)', fontSize: '14px', width: '100%',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: '440px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '40px',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '4px',
            background: 'var(--nvidia)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: '#000' }}>IQ</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>ImpactIQ</span>
        </div>
        <p style={{
          fontSize: '11px', color: 'var(--text-3)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: '32px',
        }}>
          POWERED BY NVIDIA NIM
        </p>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: '0 0 6px 0' }}>
            Create Account
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
            Fill in your details to get started.
          </p>
        </div>

        {/* Error */}
        {displayedError && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(204,51,51,0.12)', border: '1px solid rgba(204,51,51,0.3)',
            borderRadius: 'var(--radius)', color: 'var(--error)',
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '20px', fontSize: '13px',
          }}>
            <AlertCircle size={15} />
            <span>{displayedError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Full Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>
              Full Name
            </label>
            <div style={inputWrapStyle}
              onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'var(--nvidia)')}
              onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <User size={15} color="var(--text-3)" />
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Smith" required style={inputStyle}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>
              Work Email
            </label>
            <div style={inputWrapStyle}
              onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'var(--nvidia)')}
              onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <Mail size={15} color="var(--text-3)" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com" required style={inputStyle}
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>
              Engineering Role
            </label>
            <div style={inputWrapStyle}
              onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'var(--nvidia)')}
              onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <Briefcase size={15} color="var(--text-3)" />
              <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="Senior Staff Engineer" style={{ background: '#1a1a1a' }}>Senior Staff Engineer</option>
                <option value="Principal Architect" style={{ background: '#1a1a1a' }}>Principal Architect</option>
                <option value="Tech Lead / Engineering Manager" style={{ background: '#1a1a1a' }}>Tech Lead / Engineering Manager</option>
                <option value="Full-Stack Developer" style={{ background: '#1a1a1a' }}>Full-Stack Developer</option>
                <option value="QA / SDET Automation Lead" style={{ background: '#1a1a1a' }}>QA / SDET Automation Lead</option>
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>
              Password
            </label>
            <div style={inputWrapStyle}
              onFocusCapture={(e) => (e.currentTarget.style.borderColor = 'var(--nvidia)')}
              onBlurCapture={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <Lock size={15} color="var(--text-3)" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters" required style={inputStyle}
              />
              <button
                type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px', padding: '11px',
              borderRadius: 'var(--radius)', background: 'var(--nvidia)',
              border: 'none', color: '#000', fontSize: '14px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer', width: '100%',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating Account...' : (
              <><span>Create Account</span><ArrowRight size={15} /></>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--nvidia)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;

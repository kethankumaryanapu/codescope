import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  User,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const { requestOtp, verifyAndCreateAccount, loading, authError } = useAuth();

  // Step state: 'form' | 'otp'
  const [step, setStep] = useState('form');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Senior Staff Engineer');
  const [showPassword, setShowPassword] = useState(false);

  // OTP State (6 Digits)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [localError, setLocalError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const otpInputRefs = useRef([]);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  // Focus first OTP input on step switch
  useEffect(() => {
    if (step === 'otp' && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Handle Step 1: Submit Details & Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLocalError('');
    setInfoMessage('');

    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    try {
      await requestOtp(email.trim(), name.trim());
      setStep('otp');
      setResendTimer(60);
      setCanResend(false);
      setInfoMessage(`Verification code sent to ${email.trim()}`);
    } catch (err) {
      setLocalError(err.message || 'Failed to dispatch verification code.');
    }
  };

  // Handle OTP digit changes
  const handleOtpDigitChange = (index, value) => {
    // Handle paste of full 6-digit code
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      if (pasted) {
        const newDigits = [...otpDigits];
        for (let i = 0; i < pasted.length; i++) {
          newDigits[i] = pasted[i];
        }
        setOtpDigits(newDigits);
        const nextIndex = Math.min(pasted.length, 5);
        otpInputRefs.current[nextIndex]?.focus();
      }
      return;
    }

    const cleanVal = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = cleanVal;
    setOtpDigits(newDigits);

    // Auto-advance to next box if filled
    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP Backspace key
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle Step 2: Verify OTP & Complete Registration
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setLocalError('');
    setInfoMessage('');

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setLocalError('Please enter all 6 digits of your verification code.');
      return;
    }

    try {
      await verifyAndCreateAccount({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        otp: fullOtp,
      });
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Invalid or expired verification code.');
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setLocalError('');
    setInfoMessage('');
    try {
      await requestOtp(email.trim(), name.trim());
      setResendTimer(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setInfoMessage(`A fresh 6-digit code was sent to ${email.trim()}`);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setLocalError(err.message || 'Failed to resend verification code.');
    }
  };

  const displayedError = localError || authError;

  const inputWrapStyle = {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '10px 14px',
    gap: '8px',
    transition: 'border-color 0.15s',
  };

  const inputStyle = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text)',
    fontSize: '14px',
    width: '100%',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              background: 'var(--nvidia)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: '#000', letterSpacing: '-0.5px' }}>IQ</span>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>ImpactIQ</span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: '32px' }}>
          POWERED BY NVIDIA NIM
        </p>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              {step === 'form' ? 'Create Account' : 'Verify Email'}
            </h2>
            <span style={{
              fontSize: '10px', fontWeight: 700, color: 'var(--text-3)',
              fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
            }}>
              {step === 'form' ? 'STEP 1 / 2' : 'STEP 2 / 2'}
            </span>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', margin: 0 }}>
            {step === 'form'
              ? 'Fill in your details to receive a verification code.'
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {/* Feedback messages */}
        {displayedError && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(204,51,51,0.12)',
            border: '1px solid rgba(204,51,51,0.3)',
            borderRadius: 'var(--radius)',
            color: 'var(--error)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            fontSize: '13px',
          }}>
            <AlertCircle size={15} />
            <span>{displayedError}</span>
          </div>
        )}

        {infoMessage && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(118,185,0,0.1)',
            border: '1px solid rgba(118,185,0,0.3)',
            borderRadius: 'var(--radius)',
            color: 'var(--nvidia)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            fontSize: '13px',
          }}>
            <CheckCircle2 size={15} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* ── STEP 1: DETAILS FORM ── */}
        {step === 'form' ? (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Full Name</label>
              <div style={inputWrapStyle}
                onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--nvidia)'}
                onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <User size={15} color="var(--text-3)" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Smith" required style={inputStyle} />
              </div>
            </div>

            {/* Work Email */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Work Email</label>
              <div style={inputWrapStyle}
                onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--nvidia)'}
                onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <Mail size={15} color="var(--text-3)" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required style={inputStyle} />
              </div>
            </div>

            {/* Role */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Engineering Role</label>
              <div style={inputWrapStyle}
                onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--nvidia)'}
                onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
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
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>Password</label>
              <div style={inputWrapStyle}
                onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--nvidia)'}
                onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <Lock size={15} color="var(--text-3)" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  style={inputStyle}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px',
                padding: '11px',
                borderRadius: 'var(--radius)',
                background: 'var(--nvidia)',
                border: 'none',
                color: '#000',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Sending Code...' : (
                <><span>Send Verification Code</span><ArrowRight size={15} /></>
              )}
            </button>
          </form>
        ) : (
          /* ── STEP 2: 6-DIGIT OTP ENTRY ── */
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Email display */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 12px',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={14} color="var(--text-3)" />
                <span style={{ fontSize: '13px', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{email}</span>
              </div>
              <button
                type="button"
                onClick={() => { setStep('form'); setLocalError(''); setInfoMessage(''); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--nvidia)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
              >
                Edit
              </button>
            </div>

            {/* 6 Digit Inputs */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px', textAlign: 'center' }}>
                Enter 6-Digit Code
              </label>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    style={{
                      width: '46px',
                      height: '52px',
                      textAlign: 'center',
                      fontSize: '22px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text)',
                      background: 'var(--surface-2)',
                      border: digit ? '2px solid var(--nvidia)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Resend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-3)' }}>Didn&apos;t receive code?</span>
              {canResend ? (
                <button type="button" onClick={handleResendOtp} disabled={loading} style={{
                  background: 'transparent', border: 'none', color: 'var(--nvidia)', fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0,
                }}>
                  <RefreshCw size={13} /> Resend
                </button>
              ) : (
                <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Resend in {resendTimer}s</span>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="submit"
                disabled={loading || otpDigits.join('').length !== 6}
                style={{
                  padding: '11px',
                  borderRadius: 'var(--radius)',
                  background: 'var(--nvidia)',
                  border: 'none',
                  color: '#000',
                  fontSize: '14px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: loading || otpDigits.join('').length !== 6 ? 'not-allowed' : 'pointer',
                  opacity: otpDigits.join('').length !== 6 ? 0.5 : 1,
                  width: '100%',
                }}
              >
                {loading ? 'Verifying...' : (
                  <><KeyRound size={15} /><span>Verify & Launch Workspace</span></>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setStep('form'); setLocalError(''); setInfoMessage(''); }}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '10px',
                  color: 'var(--text-3)',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={13} /> Back to Details
              </button>
            </div>
          </form>
        )}

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

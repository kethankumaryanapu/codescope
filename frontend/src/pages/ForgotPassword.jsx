import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sendForgotPasswordOtp, resetPasswordWithOtp } from '../services/api';
import {
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Step: 'request' | 'verify' | 'success'
  const [step, setStep] = useState('request');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const otpInputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    let interval = null;
    if (step === 'verify' && resendTimer > 0) {
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

  // Focus first OTP box on step change
  useEffect(() => {
    if (step === 'verify' && otpInputRefs.current[0]) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  // Step 1: Send Password Reset Code
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await sendForgotPasswordOtp(email.trim());
      setStep('verify');
      setResendTimer(60);
      setCanResend(false);
      setInfoMessage(`Recovery code sent to ${email.trim()}`);
    } catch (err) {
      setError(err.message || 'Failed to dispatch password recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle OTP input
  const handleOtpDigitChange = (index, value) => {
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

    if (cleanVal && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Submit OTP & New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of your verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordWithOtp(email.trim(), fullOtp, newPassword);
      setStep('success');
    } catch (err) {
      setError(err.message || 'Invalid or expired recovery code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setError('');
    setInfoMessage('');
    setLoading(true);
    try {
      await sendForgotPasswordOtp(email.trim());
      setResendTimer(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      setInfoMessage(`A fresh recovery code was sent to ${email.trim()}`);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message || 'Failed to resend recovery code.');
    } finally {
      setLoading(false);
    }
  };

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
          textAlign: 'center',
        }}
      >
        {/* Logo / Icon */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '44px', height: '44px', borderRadius: 'var(--radius)',
          background: 'var(--nvidia)', marginBottom: '20px',
        }}>
          <Lock size={20} color="#000" />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px 0' }}>
          {step === 'request' && 'Reset Password'}
          {step === 'verify' && 'Enter Verification Code'}
          {step === 'success' && 'Password Updated'}
        </h2>

        <p style={{ color: 'var(--text-3)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 24px 0' }}>
          {step === 'request' && 'Enter your account email to receive a recovery code.'}
          {step === 'verify' && `Enter the 6-digit code sent to ${email} and choose a new password.`}
          {step === 'success' && 'Your password has been changed. You can now log in.'}
        </p>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(204,51,51,0.12)',
            border: '1px solid rgba(204,51,51,0.3)',
            borderRadius: 'var(--radius)',
            color: 'var(--error)',
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '20px', fontSize: '13px', textAlign: 'left',
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(118,185,0,0.1)',
            border: '1px solid rgba(118,185,0,0.3)',
            borderRadius: 'var(--radius)',
            color: 'var(--nvidia)',
            display: 'flex', alignItems: 'center', gap: '8px',
            marginBottom: '20px', fontSize: '13px', textAlign: 'left',
          }}>
            <CheckCircle2 size={15} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* STEP 1: REQUEST OTP */}
        {step === 'request' && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>
                Account Email
              </label>
              <div style={inputWrapStyle}
                onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--nvidia)'}
                onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <Mail size={15} color="var(--text-3)" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" required style={inputStyle} />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              marginTop: '4px', padding: '11px',
              borderRadius: 'var(--radius)',
              background: 'var(--nvidia)', border: 'none',
              color: '#000', fontSize: '14px', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%', opacity: loading ? 0.7 : 1,
            }}>
              {loading ? 'Sending Code...' : (
                <><span>Send Recovery Code</span><ArrowRight size={15} /></>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <Link to="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                color: 'var(--text-3)', fontSize: '13px', textDecoration: 'none',
              }}>
                <ArrowLeft size={13} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* STEP 2: ENTER OTP & NEW PASSWORD */}
        {step === 'verify' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
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
                      width: '44px', height: '50px',
                      textAlign: 'center', fontSize: '20px', fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text)',
                      background: 'var(--surface-2)',
                      border: digit ? '2px solid var(--nvidia)' : '1px solid var(--border)',
                      borderRadius: 'var(--radius)', outline: 'none',
                      transition: 'border-color 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Resend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-3)' }}>Didn&apos;t get code?</span>
              {canResend ? (
                <button type="button" onClick={handleResendOtp} disabled={loading} style={{
                  background: 'transparent', border: 'none', color: 'var(--nvidia)',
                  fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0,
                }}>
                  <RefreshCw size={13} /> Resend
                </button>
              ) : (
                <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>Resend in {resendTimer}s</span>
              )}
            </div>

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '6px' }}>New Password</label>
              <div style={inputWrapStyle}
                onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--nvidia)'}
                onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <Lock size={15} color="var(--text-3)" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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
              disabled={loading || otpDigits.join('').length !== 6 || newPassword.length < 6}
              style={{
                marginTop: '4px', padding: '11px',
                borderRadius: 'var(--radius)',
                background: 'var(--nvidia)', border: 'none',
                color: '#000', fontSize: '14px', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                cursor: (loading || otpDigits.join('').length !== 6 || newPassword.length < 6) ? 'not-allowed' : 'pointer',
                opacity: (otpDigits.join('').length !== 6 || newPassword.length < 6) ? 0.5 : 1,
                width: '100%',
              }}
            >
              {loading ? 'Resetting...' : (
                <><KeyRound size={15} /><span>Update Password</span></>
              )}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button type="button" onClick={() => setStep('request')} style={{
                background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '13px', cursor: 'pointer',
              }}>
                ← Change email address
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <CheckCircle2 size={48} color="var(--nvidia)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{ color: 'var(--text-2)', fontSize: '14px', margin: '0 0 20px' }}>
              Your password has been reset successfully.
            </p>
            <Link
              to="/login"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '11px 24px', borderRadius: 'var(--radius)',
                background: 'var(--nvidia)', color: '#000', fontWeight: 700, fontSize: '14px', textDecoration: 'none',
              }}
            >
              Sign In Now <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

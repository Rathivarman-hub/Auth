import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// Configure axios base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

export default function AuthApp() {
  const [mode, setMode] = useState('login'); // login, register, otp, done
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await axios.get('/auth/me');
      if (data.user) {
        setUser(data.user);
        setMode('done');
      }
    } catch (err) {
      // Not logged in
    }
  };

  const showMsg = (text, type = 'info') => {
    setMsg({ text, type });
    if (type !== 'error') setTimeout(() => setMsg({ text: '', type: '' }), 5000);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) return showMsg('Please fill all fields', 'error');
    setLoading(true);
    try {
      const { data } = await axios.post('/auth/login', { email, password });
      setOtp(['', '', '', '', '', '']); // Clear old OTP data
      setMode('otp');
      setPassword(''); // Clear password
      showMsg(data.message, 'success');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (!name || !email || !password) return showMsg('Please fill all fields', 'error');
    if (passwordStrength.score < 3) return showMsg('Password must be stronger (8+ chars, upper, number, special)', 'error');
    setLoading(true);
    try {
      const { data } = await axios.post('/auth/register', { name, email, password });
      setOtp(['', '', '', '', '', '']); // Clear old OTP data
      setMode('otp');
      setPassword(''); // Clear password
      showMsg(data.message, 'success');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!email) return showMsg('Please enter your email', 'error');
    setLoading(true);
    try {
      await axios.post('/auth/send-otp', { email });
      setOtp(['', '', '', '', '', '']); // Clear input fields
      setMode('otp');
      showMsg('New OTP sent to your email', 'success');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to send OTP', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/auth/verify-otp', { email, otp: otp.join('') });
      setUser(data.user);
      setMode('done');
      showMsg('Email verified successfully!', 'success');
    } catch (err) {
      showMsg(err.response?.data?.message || 'Invalid OTP', 'error');
      setOtp(['', '', '', '', '', '']); // Clear fields on error
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post('/auth/logout');
      setUser(null);
      resetFields('login');
      showMsg('Logged out successfully', 'success');
    } catch (err) {
      showMsg('Logout failed', 'error');
    }
  };

  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });

  const resetFields = (newMode) => {
    setMode(newMode);
    setEmail('');
    setPassword('');
    setName('');
    setShowPassword(false);
    setPasswordStrength({ score: 0, label: '', color: '' });
    setMsg({ text: '', type: '' });
  };

  const evaluatePassword = (pass) => {
    let score = 0;
    if (pass.length === 0) return setPasswordStrength({ score: 0, label: '', color: '' });
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    let label = 'Weak';
    let color = '#ef4444';
    if (score === 2) { label = 'Fair'; color = '#fbbf24'; }
    if (score === 3) { label = 'Good'; color = '#6366f1'; }
    if (score === 4) { label = 'Strong'; color = '#22c55e'; }

    setPasswordStrength({ score, label, color });
  };

  const handleOtpChange = (val, i) => {
    val = val.slice(-1).replace(/\D/, '');
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (e, i) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0)
      inputRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    if (pasted.length === 0) return;
    
    const next = [...otp];
    pasted.forEach((char, i) => {
      if (i < 6) next[i] = char;
    });
    setOtp(next);
    
    const lastIdx = Math.min(pasted.length, 5);
    inputRefs.current[lastIdx]?.focus();
  };

  return (
    <div className="otp-root">
      <div className="otp-card">
        <div className="step-dots">
          <div className={`dot ${['login', 'register'].includes(mode) ? 'active' : ''}`} />
          <div className={`dot ${mode === 'otp' ? 'active' : ''}`} />
          <div className={`dot ${mode === 'done' ? 'active' : ''}`} />
        </div>

        {mode === 'login' && (
          <form className="fade-in" onSubmit={handleLogin}>
            <p className="otp-title">Welcome back</p>
            <p className="otp-sub">Login to your account to continue</p>
            
            <button type="button" className="btn-google" onClick={handleGoogleLogin}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
              Continue with Google
            </button>

            <div className="divider">OR</div>

            <label className="field-label">Email address</label>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
            />

            <label className="field-label">Password</label>
            <div className="field-container">
              <input
                className="field-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Sign in'}
            </button>
            
            <div className="auth-switch">
              Don't have an account? <span onClick={() => resetFields('register')}>Sign up</span>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form className="fade-in" onSubmit={handleRegister}>
            <p className="otp-title">Create an account</p>
            <p className="otp-sub">Join us to get started with our platform</p>

            <label className="field-label">Full Name</label>
            <input
              className="field-input"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Doe"
            />

            <label className="field-label">Email address</label>
            <input
              className="field-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@company.com"
            />

            <label className="field-label">Password</label>
            <div className="field-container" style={{ marginBottom: '8px' }}>
              <input
                className="field-input"
                style={{ marginBottom: '0' }}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  evaluatePassword(e.target.value);
                }}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                )}
              </button>
            </div>

            {password && (
              <div className="strength-meter">
                <div className="strength-bars">
                  {[1, 2, 3, 4].map(s => (
                    <div 
                      key={s} 
                      className="s-bar" 
                      style={{ background: s <= passwordStrength.score ? passwordStrength.color : 'var(--border)' }}
                    />
                  ))}
                </div>
                <span className="strength-label" style={{ color: passwordStrength.color }}>
                  {passwordStrength.label}
                </span>
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <div className="auth-switch">
              Already have an account? <span onClick={() => resetFields('login')}>Sign in</span>
            </div>
          </form>
        )}

        {mode === 'otp' && (
          <form className="fade-in" onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }}>
            <p className="otp-title">Enter the code</p>
            <p className="otp-sub">Sent to <span>{email}</span></p>
            <div className="otp-boxes">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => inputRefs.current[i] = el}
                  className={`otp-box ${digit ? 'filled' : ''}`}
                  type="text" inputMode="numeric" maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(e.target.value, i)}
                  onKeyDown={e => handleOtpKeyDown(e, i)}
                  onPaste={handlePaste}
                />
              ))}
            </div>
            <button type="submit" className="btn-primary" disabled={loading || otp.some(d => !d)}>
              {loading ? 'Verifying...' : 'Verify code'}
            </button>
            <button type="button" className="btn-ghost" onClick={handleSendOtp}>Resend code</button>
            <a className="back-link" onClick={() => resetFields('login')}>← Back to login</a>
          </form>
        )}

        {mode === 'done' && (
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <div className="done-icon">✓</div>
            <p className="otp-title">Authenticated!</p>
            <p className="otp-sub">Welcome, <span>{user?.name || user?.email}</span></p>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email</div>
              <div style={{ fontSize: '14px' }}>{user?.email}</div>
            </div>

            <button className="btn-ghost" onClick={handleLogout}>Log out</button>
          </div>
        )}

        {msg.text && <div className={`msg-box ${msg.type}`}>{msg.text}</div>}
      </div>
    </div>
  );
}
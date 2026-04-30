import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input, Button } from '../components/FormElements';
import './Login.css';

export default function LoginPage() {
  const { isAuthenticated, step, loading, sendOTP, verifyOTP, pendingPhone } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone || !password) { setError('Please enter phone and password.'); return; }
    const res = await sendOTP(phone, password, username);
    if (!res.success) setError(res.message || 'Failed to send OTP');
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp) { setError('Please enter the OTP.'); return; }
    const res = await verifyOTP(otp);
    if (!res.success) setError(res.message || 'Invalid OTP');
  };

  return (
    <div className="login-page">

      {/* Left panel — branding */}
      <div className="login-panel-left">
        <div className="login-brand-block">
          <img src="/logo.png" alt="Buuttii" className="login-brand-logo" />
          <h1 className="login-brand-name">BUUTTII</h1>
          <p className="login-brand-tagline">Nutrition in Every Meal</p>
        </div>
        <div className="login-features">
          {[
            { icon: '🏫', label: 'School & Corporate Management' },
            { icon: '📋', label: 'Subscription & Trial Plans' },
            { icon: '📊', label: 'Real-time Analytics' },
            { icon: '🍱', label: 'Daily Menu & Token System' },
          ].map((f) => (
            <div key={f.label} className="login-feature-item">
              <span className="login-feature-icon">{f.icon}</span>
              <span>{f.label}</span>
            </div>
          ))}
        </div>
        <p className="login-panel-footer">© 2026 Buuttii · Admin Portal</p>
      </div>

      {/* Right panel — form */}
      <div className="login-panel-right">
        <div className="login-card">

          {/* Header */}
          <div className="login-card-header">
            <img src="/logo.png" alt="Buuttii" className="login-card-logo" />
            <div>
              <h2 className="login-card-title">
                {step === 'login' ? 'Admin Sign In' : 'Verify OTP'}
              </h2>
              <p className="login-card-sub">
                {step === 'login'
                  ? 'Sign in to the Buuttii Admin Portal'
                  : `OTP sent to ${pendingPhone}`}
              </p>
            </div>
          </div>

          {step === 'login' ? (
            <form onSubmit={handleLogin} className="login-form" id="admin-login-form">
              <Input
                id="admin-phone"
                label="Phone Number"
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
              <Input
                id="admin-username"
                label="Your Name (Optional)"
                type="text"
                placeholder="e.g. Rohit Shidling"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="name"
              />
              <Input
                id="admin-password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              {error && <p className="login-error">{error}</p>}
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={loading}
                id="admin-login-submit"
              >
                Continue →
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="login-form" id="admin-otp-form">
              <div className="otp-info">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.76a16 16 0 0 0 6.34 6.34l1.56-1.56a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                <span>Enter the 6-digit OTP sent to your registered phone.</span>
              </div>
              <Input
                id="admin-otp"
                label="OTP Code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="· · · · · ·"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                required
                autoComplete="one-time-code"
              />
              {error && <p className="login-error">{error}</p>}
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={loading}
                id="admin-otp-submit"
              >
                Verify &amp; Login
              </Button>
              <button
                type="button"
                className="back-link"
                onClick={() => { setOtp(''); setError(''); }}
                id="back-to-login"
              >
                ← Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

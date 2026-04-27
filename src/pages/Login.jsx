import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input, Button } from '../components/FormElements';
import './Login.css';

export default function LoginPage() {
  const { isAuthenticated, step, loading, sendOTP, verifyOTP, pendingPhone } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone || !password) { setError('Please enter phone and password.'); return; }
    const res = await sendOTP(phone, password);
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
      {/* Background decoration */}
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
      </div>

      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <h1 className="login-title">MealAdmin</h1>
          <p className="login-subtitle">
            {step === 'login' ? 'Sign in to admin dashboard' : `OTP sent to ${pendingPhone}`}
          </p>
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
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="login-form" id="admin-otp-form">
            <div className="otp-info">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.76a16 16 0 0 0 6.34 6.34l1.56-1.56a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <p>Enter the 6-digit OTP sent to your phone.</p>
            </div>
            <Input
              id="admin-otp"
              label="OTP Code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
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
              Verify & Login
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
  );
}

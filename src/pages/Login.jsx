import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input, Button } from '../components/FormElements';
import { 
  HiOutlineBuildingOffice2, 
  HiOutlineTicket, 
  HiOutlineChartBar, 
  HiOutlineQueueList,
  HiOutlinePhone,
  HiArrowRight,
  HiArrowLeft
} from 'react-icons/hi2';
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
    if (!phone || !password || !username) { 
      setError('Please enter phone, password and username.'); 
      return; 
    }
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
        </div>
        <div className="login-features">
          {[
            { icon: <HiOutlineBuildingOffice2 />, label: 'School & Corporate Management' },
            { icon: <HiOutlineTicket />, label: 'Subscription & Trial Plans' },
            { icon: <HiOutlineChartBar />, label: 'Real-time Analytics' },
            { icon: <HiOutlineQueueList />, label: 'Daily Menu & Token System' },
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
                label="Admin Username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
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
                Continue <HiArrowRight style={{ marginLeft: '8px' }} />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="login-form" id="admin-otp-form">
              <div className="otp-info">
                <HiOutlinePhone className="otp-info-icon" />
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
                <HiArrowLeft style={{ marginRight: '8px' }} /> Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminAuthAPI, TokenService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(TokenService.getUser());
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('login'); // 'login' | 'otp'
  const [pendingPhone, setPendingPhone] = useState('');
  const [challengeToken, setChallengeToken] = useState('');

  const isAuthenticated = !!TokenService.getAccessToken() && !!user;

  const sendOTP = useCallback(async (phone, password, username) => {
    setLoading(true);
    try {
      const data = await adminAuthAPI.login(phone, password, username);
      setPendingPhone(phone);
      setChallengeToken(data.challengeToken || '');
      setStep('otp');
      return { success: true, message: data.message };
    } catch (err) {
      const message =
        err?.data?.errors?.[0] ||
        err?.data?.message ||
        err?.message ||
        'Failed to send OTP.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (otp) => {
    setLoading(true);
    try {
      const res = await adminAuthAPI.verifyOTP(pendingPhone, otp, challengeToken);
      // Backend response: { success, data: { accessToken, refreshToken, user } }
      const { accessToken, refreshToken, user } = res.data || res;
      TokenService.setTokens(accessToken, refreshToken);
      TokenService.setUser(user);
      setUser(user);
      setStep('login');
      setChallengeToken('');
      setPendingPhone('');
      return { success: true };
    } catch (err) {
      const message =
        err?.data?.errors?.[0] ||
        err?.data?.message ||
        err?.message ||
        'Invalid OTP.';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, [pendingPhone, challengeToken]);

  const logout = useCallback(async () => {
    try { await adminAuthAPI.logout(); } catch (_logoutError) {
      // logout should clear local session even if API fails
    }
    TokenService.clear();
    setUser(null);
    setStep('login');
    setPendingPhone('');
    setChallengeToken('');
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated, step,
      pendingPhone, sendOTP, verifyOTP, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

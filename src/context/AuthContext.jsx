import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminAuthAPI, TokenService, SESSION_EXPIRED_EVENT } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(TokenService.getUser());
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('login'); // 'login' | 'otp'
  const [pendingPhone, setPendingPhone] = useState('');
  const [challengeToken, setChallengeToken] = useState('');

  const isAuthenticated = !!TokenService.getAccessToken() && !!user;

  const clearSession = useCallback(() => {
    TokenService.clear();
    setUser(null);
    setStep('login');
    setPendingPhone('');
    setChallengeToken('');
  }, []);

  const resetLoginStep = useCallback(() => {
    setStep('login');
    setPendingPhone('');
    setChallengeToken('');
  }, []);

  useEffect(() => {
    const onExpired = () => clearSession();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  useEffect(() => {
    if (!TokenService.getAccessToken() && user) {
      setUser(null);
    }
  }, [user]);

  const sendOTP = useCallback(async (phone, password, username) => {
    setLoading(true);
    try {
      const data = await adminAuthAPI.login(phone, password, username);
      const token = data?.challengeToken ?? data?.data?.challengeToken;
      if (!token) {
        return { success: false, message: 'Login challenge missing. Please try again.' };
      }
      setPendingPhone(phone);
      setChallengeToken(token);
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
      const payload = res?.data ?? res;
      const accessToken = payload?.accessToken;
      const refreshToken = payload?.refreshToken;
      const user = payload?.user;
      if (!accessToken || !user) {
        return { success: false, message: 'Login response incomplete. Please try again.' };
      }
      TokenService.setTokens(accessToken, refreshToken);
      TokenService.setUser(user);
      setUser(user);
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
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{
      user, loading, isAuthenticated, step,
      pendingPhone, sendOTP, verifyOTP, logout, clearSession, resetLoginStep,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

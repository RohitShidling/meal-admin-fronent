import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminAuthAPI, TokenService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(TokenService.getUser());
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('login'); // 'login' | 'otp'
  const [pendingPhone, setPendingPhone] = useState('');

  const isAuthenticated = !!TokenService.getAccessToken() && !!user;

  const sendOTP = useCallback(async (phone, password, username) => {
    setLoading(true);
    try {
      const data = await adminAuthAPI.login(phone, password, username);
      setPendingPhone(phone);
      setStep('otp');
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(async (otp) => {
    setLoading(true);
    try {
      const res = await adminAuthAPI.verifyOTP(pendingPhone, otp);
      // Backend response: { success, data: { accessToken, refreshToken, user } }
      const { accessToken, refreshToken, user } = res.data || res;
      TokenService.setTokens(accessToken, refreshToken);
      TokenService.setUser(user);
      setUser(user);
      setStep('login');
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  }, [pendingPhone]);

  const logout = useCallback(async () => {
    try { await adminAuthAPI.logout(); } catch {}
    TokenService.clear();
    setUser(null);
    setStep('login');
    setPendingPhone('');
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

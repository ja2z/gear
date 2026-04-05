import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import {
  DEV_AUTH_BYPASS_STORAGE_KEY,
  DEV_MOCK_USER,
  isDevAuthBypassActive,
} from '../config/devAuthBypass';

const API_BASE_URL = getApiBaseUrl();

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => (isDevAuthBypassActive() ? DEV_MOCK_USER : null));
  const [loading, setLoading] = useState(() => !isDevAuthBypassActive());

  const refreshUser = useCallback(async () => {
    if (isDevAuthBypassActive()) {
      setUser(DEV_MOCK_USER);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const devBypassLogin = useCallback(() => {
    if (!import.meta.env.DEV) return;
    sessionStorage.setItem(DEV_AUTH_BYPASS_STORAGE_KEY, '1');
    setUser(DEV_MOCK_USER);
    setLoading(false);
  }, []);

  const logout = useCallback(async () => {
    if (import.meta.env.DEV && sessionStorage.getItem(DEV_AUTH_BYPASS_STORAGE_KEY) === '1') {
      sessionStorage.removeItem(DEV_AUTH_BYPASS_STORAGE_KEY);
      setUser(null);
      return;
    }
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Proceed with local logout regardless
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        logout,
        refreshUser,
        ...(import.meta.env.DEV ? { devBypassLogin } : {}),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

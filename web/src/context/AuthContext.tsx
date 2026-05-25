import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { authApi } from '../api/endpoints';
import { clearToken, getToken, setToken } from '../api/client';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    fullName: string;
    email: string;
    birthDate: string;
    password: string;
    passwordConfirmation: string;
  }) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(getToken()));

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUserState(null);
      setLoading(false);
      return;
    }
    try {
      const u = await authApi.me();
      setUserState(u);
    } catch {
      clearToken();
      setUserState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await authApi.login(email, password);
    setToken(token);
    setUserState(u);
    return u;
  }, []);

  const register = useCallback(
    async (data: {
      fullName: string;
      email: string;
      birthDate: string;
      password: string;
      passwordConfirmation: string;
    }) => {
      const { token, user: u } = await authApi.register(data);
      setToken(token);
      setUserState(u);
      return u;
    },
    [],
  );

  const logout = useCallback(() => {
    clearToken();
    setUserState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, refresh, setUser: setUserState }),
    [user, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

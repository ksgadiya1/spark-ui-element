import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  configureApiClient,
  getCurrentUser,
  getMetaLoginUrl,
  login as loginRequest,
  loginWithMetaSdk as loginWithMetaSdkRequest,
  refreshAuthToken,
  register as registerRequest,
  type AuthResponse,
  type AuthTokens,
  type LoginPayload,
  type MetaSdkLoginPayload,
  type RegisterPayload,
  type User,
} from "@/services/api";

const AUTH_STORAGE_KEY = "spark-auth-session";

interface StoredSession {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  loginWithMeta: (payload?: MetaSdkLoginPayload) => Promise<User | void>;
  completeMetaLogin: (payload: AuthResponse | AuthTokens) => Promise<User>;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User>;
  refreshSession: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredSession(): StoredSession {
  if (typeof window === "undefined") {
    return { user: null, accessToken: null, refreshToken: null };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { user: null, accessToken: null, refreshToken: null };
    }

    const parsed = JSON.parse(raw) as StoredSession;
    return {
      user: parsed.user ?? null,
      accessToken: parsed.accessToken ?? null,
      refreshToken: parsed.refreshToken ?? null,
    };
  } catch {
    return { user: null, accessToken: null, refreshToken: null };
  }
}

function writeStoredSession(session: StoredSession) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session.accessToken && !session.refreshToken) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initialSession = useMemo(readStoredSession, []);
  const [user, setUser] = useState<User | null>(initialSession.user);
  const [accessToken, setAccessToken] = useState<string | null>(initialSession.accessToken);
  const [refreshToken, setRefreshToken] = useState<string | null>(initialSession.refreshToken);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const userRef = useRef<User | null>(initialSession.user);
  const accessTokenRef = useRef<string | null>(initialSession.accessToken);
  const refreshTokenRef = useRef<string | null>(initialSession.refreshToken);

  const persistSession = useCallback((next: StoredSession) => {
    userRef.current = next.user;
    accessTokenRef.current = next.accessToken;
    refreshTokenRef.current = next.refreshToken;
    setUser(next.user);
    setAccessToken(next.accessToken);
    setRefreshToken(next.refreshToken);
    writeStoredSession(next);
  }, []);

  const clearSession = useCallback(() => {
    persistSession({ user: null, accessToken: null, refreshToken: null });
  }, [persistSession]);

  const applyAuthResponse = useCallback((response: AuthResponse) => {
    persistSession({
      user: response.user,
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
    });
    return response.user;
  }, [persistSession]);

  const handleTokensUpdated = useCallback((tokens: AuthTokens) => {
    persistSession({
      user: userRef.current,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
  }, [persistSession]);

  const refreshTokens = useCallback(async (token: string) => {
    return refreshAuthToken({ refresh_token: token });
  }, []);

  const refreshUser = useCallback(async () => {
    const currentUser = await getCurrentUser();
    persistSession({
      user: currentUser,
      accessToken: accessTokenRef.current,
      refreshToken: refreshTokenRef.current,
    });
    return currentUser;
  }, [persistSession]);

  const completeMetaLogin = useCallback(async (payload: AuthResponse | AuthTokens) => {
    if ("user" in payload) {
      return applyAuthResponse(payload);
    }

    handleTokensUpdated(payload);
    return refreshUser();
  }, [applyAuthResponse, handleTokensUpdated, refreshUser]);

  const refreshSession = useCallback(async () => {
    if (!refreshTokenRef.current && !accessTokenRef.current) {
      clearSession();
      return null;
    }

    if (refreshTokenRef.current) {
      const nextTokens = await refreshTokens(refreshTokenRef.current);
      handleTokensUpdated(nextTokens);
    }

    return refreshUser();
  }, [clearSession, handleTokensUpdated, refreshTokens, refreshUser]);

  useEffect(() => {
    configureApiClient({
      getAccessToken: () => accessTokenRef.current,
      getRefreshToken: () => refreshTokenRef.current,
      refreshTokens,
      onTokensUpdated: handleTokensUpdated,
      onUnauthorized: clearSession,
    });
  }, [clearSession, handleTokensUpdated, refreshTokens]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const hasSession = !!accessTokenRef.current || !!refreshTokenRef.current;

      if (!hasSession) {
        if (active) {
          setIsBootstrapping(false);
        }
        return;
      }

      try {
        await refreshSession();
      } catch {
        if (active) {
          clearSession();
        }
      } finally {
        if (active) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [clearSession, refreshUser]);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await loginRequest(payload);
    return applyAuthResponse(response);
  }, [applyAuthResponse]);

  const register = useCallback(async (payload: RegisterPayload) => {
    const response = await registerRequest(payload);
    return applyAuthResponse(response);
  }, [applyAuthResponse]);

  const loginWithMeta = useCallback(async (payload?: MetaSdkLoginPayload) => {
    if (payload?.access_token) {
      const response = await loginWithMetaSdkRequest(payload);
      return applyAuthResponse(response);
    }

    const response = await getMetaLoginUrl();
    window.location.href = response.redirect_url;
  }, [applyAuthResponse]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    accessToken,
    refreshToken,
    isAuthenticated: !!user && !!accessToken,
    isBootstrapping,
    loginWithMeta,
    completeMetaLogin,
    login,
    register,
    logout: clearSession,
    refreshUser,
    refreshSession,
  }), [accessToken, clearSession, completeMetaLogin, isBootstrapping, login, loginWithMeta, refreshSession, refreshToken, refreshUser, register, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

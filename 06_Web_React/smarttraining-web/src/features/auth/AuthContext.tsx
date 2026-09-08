import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { getCurrentUser, login } from "../../api/authApi";
import { getToken, removeToken, saveToken } from "../../utils/tokenStorage";
import type { AuthUser, LoginRequest } from "../../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  loginUser: (request: LoginRequest) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateSessionToken: (nextToken: string) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    const currentToken = getToken();

    if (!currentToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setToken(currentToken);
    } catch {
      removeToken();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  async function updateSessionToken(nextToken: string): Promise<AuthUser> {
    saveToken(nextToken);
    setToken(nextToken);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      removeToken();
      setToken(null);
      setUser(null);
      throw error;
    }
  }

  async function loginUser(request: LoginRequest): Promise<AuthUser> {
    const response = await login(request);
    saveToken(response.token);
    setToken(response.token);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      removeToken();
      setToken(null);
      setUser(null);
      throw error;
    }
  }

  function logout() {
    removeToken();
    setUser(null);
    setToken(null);
  }

  useEffect(() => {
    void refreshUser();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      loginUser,
      logout,
      refreshUser,
      updateSessionToken,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth doit être utilisé dans AuthProvider");
  }

  return context;
}

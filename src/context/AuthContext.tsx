import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loginAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "devpulse_auth";

const demoUser: User = {
  id: "u1",
  name: "Sarah Chen",
  email: "sarah@devpulse.io",
  role: "OWNER",
  createdAt: "2024-01-15T10:00:00Z",
};

// Simple in-memory user store for local auth
const localUsers: Map<string, { user: User; passwordHash: string }> = new Map();
localUsers.set("sarah@devpulse.io", { user: demoUser, passwordHash: "demo123" });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as User;
        setState({ user, isAuthenticated: true, isLoading: false });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        setState(s => ({ ...s, isLoading: false }));
      }
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await new Promise(r => setTimeout(r, 500));
    const entry = localUsers.get(email);
    if (!entry || entry.passwordHash !== password) {
      throw new Error("Invalid email or password");
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry.user));
    setState({ user: entry.user, isAuthenticated: true, isLoading: false });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await new Promise(r => setTimeout(r, 500));
    if (localUsers.has(email)) {
      throw new Error("An account with this email already exists");
    }
    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      email,
      role: "MEMBER",
      createdAt: new Date().toISOString(),
    };
    localUsers.set(email, { user: newUser, passwordHash: password });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setState({ user: newUser, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const loginAsDemo = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
    setState({ user: demoUser, isAuthenticated: true, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

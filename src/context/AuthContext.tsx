import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser, Session } from "@supabase/supabase-js";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
}

interface AuthState {
  user: AppUser | null;
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

async function fetchAppUser(supabaseUser: SupabaseUser): Promise<AppUser> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", supabaseUser.id)
    .single();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", supabaseUser.id);

  const topRole = roles?.length
    ? roles.some(r => r.role === "owner") ? "OWNER"
      : roles.some(r => r.role === "admin") ? "ADMIN"
      : "MEMBER"
    : "MEMBER";

  return {
    id: supabaseUser.id,
    name: profile?.name || supabaseUser.email?.split("@")[0] || "User",
    email: supabaseUser.email || "",
    role: topRole,
    avatarUrl: profile?.avatar_url || undefined,
    createdAt: supabaseUser.created_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          setTimeout(async () => {
            try {
              const appUser = await fetchAppUser(session.user);
              setState({ user: appUser, isAuthenticated: true, isLoading: false });
            } catch {
              setState({ user: null, isAuthenticated: false, isLoading: false });
            }
          }, 0);
        } else {
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const appUser = await fetchAppUser(session.user);
          setState({ user: appUser, isAuthenticated: true, isLoading: false });
        } catch {
          setState({ user: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        setState(s => ({ ...s, isLoading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw new Error(error.message);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const loginAsDemo = useCallback(async () => {
    // Sign in with pre-seeded demo account
    const { error } = await supabase.auth.signInWithPassword({
      email: "sarah@devpulse.io",
      password: "demo123456",
    });
    if (error) {
      // If demo account doesn't exist yet, create it
      const { error: signUpError } = await supabase.auth.signUp({
        email: "sarah@devpulse.io",
        password: "demo123456",
        options: { data: { name: "Sarah Chen" } },
      });
      if (signUpError) throw new Error(signUpError.message);
    }
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

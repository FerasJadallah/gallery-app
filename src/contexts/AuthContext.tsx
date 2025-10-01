"use client";

import { getSupabaseClient } from "@/app/supabase/client";
import type { AuthError, Session, User } from "@supabase/supabase-js";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (
    credentials: Parameters<typeof supabase.auth.signInWithPassword>[0]
  ) => ReturnType<typeof supabase.auth.signInWithPassword>;
  signOut: () => ReturnType<typeof supabase.auth.signOut>;
  refreshSession: () => Promise<{
    data: { session: Session | null };
    error: AuthError | null;
  }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (error) {
        console.error("Failed to load Supabase session", error);
        applySession(null);
      } else {
        applySession(data.session);
      }
      setLoading(false);
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      applySession(newSession);
    });

    void init();

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, [applySession, supabase]);

  const signInWithPassword = useCallback<
    AuthContextValue["signInWithPassword"]
  >(async (credentials) => {
    const result = await supabase.auth.signInWithPassword(credentials);
    if (result.error) {
      console.error("Supabase sign-in failed", result.error);
    } else {
      applySession(result.data.session);
    }
    return result;
  }, [applySession, supabase]);

  const signOut = useCallback<AuthContextValue["signOut"]>(async () => {
    const result = await supabase.auth.signOut();
    if (result.error) {
      console.error("Supabase sign-out failed", result.error);
    } else {
      applySession(null);
    }
    return result;
  }, [applySession, supabase]);

  const refreshSession = useCallback<AuthContextValue["refreshSession"]>(async () => {
    const result = await supabase.auth.getSession();
    if (result.error) {
      console.error("Failed to refresh Supabase session", result.error);
    }
    applySession(result.data.session);
    return result;
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signInWithPassword,
      signOut,
      refreshSession,
    }),
    [loading, refreshSession, session, signInWithPassword, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

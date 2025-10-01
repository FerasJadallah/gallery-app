"use client";

import { getSupabaseClient } from "@/app/supabase/client";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type SignInWithPasswordFn = SupabaseClient["auth"]["signInWithPassword"];
type SignOutFn = SupabaseClient["auth"]["signOut"];
type GetSessionFn = SupabaseClient["auth"]["getSession"];

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (
    credentials: Parameters<SignInWithPasswordFn>[0]
  ) => ReturnType<SignInWithPasswordFn>;
  signOut: () => ReturnType<SignOutFn>;
  refreshSession: () => ReturnType<GetSessionFn>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const supabase = useMemo<SupabaseClient | null>(() => {
    if (!hasSupabaseEnv) {
      return null;
    }
    return getSupabaseClient();
  }, [hasSupabaseEnv]);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

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

  const signInWithPassword = useCallback<AuthContextValue["signInWithPassword"]>(
    async (credentials) => {
      if (!supabase) {
        throw new Error(
          "Supabase environment variables are not configured. Unable to sign in."
        );
      }
      const result = await supabase.auth.signInWithPassword(credentials);
      if (result.error) {
        console.error("Supabase sign-in failed", result.error);
      } else {
        applySession(result.data.session);
      }
      return result;
    },
    [applySession, supabase]
  );

  const signOut = useCallback<AuthContextValue["signOut"]>(
    async () => {
      if (!supabase) {
        throw new Error(
          "Supabase environment variables are not configured. Unable to sign out."
        );
      }
      const result = await supabase.auth.signOut();
      if (result.error) {
        console.error("Supabase sign-out failed", result.error);
      } else {
        applySession(null);
      }
      return result;
    },
    [applySession, supabase]
  );

  const refreshSession = useCallback<AuthContextValue["refreshSession"]>(
    async () => {
      if (!supabase) {
        return {
          data: { session: null },
          error: null,
        };
      }
      const result = await supabase.auth.getSession();
      if (result.error) {
        console.error("Failed to refresh Supabase session", result.error);
      }
      applySession(result.data.session);
      return result;
    },
    [applySession, supabase]
  );

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

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, getProfile, getDailyUsage, incrementUsage, FREE_LIMITS, type Profile, type DailyUsage } from '../services/supabase';
import type { Session, User } from '@supabase/supabase-js';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  dailyUsage: DailyUsage;
  loading: boolean;
  isPremium: boolean;
  canAnalyze: boolean;
  canChat: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  trackAnalysis: () => Promise<boolean>;   // devuelve false si límite alcanzado
  trackChat: () => Promise<boolean>;
  refreshUsage: () => Promise<void>;
  showLoginModal: boolean;
  setShowLoginModal: (v: boolean) => void;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (v: boolean) => void;
  upgradeReason: string;
  setUpgradeReason: (v: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage>({ ai_analyses: 0, chat_messages: 0 });
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState('');

  const isPremium = profile?.is_premium ?? false;
  const canAnalyze = isPremium || dailyUsage.ai_analyses < FREE_LIMITS.ai_analyses;
  const canChat = isPremium || dailyUsage.chat_messages < FREE_LIMITS.chat_messages;

  // ─── Inicialización de sesión ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
        loadUsage(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
        await loadUsage(session.user.id);
      } else {
        setProfile(null);
        setDailyUsage({ ai_analyses: 0, chat_messages: 0 });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const p = await getProfile(userId);
    setProfile(p);
  }

  async function loadUsage(userId: string) {
    const usage = await getDailyUsage(userId);
    setDailyUsage(usage);
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────
  async function signInWithGoogle() {
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'https://project-o8ei0.vercel.app/auth/callback';

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: { prompt: 'select_account' },
      },
    });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  // ─── Tracking de uso ──────────────────────────────────────────────────────
  async function trackAnalysis(): Promise<boolean> {
    if (!user) {
      setShowLoginModal(true);
      return false;
    }
    if (!canAnalyze) {
      setUpgradeReason('análisis de IA');
      setShowUpgradeModal(true);
      return false;
    }
    await incrementUsage(user.id, 'ai_analyses');
    setDailyUsage(prev => ({ ...prev, ai_analyses: prev.ai_analyses + 1 }));
    return true;
  }

  async function trackChat(): Promise<boolean> {
    if (!user) {
      setShowLoginModal(true);
      return false;
    }
    if (!canChat) {
      setUpgradeReason('mensajes de chat');
      setShowUpgradeModal(true);
      return false;
    }
    await incrementUsage(user.id, 'chat_messages');
    setDailyUsage(prev => ({ ...prev, chat_messages: prev.chat_messages + 1 }));
    return true;
  }

  async function refreshUsage() {
    if (user) await loadUsage(user.id);
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile, dailyUsage, loading, isPremium,
      canAnalyze, canChat,
      signInWithGoogle, signOut,
      trackAnalysis, trackChat, refreshUsage,
      showLoginModal, setShowLoginModal,
      showUpgradeModal, setShowUpgradeModal,
      upgradeReason, setUpgradeReason,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

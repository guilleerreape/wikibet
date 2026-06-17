import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, getProfile, getDailyUsage, incrementUsage, FREE_LIMITS, type Profile, type DailyUsage } from '../services/supabase';
import type { Session, User } from '@supabase/supabase-js';

const BYPASS_CODE   = '130823';
const BYPASS_KEY    = 'wikibet_bypass';
const WELCOME_KEY   = 'wikibet_welcomed_v2';

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  dailyUsage: DailyUsage;
  loading: boolean;
  isAuthenticated: boolean;   // true si Google login O bypass code
  bypassActive: boolean;
  isPremium: boolean;
  canAnalyze: boolean;
  canChat: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithCode: (code: string) => boolean;
  signOut: () => Promise<void>;
  trackAnalysis: () => Promise<boolean>;
  trackChat: () => Promise<boolean>;
  refreshUsage: () => Promise<void>;
  showLoginModal: boolean;
  setShowLoginModal: (v: boolean) => void;
  showUpgradeModal: boolean;
  setShowUpgradeModal: (v: boolean) => void;
  upgradeReason: string;
  setUpgradeReason: (v: string) => void;
  showWelcomeModal: boolean;
  setShowWelcomeModal: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Persistencia del bypass en localStorage (web) ───────────────────────────
function readBypass(): boolean {
  try { return typeof localStorage !== 'undefined' && localStorage.getItem(BYPASS_KEY) === '1'; }
  catch { return false; }
}
function saveBypass(v: boolean) {
  try { if (typeof localStorage !== 'undefined') {
    if (v) localStorage.setItem(BYPASS_KEY, '1');
    else localStorage.removeItem(BYPASS_KEY);
  }} catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]           = useState<Session | null>(null);
  const [user, setUser]                 = useState<User | null>(null);
  const [profile, setProfile]           = useState<Profile | null>(null);
  const [dailyUsage, setDailyUsage]     = useState<DailyUsage>({ ai_analyses: 0, chat_messages: 0 });
  const [loading, setLoading]           = useState(true);
  const [bypassActive, setBypassActive] = useState(() => readBypass()); // sync init from localStorage
  const [showLoginModal, setShowLoginModal]     = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeReason, setUpgradeReason]       = useState('');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const isPremium      = bypassActive || (profile?.is_premium ?? false);
  const isAuthenticated = !!user || bypassActive;
  const canAnalyze     = isPremium || dailyUsage.ai_analyses < FREE_LIMITS.ai_analyses;
  const canChat        = isPremium || dailyUsage.chat_messages < FREE_LIMITS.chat_messages;

  // ─── Inicialización ───────────────────────────────────────────────────────
  useEffect(() => {
    // bypassActive already initialized synchronously from localStorage above

    // Si la URL tiene token de OAuth (implicit flow), esperar a que Supabase lo procese
    const hasOAuthToken = typeof window !== 'undefined' &&
      (window.location.hash.includes('access_token') ||
       window.location.search.includes('code='));

    const safetyTimer = setTimeout(() => setLoading(false), hasOAuthToken ? 6000 : 3000);

    // Con implicit flow, Supabase detecta el token del hash automáticamente
    // Esperamos un tick para que lo procese antes de llamar getSession
    const initDelay = hasOAuthToken ? 800 : 0;
    setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        clearTimeout(safetyTimer);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
          loadUsage(session.user.id);
        }
        setLoading(false);
      }).catch(() => {
        clearTimeout(safetyTimer);
        setLoading(false);
      });
    }, initDelay);

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
    // Mostrar bienvenida a usuarios free la primera vez (no bypass)
    if (p && !p.is_premium && !readBypass()) {
      try {
        const key = `${WELCOME_KEY}_${userId}`;
        const welcomed = typeof localStorage !== 'undefined' && localStorage.getItem(key);
        if (!welcomed) {
          if (typeof localStorage !== 'undefined') localStorage.setItem(key, '1');
          setTimeout(() => setShowWelcomeModal(true), 1800);
        }
      } catch {}
    }
  }
  async function loadUsage(userId: string) {
    const usage = await getDailyUsage(userId);
    setDailyUsage(usage);
  }

  // ─── Auth ─────────────────────────────────────────────────────────────────
  async function signInWithGoogle() {
    // Siempre usar wikibet.app en producción para evitar redirects 307 que pierden el hash
    const isProd = typeof window !== 'undefined' &&
      (window.location.hostname === 'wikibet.app' ||
       window.location.hostname.endsWith('.vercel.app'));
    const redirectUrl = isProd
      ? `${window.location.origin}/auth/callback`
      : 'https://wikibet.app/auth/callback';
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectUrl, queryParams: { prompt: 'select_account' } },
    });
  }

  function loginWithCode(code: string): boolean {
    if (code.trim() === BYPASS_CODE) {
      setBypassActive(true);
      saveBypass(true);
      return true;
    }
    return false;
  }

  async function signOut() {
    setBypassActive(false);
    saveBypass(false);
    await supabase.auth.signOut();
  }

  // ─── Tracking ─────────────────────────────────────────────────────────────
  async function trackAnalysis(): Promise<boolean> {
    if (!isAuthenticated) { setShowLoginModal(true); return false; }
    if (!canAnalyze) { setUpgradeReason('análisis de IA'); setShowUpgradeModal(true); return false; }
    if (user) {
      await incrementUsage(user.id, 'ai_analyses');
      setDailyUsage(prev => ({ ...prev, ai_analyses: prev.ai_analyses + 1 }));
    }
    return true;
  }

  async function trackChat(): Promise<boolean> {
    if (!isAuthenticated) { setShowLoginModal(true); return false; }
    if (!canChat) { setUpgradeReason('mensajes de chat'); setShowUpgradeModal(true); return false; }
    if (user) {
      await incrementUsage(user.id, 'chat_messages');
      setDailyUsage(prev => ({ ...prev, chat_messages: prev.chat_messages + 1 }));
    }
    return true;
  }

  async function refreshUsage() {
    if (user) await loadUsage(user.id);
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile, dailyUsage, loading,
      isAuthenticated, bypassActive, isPremium,
      canAnalyze, canChat,
      signInWithGoogle, loginWithCode, signOut,
      trackAnalysis, trackChat, refreshUsage,
      showLoginModal, setShowLoginModal,
      showUpgradeModal, setShowUpgradeModal,
      upgradeReason, setUpgradeReason,
      showWelcomeModal, setShowWelcomeModal,
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

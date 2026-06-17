import { Tabs } from 'expo-router';
import { TouchableOpacity, Text, View, StyleSheet, Modal, Pressable, Linking, Animated, Platform } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { FREE_LIMITS } from '@/services/supabase';
import { getQuickStats, seedHistoricalData } from '@/services/predictionTracker';
import AccuracyModal from '@/components/AccuracyModal';

const STRIPE_BASE = 'https://buy.stripe.com/bJeaEXbVg6vh6QJ19S0kE00';

// ─── Título animado "⚽ WikiBet" ──────────────────────────────────────────────
function AnimatedWikiTitle() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2800, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 2800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const color = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#22c55e', '#f59e0b', '#22c55e'],
  });

  const tagAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(tagAnim, { toValue: 1, duration: 3000, useNativeDriver: false }),
        Animated.timing(tagAnim, { toValue: 0, duration: 3000, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const tagColor = tagAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#374151', '#6b7280'],
  });

  return (
    <View style={at.col}>
      <View style={at.wrap}>
        <Animated.Text style={[at.text, { color }]}>⚽ WikiBet</Animated.Text>
        <View style={at.dot} />
      </View>
      <Animated.Text style={[at.tagline, { color: tagColor }]}>
        IA · Análisis · Pronósticos · Mundial 2026
      </Animated.Text>
    </View>
  );
}

// ─── Neon header reactivo para tabs ──────────────────────────────────────────
function NeonTabHeader({
  emoji, title, subtitle,
  neonColors,
}: {
  emoji: string; title: string; subtitle?: string;
  neonColors: [string, string, string];
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: -2, duration: 1100, useNativeDriver: true }),
        Animated.timing(float, { toValue: 2, duration: 1100, useNativeDriver: true }),
      ])
    ).start();
    return () => { anim.stopAnimation(); float.stopAnimation(); };
  }, []);

  const color = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [neonColors[0], neonColors[1], neonColors[2]],
  });
  const emojiScale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] });

  return (
    <View style={nh.wrap}>
      <Animated.Text style={[nh.emoji, { transform: [{ scale: emojiScale }, { translateY: float }] }]}>
        {emoji}
      </Animated.Text>
      <View style={nh.textCol}>
        <Animated.Text style={[nh.title, { color }]}>{title}</Animated.Text>
        {subtitle ? <Text style={nh.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const nh = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 19 },
  textCol: { flexDirection: 'column' },
  title: { fontSize: 16, fontWeight: '900', letterSpacing: 0.4 },
  subtitle: { fontSize: 9, color: '#6b7280', fontWeight: '600', letterSpacing: 0.3, marginTop: 1 },
});

const at = StyleSheet.create({
  col: { flexDirection: 'column', alignItems: 'flex-start' },
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontSize: 23, fontWeight: '900', letterSpacing: 0.3 },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#ef4444',
    marginTop: 2,
  },
  tagline: { fontSize: 8, fontWeight: '600', letterSpacing: 0.4, marginTop: 1 },
});

// ─── TabIcon — emoji + label + green dot + optional AI ring ──────────────────
function TabIcon({ emoji, label, focused, isAI = false }: { emoji: string; label: string; focused: boolean; isAI?: boolean }) {
  const scaleAnim  = useRef(new Animated.Value(focused ? 1 : 0.82)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;
  const ringAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Spring the emoji scale when focused changes
    Animated.spring(scaleAnim, {
      toValue: focused ? 1 : 0.82,
      useNativeDriver: true,
      damping: 12,
      stiffness: 200,
    }).start();
  }, [focused]);

  useEffect(() => {
    // Always-on pulsing ring for AI tab
    if (isAI) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, { toValue: 1, duration: 1200, useNativeDriver: false }),
          Animated.timing(ringAnim, { toValue: 0, duration: 1200, useNativeDriver: false }),
        ])
      ).start();
    }
    return () => { ringAnim.stopAnimation(); };
  }, [isAI]);

  useEffect(() => {
    if (focused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1400, useNativeDriver: false }),
        ])
      ).start();
    } else {
      glowAnim.stopAnimation();
      glowAnim.setValue(0);
    }
    return () => { glowAnim.stopAnimation(); };
  }, [focused]);

  const labelColor = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: focused
      ? ['#22c55e', '#f59e0b', '#22c55e']
      : [colors.text.muted, colors.text.muted, colors.text.muted],
  });

  const ringBorderColor = ringAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#22c55e60', '#22c55ecc', '#22c55e60'],
  });
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] });

  const inner = (
    <View style={ti.wrap}>
      {/* Green indicator line at top when focused */}
      {focused && <View style={ti.topLine} />}
      {/* Emoji */}
      <Animated.Text style={[ti.emoji, { transform: [{ scale: scaleAnim }], fontSize: focused ? 22 : 18 }]}>
        {emoji}
      </Animated.Text>
      {/* Label */}
      <Animated.Text style={[ti.label, { color: labelColor, fontWeight: focused ? '800' : '600' }]}>
        {label}
      </Animated.Text>
      {/* Green glowing dot under active tab */}
      {focused && <View style={ti.dot} />}
    </View>
  );

  if (isAI) {
    return (
      <Animated.View style={[ti.aiRing, { borderColor: ringBorderColor, opacity: ringOpacity }]}>
        {inner}
      </Animated.View>
    );
  }
  return inner;
}

const ti = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 2, minWidth: 52 },
  topLine: {
    position: 'absolute', top: -6, left: '20%', right: '20%',
    height: 2, backgroundColor: '#22c55e', borderRadius: 1,
  },
  emoji: { textAlign: 'center' },
  label: { fontSize: 9, marginTop: 2, letterSpacing: 0.1, textAlign: 'center' },
  dot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: '#22c55e',
    marginTop: 3,
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 4,
  },
  aiRing: {
    borderWidth: 1.5, borderRadius: 12,
    padding: 2,
    marginBottom: 2,
  },
});

// ─── Menú desplegable de perfil ───────────────────────────────────────────────
function ProfileMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, profile, bypassActive, isPremium, dailyUsage, signOut } = useAuth();

  function getStripeUrl() {
    let url = STRIPE_BASE;
    if (user?.id)    url += `?client_reference_id=${user.id}`;
    if (user?.email) url += `&prefilled_email=${encodeURIComponent(user.email)}`;
    return url;
  }

  const fullName   = profile?.full_name ?? user?.email ?? (bypassActive ? 'Admin' : 'Usuario');
  const email      = user?.email ?? (bypassActive ? 'Acceso con código' : '');
  const initial    = bypassActive ? '👑' : fullName[0].toUpperCase();
  const planLabel  = bypassActive ? '👑 Admin' : isPremium ? '⚡ Premium+' : '🆓 Plan gratuito';
  const planColor  = bypassActive ? '#f59e0b' : isPremium ? '#22c55e' : colors.text.muted;

  const analysesLeft = FREE_LIMITS.ai_analyses - dailyUsage.ai_analyses;
  const chatsLeft    = FREE_LIMITS.chat_messages - dailyUsage.chat_messages;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={m.menu} onPress={e => e.stopPropagation()}>

          {/* Cabecera con avatar + nombre */}
          <View style={m.header}>
            <View style={m.avatarLg}>
              <Text style={m.avatarLgText}>{initial}</Text>
            </View>
            <View style={m.headerInfo}>
              <Text style={m.name} numberOfLines={1}>{fullName}</Text>
              {email ? <Text style={m.email} numberOfLines={1}>{email}</Text> : null}
              <View style={[m.planBadge, { borderColor: planColor + '60' }]}>
                <Text style={[m.planText, { color: planColor }]}>{planLabel}</Text>
              </View>
            </View>
          </View>

          {/* Uso diario (solo free) */}
          {!isPremium && !bypassActive && (
            <View style={m.usageBox}>
              <UsageBar label="🔍 Análisis" used={dailyUsage.ai_analyses} limit={FREE_LIMITS.ai_analyses} />
              <UsageBar label="💬 Chat"     used={dailyUsage.chat_messages} limit={FREE_LIMITS.chat_messages} />
            </View>
          )}

          <View style={m.divider} />

          {/* Gestionar suscripción */}
          {!bypassActive && (
            <TouchableOpacity
              style={m.menuItem}
              onPress={() => { onClose(); Linking.openURL(getStripeUrl()); }}
            >
              <Text style={m.menuItemIcon}>⚡</Text>
              <View style={m.menuItemInfo}>
                <Text style={m.menuItemText}>
                  {isPremium ? 'Gestionar suscripción' : 'Actualizar a Premium+'}
                </Text>
                {!isPremium && <Text style={m.menuItemSub}>4,99 € / mes · Ilimitado</Text>}
              </View>
              <Text style={m.menuItemArrow}>›</Text>
            </TouchableOpacity>
          )}

          <View style={m.divider} />

          {/* Cerrar sesión */}
          <TouchableOpacity
            style={m.menuItem}
            onPress={() => { onClose(); signOut(); }}
          >
            <Text style={m.menuItemIcon}>🚪</Text>
            <Text style={[m.menuItemText, { color: colors.accent.red }]}>Cerrar sesión</Text>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(used / limit, 1);
  return (
    <View style={m.usageRow}>
      <Text style={m.usageLabel}>{label}</Text>
      <View style={m.barBg}>
        <View style={[m.barFill, {
          width: `${pct * 100}%` as any,
          backgroundColor: pct >= 1 ? colors.accent.red : colors.accent.green,
        }]} />
      </View>
      <Text style={m.usageCount}>{used}/{limit}</Text>
    </View>
  );
}

// ─── Botón de perfil en el header ─────────────────────────────────────────────
function ProfileButton() {
  const { user, profile, bypassActive, isPremium, setShowLoginModal } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user && !bypassActive) {
    return (
      <TouchableOpacity onPress={() => setShowLoginModal(true)} style={s.loginBtn}>
        <Text style={s.loginText}>Entrar</Text>
      </TouchableOpacity>
    );
  }

  const fullName = profile?.full_name ?? user?.email ?? '';
  const initial  = bypassActive ? '👑' : (fullName[0] ?? 'U').toUpperCase();

  return (
    <>
      <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.avatar} activeOpacity={0.8}>
        <Text style={s.avatarText}>{initial}</Text>
        {(isPremium || bypassActive) && <Text style={s.crown}>⚡</Text>}
      </TouchableOpacity>
      <ProfileMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

function UsagePill() {
  const { user, dailyUsage, isPremium, bypassActive } = useAuth();
  if (!user || isPremium || bypassActive) return null;
  const analyses = FREE_LIMITS.ai_analyses - dailyUsage.ai_analyses;
  const chats    = FREE_LIMITS.chat_messages - dailyUsage.chat_messages;
  return (
    <View style={s.pill}>
      <Text style={s.pillText}>🔍{analyses} 💬{chats}</Text>
    </View>
  );
}

// ─── Accuracy button (pulsing 🎯) ─────────────────────────────────────────────
function AccuracyButton({ onPress }: { onPress: () => void }) {
  const pulse  = useRef(new Animated.Value(1)).current;
  const glow   = useRef(new Animated.Value(0)).current;
  const [quickPct, setQuickPct] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  const loadAndSeed = async () => {
    try {
      let q = await getQuickStats();
      if (!q || q.total < 5) {
        // DB vacía → sembrar datos históricos del Mundial 2026
        await seedHistoricalData();
        q = await getQuickStats();
      }
      setQuickPct(q ? q.pct : null);
    } catch {
      // silent — botón mostrará '—'
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    // Pulsing ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.10, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1100, useNativeDriver: true }),
      ])
    ).start();
    // Glow color cycle
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2200, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 2200, useNativeDriver: false }),
      ])
    ).start();
    loadAndSeed();
    return () => { pulse.stopAnimation(); glow.stopAnimation(); };
  }, []);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['#22c55e', '#f59e0b'],
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[s.accuracyBtn, { borderColor, transform: [{ scale: pulse }] }]}>
        <Text style={s.accuracyEmoji}>🎯</Text>
        <View style={s.accuracyTextCol}>
          <Text style={s.accuracyPct}>
            {ready ? (quickPct !== null ? `${quickPct}%` : '—') : '···'}
          </Text>
          <Text style={s.accuracyLabel}>% Aciertos IA</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [accuracyVisible, setAccuracyVisible] = useState(false);
  // En móvil web, añadir padding extra para que no tape la barra del navegador
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'web' ? 10 : 8);
  const tabBarH   = 58 + bottomPad;

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bg.card },
        headerTitleStyle: { color: colors.text.primary, fontWeight: '700', fontSize: 17 },
        headerTitleAlign: 'center',
        headerTintColor: colors.accent.green,
        headerRight: () => (
          <View style={s.headerRight}>
            <UsagePill />
            <AccuracyButton onPress={() => setAccuracyVisible(true)} />
            <ProfileButton />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: colors.bg.card,
          borderTopColor: colors.border.medium,
          borderTopWidth: 1,
          paddingBottom: bottomPad,
          paddingTop: 6,
          height: tabBarH,
        },
        tabBarActiveTintColor: colors.accent.green,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: { display: 'none' },
        tabBarLabel: () => null,
        tabBarIconStyle: { marginBottom: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <AnimatedWikiTitle />,
          headerTitleAlign: 'center',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Partidos" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="value"
        options={{
          headerTitle: () => (
            <NeonTabHeader
              emoji="💰"
              title="VALUE BETS"
              subtitle="Kelly · xG · Probabilidades reales"
              neonColors={['#22c55e', '#4ade80', '#22c55e']}
            />
          ),
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="💰" label="Value" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="ia"
        options={{
          headerTitle: () => (
            <NeonTabHeader
              emoji="🤖"
              title="CHAT IA"
              subtitle="Análisis · Predicciones · Estrategia"
              neonColors={['#60a5fa', '#a78bfa', '#60a5fa']}
            />
          ),
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🤖" label="IA" focused={focused} isAI />,
        }}
      />
      <Tabs.Screen
        name="apuestas"
        options={{
          headerTitle: () => (
            <NeonTabHeader
              emoji="📒"
              title="MIS APUESTAS"
              subtitle="Bankroll · ROI · Historial"
              neonColors={['#f59e0b', '#fbbf24', '#f59e0b']}
            />
          ),
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📒" label="Apuestas" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="noticias"
        options={{
          headerTitle: () => (
            <NeonTabHeader
              emoji="📰"
              title="NOTICIAS"
              subtitle="Lesiones · Fichajes · Análisis IA"
              neonColors={['#38bdf8', '#7dd3fc', '#38bdf8']}
            />
          ),
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📰" label="Noticias" focused={focused} />,
        }}
      />
      <Tabs.Screen name="jugadores" options={{ href: null }} />
      <Tabs.Screen name="equipos"   options={{ href: null }} />
    </Tabs>
    <AccuracyModal visible={accuracyVisible} onClose={() => setAccuracyVisible(false)} />
    </>
  );
}

// ─── Estilos header ───────────────────────────────────────────────────────────
const s = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12 },
  loginBtn: { backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  loginText: { color: '#000', fontWeight: '700', fontSize: 13 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#000', fontWeight: '800', fontSize: 15 },
  crown: { position: 'absolute', top: -6, right: -6, fontSize: 12 },
  pill: {
    backgroundColor: '#1f2937', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#374151',
  },
  pillText: { color: '#9ca3af', fontSize: 11, fontWeight: '600' },
  // Accuracy button
  accuracyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 5,
    backgroundColor: '#0f1a0f',
  },
  accuracyEmoji: { fontSize: 13 },
  accuracyTextCol: { flexDirection: 'column', alignItems: 'flex-start' },
  accuracyPct: { fontSize: 13, fontWeight: '900', color: '#22c55e', lineHeight: 15 },
  accuracyLabel: { fontSize: 9, fontWeight: '600', color: '#9ca3af', lineHeight: 11 },
});

// ─── Estilos menú ─────────────────────────────────────────────────────────────
const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'flex-end', justifyContent: 'flex-start',
    paddingTop: 60, paddingRight: 12,
  },
  menu: {
    backgroundColor: '#111827', borderRadius: 16,
    width: 280, borderWidth: 1, borderColor: '#1f2937',
    overflow: 'hidden',
  },

  // Cabecera
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16,
  },
  avatarLg: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarLgText: { color: '#000', fontWeight: '900', fontSize: 20 },
  headerInfo: { flex: 1 },
  name:  { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  email: { fontSize: 11, color: '#6b7280', marginBottom: 6 },
  planBadge: {
    alignSelf: 'flex-start', borderWidth: 1, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  planText: { fontSize: 11, fontWeight: '700' },

  // Uso
  usageBox: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usageLabel: { fontSize: 12, color: '#9ca3af', width: 90 },
  barBg: { flex: 1, height: 5, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  usageCount: { fontSize: 11, color: '#6b7280', width: 28, textAlign: 'right' },

  // Divisor
  divider: { height: 1, backgroundColor: '#1f2937', marginHorizontal: 0 },

  // Items del menú
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuItemIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  menuItemInfo: { flex: 1 },
  menuItemText: { fontSize: 14, color: '#e5e7eb', fontWeight: '600' },
  menuItemSub:  { fontSize: 11, color: '#6b7280', marginTop: 1 },
  menuItemArrow: { fontSize: 20, color: '#4b5563' },
});

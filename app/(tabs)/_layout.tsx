import { Tabs } from 'expo-router';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { FREE_LIMITS } from '@/services/supabase';

function ProfileButton() {
  const { user, profile, bypassActive, isPremium, setShowLoginModal, signOut } = useAuth();

  if (!user && !bypassActive) {
    return (
      <TouchableOpacity onPress={() => setShowLoginModal(true)} style={s.loginBtn}>
        <Text style={s.loginText}>Entrar</Text>
      </TouchableOpacity>
    );
  }

  const initial = bypassActive ? '👑' : (profile?.full_name ?? user?.email ?? 'U')[0].toUpperCase();

  return (
    <TouchableOpacity onPress={signOut} style={s.avatar}>
      <Text style={s.avatarText}>{initial}</Text>
      {isPremium && <Text style={s.crown}>⚡</Text>}
    </TouchableOpacity>
  );
}

function UsagePill() {
  const { user, dailyUsage, isPremium, bypassActive } = useAuth();
  if (!user || isPremium || bypassActive) return null;
  const analyses = FREE_LIMITS.ai_analyses - dailyUsage.ai_analyses;
  const chats = FREE_LIMITS.chat_messages - dailyUsage.chat_messages;
  return (
    <View style={s.pill}>
      <Text style={s.pillText}>🔍{analyses} 💬{chats}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bg.card },
        headerTitleStyle: { color: colors.text.primary, fontWeight: '700', fontSize: 18 },
        headerTintColor: colors.accent.green,
        headerRight: () => (
          <View style={s.headerRight}>
            <UsagePill />
            <ProfileButton />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: colors.bg.card,
          borderTopColor: colors.border.medium,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarActiveTintColor: colors.accent.green,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: '⚽ WikiBet', tabBarLabel: '📊 Partidos' }}
      />
      <Tabs.Screen
        name="value"
        options={{ title: '💰 Value Bets', tabBarLabel: '💰 Value' }}
      />
      <Tabs.Screen
        name="ia"
        options={{ title: '🤖 IA Deportiva', tabBarLabel: '🤖 IA' }}
      />
      <Tabs.Screen
        name="apuestas"
        options={{ title: '📒 Mis Apuestas', tabBarLabel: '📒 Apuestas' }}
      />
      <Tabs.Screen
        name="noticias"
        options={{ title: '📰 Noticias', tabBarLabel: '📰 Noticias' }}
      />
      <Tabs.Screen name="jugadores" options={{ href: null }} />
      <Tabs.Screen name="equipos"   options={{ href: null }} />
    </Tabs>
  );
}

const s = StyleSheet.create({
  headerRight: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 12,
  },
  loginBtn: {
    backgroundColor: '#22c55e', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  loginText: { color: '#000', fontWeight: '700', fontSize: 13 },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatarText: { color: '#000', fontWeight: '800', fontSize: 15 },
  crown: { position: 'absolute', top: -6, right: -6, fontSize: 12 },
  pill: {
    backgroundColor: '#1f2937', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#374151',
  },
  pillText: { color: '#9ca3af', fontSize: 11, fontWeight: '600' },
});

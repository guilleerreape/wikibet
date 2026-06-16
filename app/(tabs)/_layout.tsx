import { Tabs } from 'expo-router';
import { colors } from '@/constants/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
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
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Partidos',
          tabBarLabel: '📊 Partidos',
        }}
      />
      <Tabs.Screen
        name="value"
        options={{
          title: 'Value',
          tabBarLabel: '💰 Value',
        }}
      />
      <Tabs.Screen
        name="ia"
        options={{
          title: 'IA Chat',
          tabBarLabel: '🤖 IA',
        }}
      />
      <Tabs.Screen
        name="noticias"
        options={{
          title: 'Noticias',
          tabBarLabel: '📰 Noticias',
        }}
      />
      {/* Ocultos del tab bar — rutas siguen activas */}
      <Tabs.Screen name="jugadores" options={{ href: null }} />
      <Tabs.Screen name="equipos"   options={{ href: null }} />
    </Tabs>
  );
}

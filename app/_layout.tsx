import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/LoginModal';
import UpgradeModal from '@/components/UpgradeModal';
import LandingScreen from '@/components/LandingScreen';

function Modals() {
  const {
    showLoginModal, setShowLoginModal,
    showUpgradeModal, setShowUpgradeModal,
    upgradeReason,
  } = useAuth();
  return (
    <>
      <LoginModal visible={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason={upgradeReason}
      />
    </>
  );
}

function AppGate() {
  const { isAuthenticated, loading } = useAuth();

  // Cargando sesión inicial
  if (loading) {
    return (
      <View style={s.splash}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  // No autenticado → solo pantalla de bienvenida
  if (!isAuthenticated) {
    return <LandingScreen />;
  }

  // Autenticado → app completa
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.primary },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen
          name="jugador/[id]"
          options={{ presentation: 'modal', animationEnabled: true }}
        />
        <Stack.Screen
          name="equipo/[id]"
          options={{ presentation: 'modal', animationEnabled: true }}
        />
        <Stack.Screen
          name="partido/[id]"
          options={{ presentation: 'modal', animationEnabled: true }}
        />
      </Stack>
      <Modals />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  splash: {
    flex: 1, backgroundColor: '#060d1a',
    alignItems: 'center', justifyContent: 'center',
  },
});

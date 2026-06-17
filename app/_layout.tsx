import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginModal from '@/components/LoginModal';
import UpgradeModal from '@/components/UpgradeModal';

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

function AppNavigator() {
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
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

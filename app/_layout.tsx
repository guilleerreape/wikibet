import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.primary },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="jugador/[id]"
          options={{
            presentation: 'modal',
            animationEnabled: true,
          }}
        />
        <Stack.Screen
          name="equipo/[id]"
          options={{
            presentation: 'modal',
            animationEnabled: true,
          }}
        />
        <Stack.Screen
          name="partido/[id]"
          options={{
            presentation: 'modal',
            animationEnabled: true,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

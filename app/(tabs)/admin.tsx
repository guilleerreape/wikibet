/**
 * Admin screen — navigated to from the admin tab button.
 * This screen is intentionally minimal; the real UI is the overlay rendered
 * in _layout.tsx. This file just satisfies expo-router's requirement that
 * every registered <Tabs.Screen> has a corresponding route file.
 */
import { View } from 'react-native';

export default function AdminScreen() {
  return <View style={{ flex: 1, backgroundColor: '#030712' }} />;
}

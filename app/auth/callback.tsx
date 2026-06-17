import { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // En web, Supabase detecta automáticamente el hash/code de la URL
    // Solo esperamos a que el estado de auth cambie y redirigimos
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Dar un momento para que el contexto se actualice
        setTimeout(() => router.replace('/(tabs)'), 500);
      }
    });

    // Fallback: si no hay evento en 5s, redirigir de todos modos
    const timeout = setTimeout(() => router.replace('/(tabs)'), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  return (
    <View style={s.container}>
      <ActivityIndicator size="large" color="#22c55e" />
      <Text style={s.text}>Iniciando sesión…</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0a0f1a',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  text: { color: '#9ca3af', fontSize: 16 },
});

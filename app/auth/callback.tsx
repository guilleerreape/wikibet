import { useEffect, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';

export default function AuthCallback() {
  const router  = useRouter();
  const done    = useRef(false);

  function goHome() {
    if (done.current) return;
    done.current = true;
    router.replace('/(tabs)');
  }

  useEffect(() => {
    async function handle() {
      // 1. Intentar intercambiar el code PKCE de la URL
      if (typeof window !== 'undefined') {
        const url    = new URL(window.location.href);
        const code   = url.searchParams.get('code');
        const error  = url.searchParams.get('error');

        if (error) { goHome(); return; }

        if (code) {
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (!error) { goHome(); return; }
          } catch { /* continuar al fallback */ }
        }

        // Hash flow (implicit): el token ya está en el hash
        const hash = url.hash;
        if (hash && hash.includes('access_token')) {
          // Supabase lo procesa automáticamente con detectSessionInUrl
          // Solo esperamos el evento
        }
      }

      // 2. Escuchar el evento de sesión activa
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          subscription.unsubscribe();
          goHome();
        }
      });

      // 3. Comprobar si ya hay sesión (por si el evento ya ocurrió)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { subscription.unsubscribe(); goHome(); return; }

      // 4. Fallback a los 4s
      const t = setTimeout(goHome, 4000);
      return () => { subscription.unsubscribe(); clearTimeout(t); };
    }

    handle();
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
    flex: 1, backgroundColor: '#060d1a',
    alignItems: 'center', justifyContent: 'center', gap: 16,
  },
  text: { color: '#9ca3af', fontSize: 16 },
});

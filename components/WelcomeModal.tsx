import React, { useEffect, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking, Animated,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const STRIPE_BASE = 'https://buy.stripe.com/bJeaEXbVg6vh6QJ19S0kE00';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ visible, onClose }: Props) {
  const { user } = useAuth();
  const pulse = useRef(new Animated.Value(1)).current;
  const glow  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
    return () => { pulse.stopAnimation(); glow.stopAnimation(); };
  }, [visible]);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ['#22c55e60', '#f59e0b90'],
  });

  function getStripeUrl() {
    let url = STRIPE_BASE;
    if (user?.id)    url += `?client_reference_id=${user.id}`;
    if (user?.email) url += `&prefilled_email=${encodeURIComponent(user.email)}`;
    return url;
  }

  const name = user?.user_metadata?.full_name?.split(' ')[0] || 'Crack';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <ScrollView contentContainerStyle={s.scrollInner} showsVerticalScrollIndicator={false}>

          {/* Emoji animado */}
          <Animated.Text style={[s.bigEmoji, { transform: [{ scale: pulse }] }]}>⚽</Animated.Text>

          <Text style={s.hey}>¡Hola, {name}!</Text>
          <Text style={s.welcome}>Bienvenido/a a WikiBet</Text>
          <Text style={s.sub}>Tu analista deportivo con IA · Mundial 2026 y ligas europeas</Text>

          {/* Tu plan actual */}
          <View style={s.freePlan}>
            <Text style={s.freePlanTitle}>🆓 Tu plan actual: Gratuito</Text>
            <View style={s.limitRow}>
              <Text style={s.limitIcon}>🔍</Text>
              <View style={s.limitInfo}>
                <Text style={s.limitLabel}>Análisis de partidos con IA</Text>
                <Text style={s.limitVal}><Text style={s.limitNum}>3</Text> por día</Text>
              </View>
            </View>
            <View style={s.limitRow}>
              <Text style={s.limitIcon}>💬</Text>
              <View style={s.limitInfo}>
                <Text style={s.limitLabel}>Mensajes al Chat IA</Text>
                <Text style={s.limitVal}><Text style={s.limitNum}>5</Text> por día</Text>
              </View>
            </View>
          </View>

          {/* Premium box */}
          <Animated.View style={[s.premiumBox, { borderColor }]}>
            <Text style={s.premiumBadge}>⚡ PREMIUM+  ·  4,99 €/mes</Text>
            <Text style={s.premiumHeadline}>Todo. Sin límites. Sin excusas.</Text>

            {[
              { icon: '🔍', title: 'Análisis ilimitados',     desc: 'Analiza todos los partidos del día. Cuotas Poisson, goles, córners, tarjetas — sin restricciones.' },
              { icon: '💬', title: 'Chat IA sin límites',      desc: 'Pregunta lo que quieras, cuando quieras. Estrategias, comparativas, bankroll — tu analista 24/7.' },
              { icon: '📈', title: 'Value bets en tiempo real', desc: 'La IA detecta desequilibrios en las cuotas antes de que las casas los ajusten. Ventaja real.' },
              { icon: '🏆', title: 'Pronósticos avanzados',    desc: 'Formaciones probables, jugadores en riesgo de tarjeta, goleadores, resultados exactos con probabilidad.' },
              { icon: '🩹', title: 'Alertas de lesiones',      desc: 'Noticias del día sobre bajas y dudas que mueven las cuotas. Infórmate antes que la competencia.' },
              { icon: '✨', title: 'Sin publicidad',            desc: 'Experiencia limpia y profesional. Solo tú y los datos.' },
            ].map(f => (
              <View key={f.icon} style={s.featureRow}>
                <Text style={s.featureIcon}>{f.icon}</Text>
                <View style={s.featureInfo}>
                  <Text style={s.featureTitle}>{f.title}</Text>
                  <Text style={s.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </Animated.View>

          {/* CTA upgrade */}
          <TouchableOpacity
            style={s.upgradeBtn}
            onPress={() => { onClose(); Linking.openURL(getStripeUrl()); }}
            activeOpacity={0.85}
          >
            <Text style={s.upgradeLine1}>⚡ Activar Premium+</Text>
            <Text style={s.upgradeLine2}>4,99 € / mes · Cancela cuando quieras</Text>
          </TouchableOpacity>

          {/* Continuar gratis */}
          <TouchableOpacity onPress={onClose} style={s.freeBtn} activeOpacity={0.7}>
            <Text style={s.freeBtnText}>Continuar con plan gratuito →</Text>
          </TouchableOpacity>

          <Text style={s.disclaimer}>
            🔒 Pago seguro · Sin permanencia · Cancela en cualquier momento
          </Text>

        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
  },
  scrollInner: {
    alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 40,
  },
  bigEmoji: { fontSize: 64, marginBottom: 12 },
  hey: { fontSize: 22, fontWeight: '900', color: '#22c55e', marginBottom: 4 },
  welcome: { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 13, color: '#9ca3af', textAlign: 'center', marginBottom: 28, lineHeight: 19 },

  // Plan free
  freePlan: {
    alignSelf: 'stretch', backgroundColor: '#1f2937',
    borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: '#374151', gap: 10,
  },
  freePlanTitle: { fontSize: 13, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  limitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  limitIcon: { fontSize: 22, width: 30, textAlign: 'center' },
  limitInfo: { flex: 1 },
  limitLabel: { fontSize: 13, color: '#d1d5db', fontWeight: '600' },
  limitVal: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  limitNum: { color: '#ef4444', fontWeight: '900' },

  // Premium box
  premiumBox: {
    alignSelf: 'stretch', backgroundColor: '#0f1a0f',
    borderRadius: 16, padding: 20, marginBottom: 24,
    borderWidth: 2, gap: 14,
  },
  premiumBadge: { fontSize: 13, fontWeight: '900', color: '#f59e0b', textAlign: 'center', letterSpacing: 1 },
  premiumHeadline: {
    fontSize: 20, fontWeight: '900', color: '#fff',
    textAlign: 'center', marginBottom: 4, lineHeight: 26,
  },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  featureIcon: { fontSize: 22, width: 28, textAlign: 'center', marginTop: 1 },
  featureInfo: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#d1fae5', marginBottom: 2 },
  featureDesc: { fontSize: 12, color: '#6b7280', lineHeight: 17 },

  // Buttons
  upgradeBtn: {
    alignSelf: 'stretch', backgroundColor: '#f59e0b',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  upgradeLine1: { fontSize: 17, fontWeight: '900', color: '#000' },
  upgradeLine2: { fontSize: 11, color: '#000', opacity: 0.7, marginTop: 2 },

  freeBtn: { paddingVertical: 10, marginBottom: 8 },
  freeBtnText: { fontSize: 14, color: '#6b7280' },

  disclaimer: { fontSize: 10, color: '#374151', textAlign: 'center' },
});

import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  Image, Platform,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function LoginModal({ visible, onClose }: Props) {
  const { signInWithGoogle } = useAuth();

  async function handleGoogle() {
    onClose();
    await signInWithGoogle();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          {/* Header */}
          <Text style={s.emoji}>⚽</Text>
          <Text style={s.title}>WikiBet</Text>
          <Text style={s.subtitle}>Inicia sesión para analizar partidos y chatear con la IA</Text>

          {/* Beneficios */}
          <View style={s.benefits}>
            {[
              '🔍  3 análisis de IA a la semana (gratis)',
              '💬  5 mensajes de chat a la semana (gratis)',
              '🏆  Pronósticos WC 2026 en tiempo real',
              '⚡  Premium+ — uso ilimitado',
            ].map(b => (
              <Text key={b} style={s.benefit}>{b}</Text>
            ))}
          </View>

          {/* Google */}
          <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} activeOpacity={0.85}>
            <Text style={s.googleIcon}>G</Text>
            <Text style={s.googleText}>Continuar con Google</Text>
          </TouchableOpacity>

          {/* Close */}
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>Ahora no</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 380,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
  },
  emoji: { fontSize: 44, marginBottom: 6 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: {
    fontSize: 14, color: '#9ca3af', textAlign: 'center',
    marginBottom: 20, lineHeight: 20,
  },
  benefits: {
    alignSelf: 'stretch', marginBottom: 24,
    backgroundColor: '#1f2937', borderRadius: 12, padding: 14, gap: 8,
  },
  benefit: { color: '#d1fae5', fontSize: 13, lineHeight: 20 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 24,
    alignSelf: 'stretch', justifyContent: 'center',
    marginBottom: 10,
  },
  googleIcon: { fontSize: 16, fontWeight: '800', color: '#1a73e8' },
  googleText: { fontSize: 15, fontWeight: '600', color: '#111' },

  closeBtn: { paddingVertical: 10 },
  closeText: { color: '#6b7280', fontSize: 14 },
});

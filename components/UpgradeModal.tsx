import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { FREE_LIMITS } from '../services/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
  reason?: string;
}

const STRIPE_URL = 'https://buy.stripe.com/PLACEHOLDER'; // reemplazar con tu link de Stripe

export default function UpgradeModal({ visible, onClose, reason }: Props) {
  const { dailyUsage } = useAuth();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.lock}>🔒</Text>
          <Text style={s.title}>Límite diario alcanzado</Text>
          <Text style={s.subtitle}>
            Has usado todos tus {reason ?? 'usos'} gratuitos de hoy.{'\n'}
            Actualiza a Premium+ para acceso ilimitado.
          </Text>

          {/* Uso actual */}
          <View style={s.usageBox}>
            <UsageRow label="Análisis IA" used={dailyUsage.ai_analyses} limit={FREE_LIMITS.ai_analyses} />
            <UsageRow label="Mensajes chat" used={dailyUsage.chat_messages} limit={FREE_LIMITS.chat_messages} />
          </View>

          {/* Plan premium */}
          <View style={s.planBox}>
            <Text style={s.planTitle}>⚡ Premium+</Text>
            <Text style={s.planPrice}>4,99 € / mes</Text>
            {[
              '✅ Análisis de IA ilimitados',
              '✅ Chat sin límites',
              '✅ Pronósticos avanzados',
              '✅ Sin publicidad',
            ].map(f => <Text key={f} style={s.feature}>{f}</Text>)}
          </View>

          <TouchableOpacity
            style={s.upgradeBtn}
            onPress={() => { onClose(); Linking.openURL(STRIPE_URL); }}
            activeOpacity={0.85}
          >
            <Text style={s.upgradeText}>Actualizar a Premium+</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Text style={s.closeText}>Continuar gratis</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = Math.min(used / limit, 1);
  return (
    <View style={s.usageRow}>
      <Text style={s.usageLabel}>{label}</Text>
      <View style={s.barBg}>
        <View style={[s.barFill, { width: `${pct * 100}%` as any, backgroundColor: pct >= 1 ? '#ef4444' : '#22c55e' }]} />
      </View>
      <Text style={s.usageCount}>{used}/{limit}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28, paddingBottom: 40,
    borderTopWidth: 1, borderColor: '#1f2937',
    alignItems: 'center',
  },
  lock: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  subtitle: {
    color: '#9ca3af', textAlign: 'center', fontSize: 14, lineHeight: 20, marginBottom: 20,
  },

  usageBox: { alignSelf: 'stretch', marginBottom: 20, gap: 10 },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usageLabel: { color: '#d1d5db', fontSize: 13, width: 120 },
  barBg: { flex: 1, height: 6, backgroundColor: '#374151', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  usageCount: { color: '#9ca3af', fontSize: 12, width: 36, textAlign: 'right' },

  planBox: {
    alignSelf: 'stretch', backgroundColor: '#1f2937', borderRadius: 14,
    padding: 16, marginBottom: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#f59e0b',
    gap: 6,
  },
  planTitle: { fontSize: 18, fontWeight: '800', color: '#f59e0b' },
  planPrice: { fontSize: 24, fontWeight: '900', color: '#fff', marginVertical: 4 },
  feature: { color: '#d1fae5', fontSize: 13 },

  upgradeBtn: {
    alignSelf: 'stretch', backgroundColor: '#f59e0b',
    borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 10,
  },
  upgradeText: { fontSize: 16, fontWeight: '800', color: '#000' },

  closeBtn: { paddingVertical: 10 },
  closeText: { color: '#6b7280', fontSize: 14 },
});

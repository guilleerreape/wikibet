import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { addBet } from '../services/betsService';

export interface QuickBetData {
  match: string;
  league: string;
  market: string;
  odds: number;
}

interface Props {
  visible: boolean;
  data: QuickBetData | null;
  onClose: () => void;
  onSaved: () => void;
}

const PRESETS = [5, 10, 25, 50];

export default function QuickBetModal({ visible, data, onClose, onSaved }: Props) {
  const { user, setShowLoginModal } = useAuth();
  const [stake, setStake]   = useState('10');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  if (!data) return null;

  const stakeNum  = parseFloat(stake.replace(',', '.')) || 0;
  const potential = stakeNum > 0 ? (stakeNum * (data.odds - 1)).toFixed(2) : '0.00';

  async function handleSave() {
    if (!user) { onClose(); setShowLoginModal(true); return; }
    if (stakeNum <= 0) { Alert.alert('Cantidad inválida', 'Introduce una cantidad mayor que 0.'); return; }

    setSaving(true);
    try {
      await addBet(user.id, {
        match:  data.match,
        league: data.league,
        market: data.market,
        odds:   data.odds,
        stake:  stakeNum,
        notes:  'Añadida desde análisis IA',
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setStake('10');
        onSaved();
        onClose();
      }, 1000);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la apuesta.');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setStake('10');
    setSaved(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>

          {/* Handle */}
          <View style={s.handle} />

          {/* Partido */}
          <Text style={s.match}>{data.match}</Text>
          <Text style={s.league}>{data.league}</Text>

          {/* Mercado + cuota */}
          <View style={s.marketRow}>
            <View style={s.marketBox}>
              <Text style={s.marketLabel}>MERCADO</Text>
              <Text style={s.marketValue}>{data.market}</Text>
            </View>
            <View style={s.oddsBox}>
              <Text style={s.marketLabel}>CUOTA</Text>
              <Text style={s.oddsValue}>{data.odds.toFixed(2)}</Text>
            </View>
          </View>

          {/* Presets de cantidad */}
          <Text style={s.sectionLabel}>CANTIDAD</Text>
          <View style={s.presets}>
            {PRESETS.map(p => (
              <TouchableOpacity
                key={p}
                style={[s.preset, stake === String(p) && s.presetActive]}
                onPress={() => setStake(String(p))}
              >
                <Text style={[s.presetText, stake === String(p) && s.presetTextActive]}>
                  {p}€
                </Text>
              </TouchableOpacity>
            ))}
            <TextInput
              style={s.stakeInput}
              value={stake}
              onChangeText={t => setStake(t.replace(/[^0-9.,]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="Otro"
              placeholderTextColor="#4b5563"
              selectTextOnFocus
            />
          </View>

          {/* Preview ganancia */}
          <View style={s.preview}>
            <View style={s.previewItem}>
              <Text style={s.previewLabel}>Arriesgas</Text>
              <Text style={s.previewAmount}>{stakeNum.toFixed(2)}€</Text>
            </View>
            <Text style={s.previewArrow}>→</Text>
            <View style={s.previewItem}>
              <Text style={s.previewLabel}>Si ganas</Text>
              <Text style={[s.previewAmount, { color: '#22c55e' }]}>+{potential}€</Text>
            </View>
            <View style={s.previewItem}>
              <Text style={s.previewLabel}>Si pierdes</Text>
              <Text style={[s.previewAmount, { color: '#ef4444' }]}>-{stakeNum.toFixed(2)}€</Text>
            </View>
          </View>

          {/* Botón guardar */}
          <TouchableOpacity
            style={[s.saveBtn, (saving || stakeNum <= 0) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving || stakeNum <= 0}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#000" />
            ) : saved ? (
              <Text style={s.saveBtnText}>✅ Añadida a Mis Apuestas</Text>
            ) : (
              <Text style={s.saveBtnText}>📥 Añadir a Mis Apuestas</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClose} style={s.cancelBtn}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1, borderColor: '#1f2937',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#374151', alignSelf: 'center', marginBottom: 20,
  },

  match:  { fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' },
  league: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 16 },

  marketRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  marketBox: {
    flex: 1, backgroundColor: '#1f2937', borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: '#374151',
  },
  oddsBox: {
    width: 80, backgroundColor: '#1f2937', borderRadius: 12,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f59e0b40',
  },
  marketLabel: { fontSize: 10, color: '#6b7280', fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  marketValue: { fontSize: 13, color: '#e5e7eb', fontWeight: '600' },
  oddsValue:   { fontSize: 22, color: '#f59e0b', fontWeight: '900' },

  sectionLabel: { fontSize: 10, color: '#6b7280', fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 },

  presets: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
  preset: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1f2937', alignItems: 'center',
    borderWidth: 1, borderColor: '#374151',
  },
  presetActive: { backgroundColor: '#22c55e20', borderColor: '#22c55e' },
  presetText:       { fontSize: 14, fontWeight: '700', color: '#9ca3af' },
  presetTextActive: { color: '#22c55e' },
  stakeInput: {
    flex: 1, backgroundColor: '#1f2937', borderRadius: 10,
    borderWidth: 1, borderColor: '#374151', color: '#fff',
    paddingHorizontal: 10, paddingVertical: 10,
    fontSize: 14, fontWeight: '700', textAlign: 'center',
  },

  preview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0d1117', borderRadius: 12, padding: 14, marginBottom: 20,
  },
  previewItem: { alignItems: 'center', flex: 1 },
  previewLabel:  { fontSize: 10, color: '#6b7280', marginBottom: 4 },
  previewAmount: { fontSize: 16, fontWeight: '800', color: '#e5e7eb' },
  previewArrow:  { fontSize: 18, color: '#374151', marginHorizontal: 4 },

  saveBtn: {
    backgroundColor: '#22c55e', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 10,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#6b7280', fontSize: 14 },
});

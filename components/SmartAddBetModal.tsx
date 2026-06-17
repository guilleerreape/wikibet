import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { addBet } from '../services/betsService';
import { generateAllMarkets, type Market, type MarketGroup } from '../services/oddsCalculator';

// ─── Emojis de banderas ────────────────────────────────────────────────────────
const FLAGS: Record<string, string> = {
  Argentina:'🇦🇷', Francia:'🇫🇷', Brasil:'🇧🇷', España:'🇪🇸', Inglaterra:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Alemania:'🇩🇪', Portugal:'🇵🇹', Holanda:'🇳🇱', Uruguay:'🇺🇾', Colombia:'🇨🇴',
  México:'🇲🇽', Marruecos:'🇲🇦', Senegal:'🇸🇳', Japón:'🇯🇵', 'Estados Unidos':'🇺🇸',
  Ecuador:'🇪🇨', Chile:'🇨🇱', Italia:'🇮🇹', Croacia:'🇭🇷', Bélgica:'🇧🇪',
  Suiza:'🇨🇭', Noruega:'🇳🇴', Austria:'🇦🇹', Dinamarca:'🇩🇰', Suecia:'🇸🇪',
  Serbia:'🇷🇸', Turquía:'🇹🇷', Ucrania:'🇺🇦', Polonia:'🇵🇱', Australia:'🇦🇺',
  Argelia:'🇩🇿', Túnez:'🇹🇳', Nigeria:'🇳🇬', Ghana:'🇬🇭', Egipto:'🇪🇬',
  Camerún:'🇨🇲', 'Arabia Saudí':'🇸🇦', Irán:'🇮🇷', Irak:'🇮🇶', Jordania:'🇯🇴',
  Catar:'🇶🇦', Haití:'🇭🇹', Venezuela:'🇻🇪', Paraguay:'🇵🇾', Bolivia:'🇧🇴',
  Perú:'🇵🇪', 'Corea del Sur':'🇰🇷', 'Cabo Verde':'🇨🇻', 'R.D. Congo':'🇨🇩',
  Curazao:'🇨🇼', Bosnia:'🇧🇦',
};
const flag = (t: string) => FLAGS[t] ?? '🏴';

export interface SmartMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date?: string;
  time?: string;
}

interface Props {
  visible:  boolean;
  matches:  SmartMatch[];
  onClose:  () => void;
  onSaved:  () => void;
}

const PRESETS = [5, 10, 25, 50];

export default function SmartAddBetModal({ visible, matches, onClose, onSaved }: Props) {
  const { user, setShowLoginModal } = useAuth();

  // ─── Steps: 'match' | 'markets' | 'stake' ────────────────────────────────
  const [step,     setStep]     = useState<'match' | 'markets' | 'stake'>('match');
  const [selMatch, setSelMatch] = useState<SmartMatch | null>(null);
  const [activeGroup, setActiveGroup] = useState(0);
  const [selMarket, setSelMarket]     = useState<Market | null>(null);
  const [stake,    setStake]    = useState('10');
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  // Calcular todos los mercados cuando se selecciona un partido
  const groups: MarketGroup[] = useMemo(() => {
    if (!selMatch) return [];
    return generateAllMarkets(selMatch.homeTeam, selMatch.awayTeam);
  }, [selMatch]);

  function reset() {
    setStep('match'); setSelMatch(null);
    setActiveGroup(0); setSelMarket(null);
    setStake('10'); setSaved(false);
  }

  function handleClose() { reset(); onClose(); }

  function pickMatch(m: SmartMatch) {
    setSelMatch(m);
    setActiveGroup(0);
    setStep('markets');
  }

  function pickMarket(market: Market) {
    setSelMarket(market);
    setStep('stake');
  }

  async function handleSave() {
    if (!user) { handleClose(); setShowLoginModal(true); return; }
    const stakeNum = parseFloat(stake.replace(',', '.'));
    if (!stakeNum || stakeNum <= 0) {
      Alert.alert('Cantidad inválida', 'Introduce una cantidad mayor que 0.');
      return;
    }
    if (!selMatch || !selMarket) return;

    setSaving(true);
    try {
      await addBet(user.id, {
        match:  `${selMatch.homeTeam} vs ${selMatch.awayTeam}`,
        league: selMatch.league,
        market: selMarket.label,
        odds:   selMarket.odds,
        stake:  stakeNum,
      });
      setSaved(true);
      setTimeout(() => { reset(); onSaved(); onClose(); }, 900);
    } catch {
      Alert.alert('Error', 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  }

  const stakeNum = parseFloat(stake.replace(',', '.')) || 0;
  const potential = stakeNum > 0 && selMarket
    ? (stakeNum * (selMarket.odds - 1)).toFixed(2)
    : '0.00';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Handle */}
          <View style={s.handle} />

          {/* ─── STEP 1: Seleccionar partido ──────────────────────────── */}
          {step === 'match' && (
            <>
              <Text style={s.stepTitle}>⚽ Elige el partido</Text>
              <ScrollView style={s.matchList} showsVerticalScrollIndicator={false}>
                {matches.length === 0 ? (
                  <Text style={s.empty}>No hay partidos próximos disponibles</Text>
                ) : (
                  matches.map(m => (
                    <TouchableOpacity
                      key={m.id} style={s.matchRow}
                      onPress={() => pickMatch(m)} activeOpacity={0.75}
                    >
                      <View style={s.matchTeams}>
                        <Text style={s.matchTeamText}>{flag(m.homeTeam)} {m.homeTeam}</Text>
                        <Text style={s.matchVs}>vs</Text>
                        <Text style={s.matchTeamText}>{flag(m.awayTeam)} {m.awayTeam}</Text>
                      </View>
                      <View style={s.matchMeta}>
                        <Text style={s.matchLeague}>{m.league}</Text>
                        {m.time && <Text style={s.matchTime}>{m.time}</Text>}
                      </View>
                      <Text style={s.matchArrow}>›</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <TouchableOpacity onPress={handleClose} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ─── STEP 2: Seleccionar mercado ──────────────────────────── */}
          {step === 'markets' && selMatch && (
            <>
              {/* Cabecera partido */}
              <TouchableOpacity onPress={() => setStep('match')} style={s.backRow}>
                <Text style={s.backArrow}>‹</Text>
                <Text style={s.backText}>Cambiar partido</Text>
              </TouchableOpacity>
              <Text style={s.matchHeader}>
                {flag(selMatch.homeTeam)} {selMatch.homeTeam}  vs  {flag(selMatch.awayTeam)} {selMatch.awayTeam}
              </Text>

              {/* Tabs de categorías */}
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                style={s.tabsScroll} contentContainerStyle={s.tabs}
              >
                {groups.map((g, i) => (
                  <TouchableOpacity
                    key={g.id} onPress={() => setActiveGroup(i)}
                    style={[s.tab, activeGroup === i && s.tabActive]}
                  >
                    <Text style={s.tabIcon}>{g.icon}</Text>
                    <Text style={[s.tabText, activeGroup === i && s.tabTextActive]}>
                      {g.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Mercados de la categoría activa */}
              <ScrollView style={s.marketList} showsVerticalScrollIndicator={false}>
                {(groups[activeGroup]?.markets ?? []).map(mkt => (
                  <TouchableOpacity
                    key={mkt.id} style={s.marketRow}
                    onPress={() => pickMarket(mkt)} activeOpacity={0.75}
                  >
                    <View style={s.marketLeft}>
                      <Text style={s.marketLabel}>{mkt.label}</Text>
                      {mkt.sublabel && <Text style={s.marketSub}>{mkt.sublabel}</Text>}
                    </View>
                    <View style={s.marketRight}>
                      <Text style={s.marketProb}>{(mkt.prob * 100).toFixed(0)}%</Text>
                      <View style={s.oddsChip}>
                        <Text style={s.oddsChipText}>{mkt.odds.toFixed(2)}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                <View style={{ height: 20 }} />
              </ScrollView>
            </>
          )}

          {/* ─── STEP 3: Cantidad ─────────────────────────────────────── */}
          {step === 'stake' && selMatch && selMarket && (
            <>
              <TouchableOpacity onPress={() => setStep('markets')} style={s.backRow}>
                <Text style={s.backArrow}>‹</Text>
                <Text style={s.backText}>Cambiar mercado</Text>
              </TouchableOpacity>

              {/* Resumen de la apuesta */}
              <View style={s.betSummary}>
                <Text style={s.betSummaryMatch}>
                  {flag(selMatch.homeTeam)} {selMatch.homeTeam} vs {flag(selMatch.awayTeam)} {selMatch.awayTeam}
                </Text>
                <Text style={s.betSummaryMarket}>{selMarket.label}</Text>
                <Text style={s.betSummaryOdds}>{selMarket.odds.toFixed(2)}</Text>
              </View>

              {/* Presets */}
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
              </View>

              {/* Input manual */}
              <TextInput
                style={s.stakeInput}
                value={stake}
                onChangeText={t => setStake(t.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="Introduce cantidad..."
                placeholderTextColor="#4b5563"
                selectTextOnFocus
              />

              {/* Preview */}
              <View style={s.preview}>
                <View style={s.previewItem}>
                  <Text style={s.previewLabel}>Arriesgas</Text>
                  <Text style={s.previewAmount}>{stakeNum.toFixed(2)}€</Text>
                </View>
                <Text style={s.previewSep}>→</Text>
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
                {saving ? <ActivityIndicator color="#000" /> :
                 saved   ? <Text style={s.saveBtnText}>✅ ¡Añadida!</Text> :
                           <Text style={s.saveBtnText}>📥 Añadir a Mis Apuestas</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={handleClose} style={s.cancelBtn}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, maxHeight: '90%',
    borderTopWidth: 1, borderColor: '#1e293b',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#334155', alignSelf: 'center', marginBottom: 16,
  },

  stepTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 14 },

  // Match list
  matchList:  { maxHeight: 380 },
  matchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#334155',
  },
  matchTeams:    { flex: 1 },
  matchTeamText: { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  matchVs:       { fontSize: 11, color: '#64748b', marginVertical: 2 },
  matchMeta:     { alignItems: 'flex-end', gap: 3, marginLeft: 8 },
  matchLeague:   { fontSize: 10, color: '#64748b' },
  matchTime:     { fontSize: 12, fontWeight: '700', color: '#22c55e' },
  matchArrow:    { fontSize: 22, color: '#334155', marginLeft: 8 },

  // Navigation
  backRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  backArrow: { fontSize: 22, color: '#22c55e', lineHeight: 24 },
  backText:  { fontSize: 13, color: '#22c55e', fontWeight: '600' },

  matchHeader: {
    fontSize: 14, fontWeight: '800', color: '#fff',
    textAlign: 'center', marginBottom: 12,
  },

  // Category tabs
  tabsScroll: { flexShrink: 0, marginBottom: 12 },
  tabs:       { gap: 6, paddingBottom: 2 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10,
    backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155',
  },
  tabActive:     { backgroundColor: '#22c55e20', borderColor: '#22c55e' },
  tabIcon:       { fontSize: 13 },
  tabText:       { fontSize: 11, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#22c55e' },

  // Market list
  marketList: { maxHeight: 300 },
  marketRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#1e293b',
  },
  marketLeft:  { flex: 1 },
  marketLabel: { fontSize: 13, fontWeight: '600', color: '#e2e8f0' },
  marketSub:   { fontSize: 10, color: '#64748b', marginTop: 2 },
  marketRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  marketProb:  { fontSize: 11, color: '#64748b', width: 32, textAlign: 'right' },
  oddsChip: {
    backgroundColor: '#f59e0b20', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: '#f59e0b60',
    minWidth: 52, alignItems: 'center',
  },
  oddsChipText: { fontSize: 14, fontWeight: '900', color: '#f59e0b' },

  // Bet summary (step 3)
  betSummary: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 14,
    marginBottom: 16, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: '#334155',
  },
  betSummaryMatch:  { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  betSummaryMarket: { fontSize: 16, fontWeight: '800', color: '#fff' },
  betSummaryOdds:   { fontSize: 28, fontWeight: '900', color: '#f59e0b' },

  sectionLabel: {
    fontSize: 10, color: '#64748b', fontWeight: '700',
    letterSpacing: 0.5, marginBottom: 8,
  },

  // Presets
  presets: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  preset: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1e293b', alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  presetActive:     { backgroundColor: '#22c55e20', borderColor: '#22c55e' },
  presetText:       { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
  presetTextActive: { color: '#22c55e' },

  stakeInput: {
    backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1,
    borderColor: '#334155', color: '#fff', fontSize: 20, fontWeight: '800',
    paddingVertical: 12, paddingHorizontal: 16, textAlign: 'center',
    marginBottom: 14,
  },

  // Preview
  preview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0a0f1a', borderRadius: 12, padding: 12, marginBottom: 16,
  },
  previewItem:   { alignItems: 'center', flex: 1 },
  previewLabel:  { fontSize: 10, color: '#64748b', marginBottom: 4 },
  previewAmount: { fontSize: 15, fontWeight: '800', color: '#e2e8f0' },
  previewSep:    { fontSize: 18, color: '#334155', marginHorizontal: 4 },

  saveBtn: {
    backgroundColor: '#22c55e', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center', marginBottom: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  cancelBtn:   { alignItems: 'center', paddingVertical: 8 },
  cancelText:  { color: '#64748b', fontSize: 14 },

  empty: { color: '#64748b', textAlign: 'center', marginTop: 20, fontSize: 14 },
});

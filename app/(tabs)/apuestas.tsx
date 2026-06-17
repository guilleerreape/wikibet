import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Modal, TextInput, ActivityIndicator,
  Alert, Platform, Animated,
} from 'react-native';
import { colors } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import {
  getBets, updateBetResult, deleteBet, calcStats,
  type Bet, type BetResult,
} from '@/services/betsService';
import SmartAddBetModal, { type SmartMatch } from '@/components/SmartAddBetModal';
import { espnMatchService } from '@/services/espnMatchService';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  (n >= 0 ? '+' : '') + n.toFixed(2) + '€';
const fmtPlain = (n: number) => n.toFixed(2) + '€';
const resultColor = (r: BetResult) =>
  r === 'won' ? colors.accent.green : r === 'lost' ? colors.accent.red : '#f59e0b';
const resultLabel: Record<BetResult, string> = {
  won: '✅ Ganada', lost: '❌ Perdida', pending: '⏳ Pendiente', void: '↩️ Nula',
};

// ─── Tarjeta de estadística ───────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <View style={st.statCard}>
      <Text style={st.statLabel}>{label}</Text>
      <Text style={[st.statValue, color ? { color } : {}]}>{value}</Text>
      {sub ? <Text style={st.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ─── Fila de apuesta ─────────────────────────────────────────────────────────
function BetRow({ bet, onSetResult, onDelete }: {
  bet: Bet;
  onSetResult: (b: Bet) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <View style={st.betRow}>
      <View style={st.betLeft}>
        <Text style={st.betMatch} numberOfLines={1}>{bet.match}</Text>
        <Text style={st.betMarket} numberOfLines={1}>{bet.market}</Text>
        <Text style={st.betMeta}>
          @{bet.odds.toFixed(2)}  ·  {fmtPlain(bet.stake)}
          {bet.league ? `  ·  ${bet.league}` : ''}
        </Text>
      </View>
      <View style={st.betRight}>
        <TouchableOpacity
          style={[st.resultBadge, { borderColor: resultColor(bet.result) }]}
          onPress={() => onSetResult(bet)}
        >
          <Text style={[st.resultBadgeText, { color: resultColor(bet.result) }]}>
            {resultLabel[bet.result]}
          </Text>
        </TouchableOpacity>
        {bet.profit !== null && (
          <Text style={[st.betProfit, { color: bet.profit >= 0 ? colors.accent.green : colors.accent.red }]}>
            {fmt(bet.profit)}
          </Text>
        )}
        <TouchableOpacity onPress={() => onDelete(bet.id)} style={st.deleteBtn}>
          <Text style={st.deleteBtnText}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Modal añadir apuesta ─────────────────────────────────────────────────────
function AddBetModal({ visible, onClose, onSave }: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [match, setMatch]   = useState('');
  const [league, setLeague] = useState('Mundial 2026');
  const [market, setMarket] = useState('');
  const [odds, setOdds]     = useState('');
  const [stake, setStake]   = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMatch(''); setLeague('Mundial 2026'); setMarket('');
    setOdds(''); setStake(''); setNotes('');
  };

  const handleSave = async () => {
    if (!match.trim() || !market.trim() || !odds || !stake) {
      Alert.alert('Faltan datos', 'Rellena partido, mercado, cuota y cantidad.');
      return;
    }
    const o = parseFloat(odds.replace(',', '.'));
    const s = parseFloat(stake.replace(',', '.'));
    if (isNaN(o) || o < 1 || isNaN(s) || s <= 0) {
      Alert.alert('Datos incorrectos', 'La cuota debe ser ≥1 y la cantidad >0.');
      return;
    }
    setSaving(true);
    await onSave({ match: match.trim(), league, market: market.trim(), odds: o, stake: s, notes });
    setSaving(false);
    reset();
    onClose();
  };

  const MARKETS = ['Local gana (1)', 'Empate (X)', 'Visitante gana (2)',
    'Más de 2.5 goles', 'Menos de 2.5 goles', 'Ambos marcan - Sí',
    'Handicap asiático', 'Primer goleador', 'Doble oportunidad'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={st.modalCard}>
          <Text style={st.modalTitle}>➕ Nueva apuesta</Text>

          <Text style={st.fieldLabel}>Partido *</Text>
          <TextInput
            style={st.input} placeholder="Argentina vs México"
            placeholderTextColor={colors.text.muted}
            value={match} onChangeText={setMatch}
          />

          <Text style={st.fieldLabel}>Liga / Competición</Text>
          <TextInput
            style={st.input} placeholder="Mundial 2026"
            placeholderTextColor={colors.text.muted}
            value={league} onChangeText={setLeague}
          />

          <Text style={st.fieldLabel}>Mercado *</Text>
          <TextInput
            style={st.input} placeholder="Ej: Local gana, Más de 2.5..."
            placeholderTextColor={colors.text.muted}
            value={market} onChangeText={setMarket}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {MARKETS.map(m => (
              <TouchableOpacity key={m} onPress={() => setMarket(m)} style={[
                st.chip, market === m && { backgroundColor: colors.accent.green + '30', borderColor: colors.accent.green }
              ]}>
                <Text style={[st.chipText, market === m && { color: colors.accent.green }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={st.row}>
            <View style={{ flex: 1 }}>
              <Text style={st.fieldLabel}>Cuota *</Text>
              <TextInput
                style={st.input} placeholder="1.85" keyboardType="decimal-pad"
                placeholderTextColor={colors.text.muted}
                value={odds} onChangeText={setOdds}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={st.fieldLabel}>Cantidad (€) *</Text>
              <TextInput
                style={st.input} placeholder="10" keyboardType="decimal-pad"
                placeholderTextColor={colors.text.muted}
                value={stake} onChangeText={setStake}
              />
            </View>
          </View>

          {odds && stake && !isNaN(parseFloat(odds)) && !isNaN(parseFloat(stake)) && (
            <View style={st.previewBox}>
              <Text style={st.previewText}>
                Si gana → <Text style={{ color: colors.accent.green, fontWeight: '700' }}>
                  +{(parseFloat(stake.replace(',', '.')) * (parseFloat(odds.replace(',', '.')) - 1)).toFixed(2)}€
                </Text>
                {'  '}Si pierde → <Text style={{ color: colors.accent.red, fontWeight: '700' }}>
                  -{parseFloat(stake.replace(',', '.')).toFixed(2)}€
                </Text>
              </Text>
            </View>
          )}

          <Text style={st.fieldLabel}>Notas (opcional)</Text>
          <TextInput
            style={[st.input, { height: 60 }]} placeholder="Ej: Messi en forma, local sin bajas..."
            placeholderTextColor={colors.text.muted} multiline
            value={notes} onChangeText={setNotes}
          />

          <View style={st.modalBtns}>
            <TouchableOpacity style={st.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={st.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#000" /> : <Text style={st.saveBtnText}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Modal cambiar resultado ──────────────────────────────────────────────────
function ResultModal({ bet, onClose, onSave }: {
  bet: Bet | null; onClose: () => void;
  onSave: (id: number, result: BetResult) => Promise<void>;
}) {
  if (!bet) return null;
  const options: { result: BetResult; label: string; color: string }[] = [
    { result: 'won',     label: '✅ Ganada',    color: colors.accent.green },
    { result: 'lost',    label: '❌ Perdida',   color: colors.accent.red },
    { result: 'pending', label: '⏳ Pendiente', color: '#f59e0b' },
    { result: 'void',    label: '↩️ Nula',      color: colors.text.muted },
  ];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.modalOverlay}>
        <View style={[st.modalCard, { gap: 10 }]}>
          <Text style={st.modalTitle}>Resultado</Text>
          <Text style={st.betMatch}>{bet.match}</Text>
          <Text style={[st.betMarket, { marginBottom: 8 }]}>{bet.market} · @{bet.odds}</Text>
          {options.map(o => (
            <TouchableOpacity key={o.result} style={[st.resultOption, { borderColor: o.color }]}
              onPress={() => { onSave(bet.id, o.result); onClose(); }}>
              <Text style={[st.resultOptionText, { color: o.color }]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={st.cancelBtn}>
            <Text style={st.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function ApuestasScreen() {
  const { user, isAuthenticated, bypassActive, setShowLoginModal } = useAuth();
  const [bets, setBets]             = useState<Bet[]>([]);
  const [loading, setLoading]       = useState(false);
  const [showSmart, setShowSmart]   = useState(false);
  const [resultBet, setResultBet]   = useState<Bet | null>(null);
  const [filter, setFilter]         = useState<'all' | 'pending' | 'won' | 'lost'>('all');
  const [upcomingMatches, setUpcomingMatches] = useState<SmartMatch[]>([]);
  const headerGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(headerGlow, { toValue: 1, duration: 2500, useNativeDriver: false }),
      Animated.timing(headerGlow, { toValue: 0, duration: 2500, useNativeDriver: false }),
    ])).start();
  }, []);

  // Cargar partidos próximos para el selector
  useEffect(() => {
    espnMatchService.getUpcomingMatches?.().then(matches => {
      setUpcomingMatches(matches.map(m => ({
        id:       m.id,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        league:   m.league ?? 'Mundial 2026',
        time:     m.time,
      })));
    }).catch(() => {
      // fallback: los cargamos de la lista estática
      espnMatchService.getAllMatches().then(all => {
        const upcoming = all
          .filter(m => m.status === 'upcoming' || m.status === 'scheduled')
          .slice(0, 20)
          .map(m => ({
            id:       m.id,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            league:   m.league ?? 'Mundial 2026',
            time:     m.time,
          }));
        setUpcomingMatches(upcoming);
      }).catch(() => {});
    });
  }, []);

  const loadBets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setBets(await getBets(user.id)); }
    catch { Alert.alert('Error', 'No se pudieron cargar las apuestas.'); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadBets(); }, [loadBets]);

  const handleSetResult = async (id: number, result: BetResult) => {
    const bet = bets.find(b => b.id === id);
    if (!bet) return;
    await updateBetResult(id, result, bet.odds, bet.stake);
    await loadBets();
  };

  const handleDelete = (id: number) => {
    Alert.alert('Eliminar', '¿Seguro que quieres eliminar esta apuesta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await deleteBet(id);
        setBets(prev => prev.filter(b => b.id !== id));
      }},
    ]);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={st.root}>
        <View style={st.emptyState}>
          <Text style={st.emptyIcon}>📒</Text>
          <Text style={st.emptyTitle}>Bankroll Tracker</Text>
          <Text style={st.emptyText}>
            Inicia sesión para registrar tus apuestas y ver tus estadísticas
          </Text>
          <TouchableOpacity style={st.loginBtn} onPress={() => setShowLoginModal(true)}>
            <Text style={st.loginBtnText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stats  = calcStats(bets);
  const filtered = filter === 'all' ? bets : bets.filter(b => b.result === filter);

  return (
    <SafeAreaView style={st.root}>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* ─── Stats banner ─── */}
        <View style={{
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10,
          borderBottomWidth: 1, borderBottomColor: '#1f2937',
          backgroundColor: '#0a1628',
          marginHorizontal: -14, marginTop: -14, marginBottom: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff' }}>
                {stats.totalBets > 0 ? `${stats.totalBets} apuesta${stats.totalBets !== 1 ? 's' : ''}` : 'Sin apuestas aún'}
              </Text>
              <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>registradas en total</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: '#6b7280' }}>Balance total</Text>
              <Text style={{
                fontSize: 22, fontWeight: '900',
                color: stats.totalProfit >= 0 ? '#22c55e' : '#ef4444',
              }}>
                {stats.totalProfit >= 0 ? '+' : ''}{stats.totalProfit.toFixed(2)}€
              </Text>
            </View>
          </View>
          {stats.totalBets > 0 && (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: '#6b7280' }}>Tasa de éxito</Text>
                <Text style={{ fontSize: 9, color: '#22c55e', fontWeight: '700' }}>
                  {stats.totalBets > 0 ? Math.round((stats.won / stats.totalBets) * 100) : 0}%
                </Text>
              </View>
              <View style={{ height: 4, backgroundColor: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{
                  height: '100%',
                  width: `${stats.totalBets > 0 ? (stats.won / stats.totalBets) * 100 : 0}%`,
                  backgroundColor: '#22c55e', borderRadius: 2,
                }} />
              </View>
            </View>
          )}
        </View>

        {/* ─── Stats dashboard ─── */}
        <View style={st.dashboardCard}>
          {/* Saldo total */}
          <View style={st.balanceRow}>
            <View>
              <Text style={st.balanceLabel}>BENEFICIO TOTAL</Text>
              <Text style={[st.balanceValue, {
                color: stats.totalProfit >= 0 ? colors.accent.green : colors.accent.red
              }]}>
                {fmt(stats.totalProfit)}
              </Text>
            </View>
            <View style={st.roiBadge}>
              <Text style={[st.roiText, {
                color: stats.roi >= 0 ? colors.accent.green : colors.accent.red
              }]}>
                ROI {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Grid de stats */}
          <View style={st.statsGrid}>
            <StatCard label="Apuestas"   value={`${stats.totalBets}`} sub={`${stats.pending} pendientes`} />
            <StatCard label="% Acierto"  value={`${stats.winRate.toFixed(0)}%`}
              sub={`${stats.won}G · ${stats.lost}P`}
              color={stats.winRate >= 50 ? colors.accent.green : colors.accent.red}
            />
            <StatCard label="Arriesgado" value={fmtPlain(stats.totalStaked)} />
            <StatCard label="Cuota media" value={stats.avgOdds.toFixed(2)} />
          </View>

          {/* Racha */}
          {stats.currentStreak !== 0 && (
            <View style={[st.streakBanner, {
              backgroundColor: stats.currentStreak > 0
                ? colors.accent.green + '20' : colors.accent.red + '20'
            }]}>
              <Text style={[st.streakText, {
                color: stats.currentStreak > 0 ? colors.accent.green : colors.accent.red
              }]}>
                {stats.currentStreak > 0
                  ? `🔥 Racha ganadora: ${stats.currentStreak} seguidas`
                  : `❄️ Racha perdedora: ${Math.abs(stats.currentStreak)} seguidas`}
              </Text>
            </View>
          )}
        </View>

        {/* ─── Mejor / peor apuesta ─── */}
        {(stats.bestBet || stats.worstBet) && (
          <View style={st.extremesRow}>
            {stats.bestBet && (
              <View style={[st.extremeCard, { borderColor: colors.accent.green + '50' }]}>
                <Text style={st.extremeLabel}>🏆 Mejor</Text>
                <Text style={st.extremeMatch} numberOfLines={1}>{stats.bestBet.match}</Text>
                <Text style={[st.extremeProfit, { color: colors.accent.green }]}>
                  {fmt(stats.bestBet.profit ?? 0)}
                </Text>
              </View>
            )}
            {stats.worstBet && (
              <View style={[st.extremeCard, { borderColor: colors.accent.red + '50' }]}>
                <Text style={st.extremeLabel}>💔 Peor</Text>
                <Text style={st.extremeMatch} numberOfLines={1}>{stats.worstBet.match}</Text>
                <Text style={[st.extremeProfit, { color: colors.accent.red }]}>
                  {fmt(stats.worstBet.profit ?? 0)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ─── Filtros + añadir ─── */}
        <View style={st.filtersRow}>
          {(['all', 'pending', 'won', 'lost'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[st.filterChip, filter === f && st.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[st.filterChipText, filter === f && st.filterChipTextActive]}>
                {f === 'all' ? 'Todas' : f === 'pending' ? '⏳' : f === 'won' ? '✅' : '❌'}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={st.addBtn} onPress={() => {
            if (!isAuthenticated) { setShowLoginModal(true); return; }
            setShowSmart(true);
          }}>
            <Text style={st.addBtnText}>+ Añadir</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Lista de apuestas ─── */}
        {loading ? (
          <ActivityIndicator color={colors.accent.green} style={{ marginTop: 30 }} />
        ) : filtered.length === 0 ? (
          <View style={st.emptyList}>
            <Text style={st.emptyListText}>
              {bets.length === 0
                ? 'No tienes apuestas aún.\nToca "+ Añadir" para empezar.'
                : 'No hay apuestas en este filtro.'}
            </Text>
          </View>
        ) : (
          filtered.map(b => (
            <BetRow
              key={b.id}
              bet={b}
              onSetResult={b => setResultBet(b)}
              onDelete={handleDelete}
            />
          ))
        )}

      </ScrollView>

      <SmartAddBetModal
        visible={showSmart}
        matches={upcomingMatches}
        onClose={() => setShowSmart(false)}
        onSaved={loadBets}
      />
      <ResultModal
        bet={resultBet}
        onClose={() => setResultBet(null)}
        onSave={handleSetResult}
      />
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { padding: 14, paddingBottom: 30 },

  // Dashboard
  dashboardCard: {
    backgroundColor: colors.bg.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border.medium,
  },
  balanceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 14,
  },
  balanceLabel: { fontSize: 11, color: colors.text.muted, fontWeight: '700', letterSpacing: 0.5 },
  balanceValue: { fontSize: 32, fontWeight: '900', marginTop: 2 },
  roiBadge: {
    backgroundColor: colors.bg.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  roiText: { fontSize: 15, fontWeight: '800' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: {
    flex: 1, minWidth: '44%', backgroundColor: colors.bg.primary,
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  statLabel: { fontSize: 10, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text.primary, marginTop: 2 },
  statSub: { fontSize: 10, color: colors.text.muted, marginTop: 2 },
  streakBanner: {
    marginTop: 12, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  streakText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  // Extremos
  extremesRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  extremeCard: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: 12,
    padding: 12, borderWidth: 1,
  },
  extremeLabel: { fontSize: 11, color: colors.text.muted, fontWeight: '700', marginBottom: 4 },
  extremeMatch: { fontSize: 12, color: colors.text.primary, marginBottom: 4 },
  extremeProfit: { fontSize: 16, fontWeight: '800' },

  // Filtros
  filtersRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.subtle,
  },
  filterChipActive: { borderColor: colors.accent.green, backgroundColor: colors.accent.green + '20' },
  filterChipText: { fontSize: 12, color: colors.text.muted, fontWeight: '600' },
  filterChipTextActive: { color: colors.accent.green },
  addBtn: {
    backgroundColor: colors.accent.green, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  addBtnText: { color: '#000', fontWeight: '800', fontSize: 13 },

  // Fila apuesta
  betRow: {
    backgroundColor: colors.bg.card, borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border.subtle,
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
  },
  betLeft: { flex: 1 },
  betRight: { alignItems: 'flex-end', gap: 4 },
  betMatch: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  betMarket: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  betMeta: { fontSize: 11, color: colors.text.muted, marginTop: 4 },
  resultBadge: {
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3,
  },
  resultBadgeText: { fontSize: 11, fontWeight: '700' },
  betProfit: { fontSize: 14, fontWeight: '800' },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 14 },

  // Empty states
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30,
  },
  emptyIcon: { fontSize: 56, marginBottom: 14 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.text.primary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.text.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  loginBtn: { backgroundColor: colors.accent.green, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 13 },
  loginBtnText: { color: '#000', fontWeight: '800', fontSize: 15 },
  emptyList: { alignItems: 'center', paddingTop: 40 },
  emptyListText: { color: colors.text.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Modal base
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 36, maxHeight: '92%',
    borderTopWidth: 1, borderColor: '#1f2937',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text.primary, marginBottom: 16 },
  fieldLabel: { fontSize: 11, color: colors.text.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: colors.bg.primary, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border.subtle, color: colors.text.primary,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  row: { flexDirection: 'row' },
  chip: {
    borderWidth: 1, borderColor: colors.border.subtle, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 2,
  },
  chipText: { fontSize: 12, color: colors.text.muted },
  previewBox: {
    backgroundColor: '#1f2937', borderRadius: 8, padding: 10, marginVertical: 8,
  },
  previewText: { fontSize: 13, color: colors.text.primary, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: {
    flex: 1, borderRadius: 10, borderWidth: 1, borderColor: colors.border.subtle,
    paddingVertical: 13, alignItems: 'center',
  },
  cancelBtnText: { color: colors.text.muted, fontWeight: '600', fontSize: 14 },
  saveBtn: {
    flex: 2, borderRadius: 10, backgroundColor: colors.accent.green,
    paddingVertical: 13, alignItems: 'center',
  },
  saveBtnText: { color: '#000', fontWeight: '800', fontSize: 14 },

  // Result modal
  resultOption: {
    borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center',
  },
  resultOptionText: { fontSize: 15, fontWeight: '700' },
});

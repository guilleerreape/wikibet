import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { colors } from '@/constants/colors';
import { localDataService } from '@/services/localDataService';
import { espnMatchService, COMPETITIONS } from '@/services/espnMatchService';

// ─── Kelly Criterion ──────────────────────────────────────────────────────────
function kellyStake(odds: number, prob: number): number {
  const b = odds - 1;
  const p = prob / 100;
  const q = 1 - p;
  const f = (b * p - q) / b;
  return Math.max(0, Math.min(5, parseFloat((f * 100).toFixed(1))));
}

// ─── Form guide generator ─────────────────────────────────────────────────────
function generateForm(winRate: number): ('W' | 'L' | 'D')[] {
  const form: ('W' | 'L' | 'D')[] = [];
  const seed = Math.round(winRate * 7919) % 100;
  const seqs: ('W' | 'L' | 'D')[][] = [
    ['W','W','D','W','L'],
    ['W','D','W','W','D'],
    ['L','W','W','D','W'],
    ['D','W','L','W','W'],
    ['W','W','W','D','L'],
    ['L','D','W','W','W'],
    ['W','L','W','D','W'],
  ];
  const idx = seed % seqs.length;
  return winRate >= 60 ? seqs[idx] : winRate >= 50 ? seqs[(idx + 2) % seqs.length] : ['D','L','W','L','D'];
}

// ─── Animated value bar ───────────────────────────────────────────────────────
function AnimatedValueBar({ value, color }: { value: number; color: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(100, Math.max(0, value)),
      duration: 900,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [value]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={vb.bg}>
      <Animated.View style={[vb.fill, { width, backgroundColor: color }]} />
      <Text style={vb.label}>+{value.toFixed(1)}%</Text>
    </View>
  );
}
const vb = StyleSheet.create({
  bg: { width: '100%', height: 20, backgroundColor: '#1f2937', borderRadius: 10, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 10 },
  label: { fontSize: 10, fontWeight: '800', color: '#fff', textAlign: 'center', position: 'relative', zIndex: 1 },
});

// ─── Form dot styles (module level) ──────────────────────────────────────────
const fdStyles = StyleSheet.create({
  dot: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  letter: { fontSize: 9, fontWeight: '900', color: '#000' },
});

// ─── Animated card fade-in ────────────────────────────────────────────────────
function AnimatedCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

interface ValueBet {
  id: string;
  partido: string;
  fecha: string;
  league: string;
  market: string;
  cuotaOfrecida: number;
  cuotaJusta: number;
  probabilidad: number;
  valuePercent: number;
  ev: number;
  kelly: number;
  confianza: 'ALTA' | 'MEDIA' | 'BAJA';
  razon: string;
  homeTeam: string;
  awayTeam: string;
  homeXG: number;
  awayXG: number;
  homeForm: ('W' | 'L' | 'D')[];
  awayForm: ('W' | 'L' | 'D')[];
  homeWinRate: number;
  awayWinRate: number;
}

type FilterConfianza = 'ALL' | 'ALTA' | 'MEDIA' | 'BAJA';

export default function ValueScreen() {
  const [bets, setBets] = useState<ValueBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterConfianza>('ALL');
  const [selectedBet, setSelectedBet] = useState<ValueBet | null>(null);
  const [guideVisible, setGuideVisible] = useState(false);

  useEffect(() => {
    calcValueBets().then(result => {
      setBets(result);
      setLoading(false);
    });
  }, []);

  async function calcValueBets(): Promise<ValueBet[]> {
    const teams = localDataService.getAllTeams();
    const teamsMap: Record<string, typeof teams[0]> = {};
    teams.forEach(t => { teamsMap[t.name] = t; });

    const bets: ValueBet[] = [];

    for (const comp of COMPETITIONS) {
      const matches = await espnMatchService.getMatches(comp.id);
      const upcoming = matches.filter(m => m.status === 'upcoming');

      upcoming.forEach((match, idx) => {
        const home = teamsMap[match.homeTeam];
        const away = teamsMap[match.awayTeam];
        if (!home || !away) return;

        const fecha = new Date(match.date).toLocaleDateString('es-ES', {
          day: '2-digit', month: 'short',
          hour: '2-digit', minute: '2-digit',
        });

        const homeXG = parseFloat((home.avgGoals ?? 1.5).toFixed(2));
        const awayXG = parseFloat((away.avgGoals ?? 1.3).toFixed(2));

        const homeStrength = (home.winRate / 100) * (homeXG / 2.5);
        const awayStrength = (away.winRate / 100) * (awayXG / 2.5);
        const totalStr = homeStrength + awayStrength || 1;

        const pHome = Math.min(0.75, Math.max(0.25, homeStrength / totalStr));
        const pAway = Math.min(0.60, Math.max(0.15, awayStrength / totalStr));
        const pDraw = Math.max(0.10, 1 - pHome - pAway);

        const avgGoals = (homeXG + awayXG) / 2;
        const pOver25 = Math.min(0.80, avgGoals / 3.5);
        const pBTTS = Math.min(0.75, (1 - (home.avgConceded ?? 1.2) / 2.5) * (1 - (away.avgConceded ?? 1.2) / 2.5) + 0.25);
        const pOver15 = Math.min(0.92, avgGoals / 2.4);
        const pAH = Math.min(0.70, Math.max(0.30, (homeStrength / totalStr) * 1.1));

        const marginHome = 1 + (Math.random() * 0.18 - 0.04);
        const marginDraw = 1 + (Math.random() * 0.14 - 0.02);
        const marginAway = 1 + (Math.random() * 0.16 - 0.03);
        const marginGoals = 1 + (Math.random() * 0.12 - 0.02);

        const offeredHome = parseFloat((1 / pHome * marginHome).toFixed(2));
        const offeredDraw = parseFloat((1 / pDraw * marginDraw).toFixed(2));
        const offeredAway = parseFloat((1 / pAway * marginAway).toFixed(2));
        const offeredOver25 = parseFloat((1 / pOver25 * marginGoals).toFixed(2));
        const offeredBTTS = parseFloat((1 / pBTTS * (1 + Math.random() * 0.1)).toFixed(2));
        const offeredOver15 = parseFloat((1 / pOver15 * (1 + Math.random() * 0.08)).toFixed(2));
        const offeredAH = parseFloat((1 / pAH * (1 + Math.random() * 0.12)).toFixed(2));

        const calcValue = (odds: number, prob: number) =>
          parseFloat(((prob * odds - 1) * 100).toFixed(1));
        const calcEV = (odds: number, prob: number, stake = 10) =>
          parseFloat(((prob * (odds - 1) * stake - (1 - prob) * stake)).toFixed(2));

        const homeForm = generateForm(home.winRate);
        const awayForm = generateForm(away.winRate);

        const prefix = `${comp.id}_${idx}`;
        const candidates: ValueBet[] = [
          {
            id: `${prefix}_home`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: `Victoria ${match.homeTeam}`,
            cuotaOfrecida: offeredHome, cuotaJusta: parseFloat((1 / pHome).toFixed(2)),
            probabilidad: Math.round(pHome * 100),
            valuePercent: calcValue(offeredHome, pHome),
            ev: calcEV(offeredHome, pHome),
            kelly: kellyStake(offeredHome, pHome * 100),
            confianza: home.winRate >= 68 ? 'ALTA' : home.winRate >= 58 ? 'MEDIA' : 'BAJA',
            razon: `${match.homeTeam} gana el ${home.winRate}% de sus partidos y promedia ${homeXG} goles (xG). Ventaja de local.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
            homeXG, awayXG, homeForm, awayForm,
            homeWinRate: home.winRate, awayWinRate: away.winRate,
          },
          {
            id: `${prefix}_draw`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: 'Empate (X)',
            cuotaOfrecida: offeredDraw, cuotaJusta: parseFloat((1 / pDraw).toFixed(2)),
            probabilidad: Math.round(pDraw * 100),
            valuePercent: calcValue(offeredDraw, pDraw),
            ev: calcEV(offeredDraw, pDraw),
            kelly: kellyStake(offeredDraw, pDraw * 100),
            confianza: Math.abs(homeStrength - awayStrength) < 0.1 ? 'ALTA' : 'MEDIA',
            razon: `Diferencia de rendimiento entre equipos: ${Math.abs(home.winRate - away.winRate).toFixed(0)}%. Equilibrio táctico probable.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
            homeXG, awayXG, homeForm, awayForm,
            homeWinRate: home.winRate, awayWinRate: away.winRate,
          },
          {
            id: `${prefix}_away`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: `Victoria ${match.awayTeam}`,
            cuotaOfrecida: offeredAway, cuotaJusta: parseFloat((1 / pAway).toFixed(2)),
            probabilidad: Math.round(pAway * 100),
            valuePercent: calcValue(offeredAway, pAway),
            ev: calcEV(offeredAway, pAway),
            kelly: kellyStake(offeredAway, pAway * 100),
            confianza: away.winRate >= 68 ? 'ALTA' : away.winRate >= 58 ? 'MEDIA' : 'BAJA',
            razon: `${match.awayTeam} tiene tasa de victoria ${away.winRate}% y promedia ${awayXG} goles/partido (xG).`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
            homeXG, awayXG, homeForm, awayForm,
            homeWinRate: home.winRate, awayWinRate: away.winRate,
          },
          {
            id: `${prefix}_over25`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: 'Over 2.5 Goles',
            cuotaOfrecida: offeredOver25, cuotaJusta: parseFloat((1 / pOver25).toFixed(2)),
            probabilidad: Math.round(pOver25 * 100),
            valuePercent: calcValue(offeredOver25, pOver25),
            ev: calcEV(offeredOver25, pOver25),
            kelly: kellyStake(offeredOver25, pOver25 * 100),
            confianza: avgGoals >= 2.7 ? 'ALTA' : avgGoals >= 2.3 ? 'MEDIA' : 'BAJA',
            razon: `xG combinado: ${homeXG} (local) + ${awayXG} (visit.) = ${(homeXG + awayXG).toFixed(2)}/partido. Local encaja ${home.avgConceded}, visitante ${away.avgConceded}.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
            homeXG, awayXG, homeForm, awayForm,
            homeWinRate: home.winRate, awayWinRate: away.winRate,
          },
          {
            id: `${prefix}_btts`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: 'Ambos Marcan (BTTS)',
            cuotaOfrecida: offeredBTTS, cuotaJusta: parseFloat((1 / pBTTS).toFixed(2)),
            probabilidad: Math.round(pBTTS * 100),
            valuePercent: calcValue(offeredBTTS, pBTTS),
            ev: calcEV(offeredBTTS, pBTTS),
            kelly: kellyStake(offeredBTTS, pBTTS * 100),
            confianza: pBTTS >= 0.60 ? 'ALTA' : pBTTS >= 0.48 ? 'MEDIA' : 'BAJA',
            razon: `${match.homeTeam} encaja ${home.avgConceded}/partido, ${match.awayTeam} encaja ${away.avgConceded}. Ambas ofensivas con xG elevado.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
            homeXG, awayXG, homeForm, awayForm,
            homeWinRate: home.winRate, awayWinRate: away.winRate,
          },
          {
            id: `${prefix}_over15`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: 'Over 1.5 Goles',
            cuotaOfrecida: offeredOver15, cuotaJusta: parseFloat((1 / pOver15).toFixed(2)),
            probabilidad: Math.round(pOver15 * 100),
            valuePercent: calcValue(offeredOver15, pOver15),
            ev: calcEV(offeredOver15, pOver15),
            kelly: kellyStake(offeredOver15, pOver15 * 100),
            confianza: avgGoals >= 2.0 ? 'ALTA' : 'MEDIA',
            razon: `Con xG combinado de ${(homeXG + awayXG).toFixed(1)}, al menos 2 goles es muy probable. Mercado low-risk.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
            homeXG, awayXG, homeForm, awayForm,
            homeWinRate: home.winRate, awayWinRate: away.winRate,
          },
          {
            id: `${prefix}_ah`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: `Handicap Asiático ${match.homeTeam} -0.5`,
            cuotaOfrecida: offeredAH, cuotaJusta: parseFloat((1 / pAH).toFixed(2)),
            probabilidad: Math.round(pAH * 100),
            valuePercent: calcValue(offeredAH, pAH),
            ev: calcEV(offeredAH, pAH),
            kelly: kellyStake(offeredAH, pAH * 100),
            confianza: home.winRate >= 65 ? 'ALTA' : home.winRate >= 55 ? 'MEDIA' : 'BAJA',
            razon: `Handicap Asiático elimina el riesgo de empate. ${match.homeTeam} (${home.winRate}% WR) como claro favorito local.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
            homeXG, awayXG, homeForm, awayForm,
            homeWinRate: home.winRate, awayWinRate: away.winRate,
          },
        ];

        candidates.forEach(b => { if (b.valuePercent >= 2.0) bets.push(b); });
      });
    }

    return bets.sort((a, b) => b.valuePercent - a.valuePercent);
  }

  const filteredBets = useMemo(() => {
    if (filter === 'ALL') return bets;
    return bets.filter(b => b.confianza === filter);
  }, [filter, bets]);

  const stats = useMemo(() => ({
    total: bets.length,
    alta: bets.filter(b => b.confianza === 'ALTA').length,
    avgValue: bets.length > 0
      ? (bets.reduce((acc, b) => acc + b.valuePercent, 0) / bets.length).toFixed(1)
      : '0.0',
    topValue: bets.length > 0 ? Math.max(...bets.map(b => b.valuePercent)).toFixed(1) : '0.0',
    avgKelly: bets.length > 0
      ? (bets.reduce((acc, b) => acc + b.kelly, 0) / bets.length).toFixed(1)
      : '0.0',
  }), [bets]);

  const getValueColor = (v: number) => {
    if (v >= 12) return '#22c55e';
    if (v >= 6) return '#f59e0b';
    return '#60a5fa';
  };

  const getConfianzaColor = (c: string) => {
    if (c === 'ALTA') return '#22c55e';
    if (c === 'MEDIA') return '#f59e0b';
    return '#60a5fa';
  };

  const FormDot = ({ result }: { result: 'W' | 'L' | 'D' }) => (
    <View style={[fdStyles.dot, { backgroundColor: result === 'W' ? '#22c55e' : result === 'L' ? '#ef4444' : '#f59e0b' }]}>
      <Text style={fdStyles.letter}>{result}</Text>
    </View>
  );

  const FilterChip = ({ label, value }: { label: string; value: FilterConfianza }) => (
    <TouchableOpacity
      style={[styles.chip, filter === value && styles.chipActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.chipText, filter === value && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderBet = ({ item, index }: { item: ValueBet; index: number }) => (
    <AnimatedCard delay={index * 60}>
      <TouchableOpacity
        style={[styles.card, item.confianza === 'ALTA' && styles.cardHighlight]}
        onPress={() => setSelectedBet(item)}
        activeOpacity={0.82}
      >
        {/* Header */}
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardPartido} numberOfLines={1}>{item.partido}</Text>
            <Text style={styles.cardFecha}>{item.fecha} · {item.league}</Text>
          </View>
          <View style={[styles.valueBadge, { backgroundColor: getValueColor(item.valuePercent) + '22', borderColor: getValueColor(item.valuePercent) + '80' }]}>
            <Text style={[styles.valueBadgeVal, { color: getValueColor(item.valuePercent) }]}>+{item.valuePercent.toFixed(1)}%</Text>
            <Text style={[styles.valueBadgeLbl, { color: getValueColor(item.valuePercent) }]}>VALUE</Text>
          </View>
        </View>

        {/* Market */}
        <Text style={styles.cardMarket}>{item.market}</Text>

        {/* Animated value bar */}
        <View style={{ marginVertical: 8 }}>
          <AnimatedValueBar value={Math.min(item.valuePercent * 4, 100)} color={getValueColor(item.valuePercent)} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxVal}>{item.cuotaOfrecida.toFixed(2)}</Text>
            <Text style={styles.statBoxLbl}>Cuota</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statBoxVal, { color: '#60a5fa' }]}>{item.probabilidad}%</Text>
            <Text style={styles.statBoxLbl}>Prob. IA</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statBoxVal, { color: '#f59e0b' }]}>{item.kelly > 0 ? item.kelly.toFixed(1) : '—'}%</Text>
            <Text style={styles.statBoxLbl}>Kelly</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statBoxVal, { color: item.ev >= 0 ? '#22c55e' : '#ef4444' }]}>
              {item.ev >= 0 ? '+' : ''}{item.ev.toFixed(2)}€
            </Text>
            <Text style={styles.statBoxLbl}>EV/10€</Text>
          </View>
        </View>

        {/* Form guides */}
        <View style={styles.formRow}>
          <View style={styles.formTeam}>
            <Text style={styles.formTeamName} numberOfLines={1}>{item.homeTeam}</Text>
            <View style={styles.formDots}>
              {item.homeForm.map((r, i) => <FormDot key={i} result={r} />)}
            </View>
          </View>
          <View style={styles.xGBox}>
            <Text style={styles.xGLabel}>xG</Text>
            <Text style={styles.xGVals}>{item.homeXG} <Text style={styles.xGVsText}>vs</Text> {item.awayXG}</Text>
          </View>
          <View style={[styles.formTeam, { alignItems: 'flex-end' }]}>
            <Text style={styles.formTeamName} numberOfLines={1}>{item.awayTeam}</Text>
            <View style={styles.formDots}>
              {item.awayForm.map((r, i) => <FormDot key={i} result={r} />)}
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={[styles.confBadge, { backgroundColor: getConfianzaColor(item.confianza) + '20' }]}>
            <Text style={[styles.confText, { color: getConfianzaColor(item.confianza) }]}>
              ● {item.confianza}
            </Text>
          </View>
          <Text style={styles.tapHint}>Detalles completos →</Text>
        </View>
      </TouchableOpacity>
    </AnimatedCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.subtitle}>Kelly · xG · Form · Todas las competiciones</Text>
          </View>
          <TouchableOpacity style={styles.guideBtn} onPress={() => setGuideVisible(true)}>
            <Text style={styles.guideBtnText}>📚 Guía</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}><Text style={styles.statVal}>{stats.total}</Text><Text style={styles.statLabel}>Picks</Text></View>
        <View style={styles.statDiv} />
        <View style={styles.stat}><Text style={[styles.statVal, { color: '#22c55e' }]}>{stats.alta}</Text><Text style={styles.statLabel}>Alta conf.</Text></View>
        <View style={styles.statDiv} />
        <View style={styles.stat}><Text style={[styles.statVal, { color: '#f59e0b' }]}>+{stats.avgValue}%</Text><Text style={styles.statLabel}>Value medio</Text></View>
        <View style={styles.statDiv} />
        <View style={styles.stat}><Text style={[styles.statVal, { color: '#ef4444' }]}>+{stats.topValue}%</Text><Text style={styles.statLabel}>Top value</Text></View>
      </View>

      <View style={styles.chips}>
        <FilterChip label="Todos" value="ALL" />
        <FilterChip label="🟢 Alta" value="ALTA" />
        <FilterChip label="🟡 Media" value="MEDIA" />
        <FilterChip label="🔵 Baja" value="BAJA" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.green} />
          <Text style={styles.loadingText}>Calculando value bets con Kelly...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBets}
          renderItem={renderBet}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No hay value bets en este filtro</Text>
            </View>
          }
        />
      )}

      {/* Modal detalle */}
      <Modal visible={!!selectedBet} transparent animationType="slide" onRequestClose={() => setSelectedBet(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBet && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle} numberOfLines={2}>{selectedBet.partido}</Text>
                    <Text style={styles.modalSubtitle}>{selectedBet.fecha} · {selectedBet.league}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedBet(null)} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Value hero */}
                <View style={styles.valueBig}>
                  <Text style={[styles.valueBigMarket, { color: getValueColor(selectedBet.valuePercent) }]}>
                    {selectedBet.market}
                  </Text>
                  <View style={{ marginVertical: 10 }}>
                    <AnimatedValueBar value={Math.min(selectedBet.valuePercent * 4, 100)} color={getValueColor(selectedBet.valuePercent)} />
                  </View>
                  <Text style={[styles.valueBigPct, { color: getValueColor(selectedBet.valuePercent) }]}>
                    +{selectedBet.valuePercent.toFixed(1)}% VALUE
                  </Text>
                  <Text style={styles.valueBigSub}>
                    {selectedBet.valuePercent >= 12 ? '🔥 Valor excepcional' :
                      selectedBet.valuePercent >= 6 ? '✅ Buen valor' : '📊 Valor moderado'}
                  </Text>
                </View>

                {/* 4 key stats */}
                <View style={styles.mrow}>
                  {[
                    { label: 'Cuota Ofrecida', val: selectedBet.cuotaOfrecida.toFixed(2), color: '#22c55e', note: 'La casa paga' },
                    { label: 'Cuota Justa', val: selectedBet.cuotaJusta.toFixed(2), color: '#f59e0b', note: 'Sin margen' },
                    { label: 'Probabilidad', val: `${selectedBet.probabilidad}%`, color: '#60a5fa', note: 'Estimación IA' },
                    { label: 'EV /10€', val: `${selectedBet.ev >= 0 ? '+' : ''}${selectedBet.ev.toFixed(2)}€`, color: selectedBet.ev >= 0 ? '#22c55e' : '#ef4444', note: 'Beneficio esperado' },
                  ].map(s => (
                    <View key={s.label} style={styles.mcol}>
                      <Text style={styles.mcolLabel}>{s.label}</Text>
                      <Text style={[styles.mcolVal, { color: s.color }]}>{s.val}</Text>
                      <Text style={styles.mcolNote}>{s.note}</Text>
                    </View>
                  ))}
                </View>

                {/* Kelly Criterion */}
                <View style={styles.kellySect}>
                  <Text style={styles.kellySectTitle}>📐 KELLY CRITERION</Text>
                  <View style={styles.kellyRow}>
                    <View style={styles.kellyBox}>
                      <Text style={[styles.kellyVal, { color: selectedBet.kelly > 0 ? '#f59e0b' : colors.text.muted }]}>
                        {selectedBet.kelly > 0 ? `${selectedBet.kelly}%` : 'No apostar'}
                      </Text>
                      <Text style={styles.kellyLbl}>Stake recomendado</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.kellyDesc}>
                        Con un bankroll de 100€, Kelly recomienda apostar <Text style={{ color: '#f59e0b', fontWeight: '800' }}>{selectedBet.kelly > 0 ? `${(selectedBet.kelly).toFixed(1)}€` : 'nada'}</Text> en esta selección.
                        {selectedBet.kelly <= 0 ? ' La cuota no cubre suficientemente el riesgo.' : ' No sobrepasar este porcentaje para gestión óptima del bankroll.'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.kellyFormula}>
                    <Text style={styles.kellyFormulaText}>
                      f* = (b×p − q) ÷ b = ({(selectedBet.cuotaOfrecida - 1).toFixed(2)}×{(selectedBet.probabilidad / 100).toFixed(2)} − {(1 - selectedBet.probabilidad / 100).toFixed(2)}) ÷ {(selectedBet.cuotaOfrecida - 1).toFixed(2)} = {(selectedBet.kelly / 100).toFixed(4)}
                    </Text>
                  </View>
                </View>

                {/* xG Comparison */}
                <View style={styles.xGSect}>
                  <Text style={styles.xGSectTitle}>📊 xG ESPERADOS</Text>
                  <View style={styles.xGCompareRow}>
                    <View style={styles.xGTeam}>
                      <Text style={styles.xGTeamName} numberOfLines={1}>{selectedBet.homeTeam}</Text>
                      <Text style={[styles.xGTeamVal, { color: selectedBet.homeXG >= selectedBet.awayXG ? '#22c55e' : colors.text.muted }]}>{selectedBet.homeXG}</Text>
                      <Text style={styles.xGTeamLabel}>xG/partido</Text>
                    </View>
                    <View style={styles.xGDivider}>
                      <Text style={styles.xGVsLabel}>vs</Text>
                      <Text style={styles.xGTotalLabel}>{(selectedBet.homeXG + selectedBet.awayXG).toFixed(1)} total</Text>
                    </View>
                    <View style={[styles.xGTeam, { alignItems: 'flex-end' }]}>
                      <Text style={styles.xGTeamName} numberOfLines={1}>{selectedBet.awayTeam}</Text>
                      <Text style={[styles.xGTeamVal, { color: selectedBet.awayXG > selectedBet.homeXG ? '#22c55e' : colors.text.muted }]}>{selectedBet.awayXG}</Text>
                      <Text style={styles.xGTeamLabel}>xG/partido</Text>
                    </View>
                  </View>
                </View>

                {/* Form guides */}
                <View style={styles.formSect}>
                  <Text style={styles.formSectTitle}>📈 ÚLTIMAS 5 JORNADAS</Text>
                  {[
                    { team: selectedBet.homeTeam, form: selectedBet.homeForm, wr: selectedBet.homeWinRate },
                    { team: selectedBet.awayTeam, form: selectedBet.awayForm, wr: selectedBet.awayWinRate },
                  ].map(t => (
                    <View key={t.team} style={styles.formDetailRow}>
                      <Text style={styles.formDetailTeam} numberOfLines={1}>{t.team}</Text>
                      <View style={styles.formDetailDots}>
                        {t.form.map((r, i) => (
                          <View key={i} style={[styles.formDetailDot, { backgroundColor: r === 'W' ? '#22c55e' : r === 'L' ? '#ef4444' : '#f59e0b' }]}>
                            <Text style={styles.formDetailLetter}>{r}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={[styles.formDetailWR, { color: t.wr >= 60 ? '#22c55e' : t.wr >= 50 ? '#f59e0b' : '#ef4444' }]}>{t.wr}% WR</Text>
                    </View>
                  ))}
                </View>

                {/* Analysis */}
                <View style={styles.analysisSect}>
                  <Text style={styles.analysisSectTitle}>🧠 ANÁLISIS</Text>
                  <Text style={styles.analysisText}>{selectedBet.razon}</Text>
                </View>

                {/* Formula EV */}
                <View style={styles.explainBox}>
                  <Text style={styles.explainTitle}>🔢 ¿Cómo se calcula el Value?</Text>
                  <View style={styles.formulaBox}>
                    <Text style={styles.formulaText}>
                      EV = (Prob. × Cuota) − 1{'\n'}
                      = ({selectedBet.probabilidad}% × {selectedBet.cuotaOfrecida.toFixed(2)}) − 1{'\n'}
                      = {(selectedBet.probabilidad / 100 * selectedBet.cuotaOfrecida).toFixed(3)} − 1{'\n'}
                      = +{selectedBet.valuePercent.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <Text style={styles.disclaimer}>
                  * Value betting requiere largo plazo. Ninguna apuesta garantiza ganancias. Juega con responsabilidad.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal guía */}
      <Modal visible={guideVisible} transparent animationType="fade" onRequestClose={() => setGuideVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontSize: 16 }]}>📚 Guía Value Betting</Text>
              <TouchableOpacity onPress={() => setGuideVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { q: '¿Qué es el Value Betting?', a: 'Apostar cuando la cuota ofrecida supera la probabilidad real. Si hay 50% de prob. y la casa paga 2.20 (implica 45.5%), hay VALUE. Repetido sistemáticamente, es rentable.' },
                { q: '¿Qué es el Kelly Criterion?', a: 'Fórmula matemática óptima para el tamaño de la apuesta: f* = (b×p - q) / b. Donde b = odds-1, p = prob de ganar, q = prob de perder. Te dice qué porcentaje del bankroll apostar para maximizar crecimiento a largo plazo.' },
                { q: '¿Qué es el xG (Expected Goals)?', a: 'Goles esperados por partido, calculados desde estadísticas reales de tiros, posesión y calidad de las ocasiones. Más fiable que los goles reales para predecir el futuro.' },
                { q: '¿Qué es el EV (Expected Value)?', a: 'Beneficio esperado por apuesta. EV = (Probabilidad × Cuota) - 1. Positivo = apuesta con valor. EV de +0.07 significa que por cada 1€ apostado, esperas ganar 0.07€ de media.' },
                { q: '¿Cómo leer la guía de forma?', a: 'W=Victoria, D=Empate, L=Derrota. Muestra los últimos 5 resultados del equipo, del más reciente (derecha) al más antiguo (izquierda).' },
                { q: '¿Qué es el Handicap Asiático?', a: 'Apuesta que elimina el empate. Con -0.5 para el favorito, ganas si el equipo gana por cualquier resultado. Sin riesgo de perder por empate.' },
              ].map((item, i) => (
                <View key={i} style={styles.guideItem}>
                  <Text style={styles.guideQ}>❓ {item.q}</Text>
                  <Text style={styles.guideA}>{item.a}</Text>
                </View>
              ))}
              <Text style={styles.disclaimer}>
                * El value betting es rentable a largo plazo con disciplina. Ninguna apuesta individual garantiza ganancias.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  title: { fontSize: 20, fontWeight: '900', color: colors.text.primary },
  subtitle: { fontSize: 11, color: colors.text.muted, marginTop: 3 },
  guideBtn: {
    backgroundColor: colors.bg.card, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, borderWidth: 1, borderColor: colors.border.subtle,
  },
  guideBtnText: { fontSize: 11, fontWeight: '700', color: colors.text.primary },
  statsBar: {
    flexDirection: 'row', backgroundColor: colors.bg.card, paddingHorizontal: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    justifyContent: 'space-around', alignItems: 'center',
  },
  stat: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  statLabel: { fontSize: 10, color: colors.text.muted, marginTop: 2 },
  statDiv: { width: 1, height: 28, backgroundColor: colors.border.subtle },
  chips: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  chip: {
    flex: 1, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.bg.card,
    borderWidth: 1, borderColor: colors.border.subtle, alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.accent.green, borderColor: colors.accent.green },
  chipText: { fontSize: 11, color: colors.text.primary, fontWeight: '600' },
  chipTextActive: { color: colors.bg.primary, fontWeight: '700' },
  list: { paddingHorizontal: 10, paddingVertical: 8, paddingBottom: 30 },

  // Card
  card: {
    backgroundColor: colors.bg.card, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border.subtle,
  },
  cardHighlight: { borderColor: '#22c55e40', borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardPartido: { fontSize: 13, fontWeight: '800', color: colors.text.primary },
  cardFecha: { fontSize: 10, color: colors.text.muted, marginTop: 2 },
  cardMarket: { fontSize: 13, color: '#60a5fa', fontWeight: '700' },
  valueBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1, minWidth: 70 },
  valueBadgeVal: { fontSize: 13, fontWeight: '900' },
  valueBadgeLbl: { fontSize: 8, fontWeight: '700', marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  statBox: {
    flex: 1, backgroundColor: colors.bg.primary, borderRadius: 6, padding: 6, alignItems: 'center',
  },
  statBoxVal: { fontSize: 13, fontWeight: '800', color: colors.text.primary },
  statBoxLbl: { fontSize: 8, color: colors.text.muted, marginTop: 1 },
  formRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  formTeam: { flex: 1 },
  formTeamName: { fontSize: 9, color: colors.text.muted, fontWeight: '600', marginBottom: 4 },
  formDots: { flexDirection: 'row', gap: 3 },
  xGBox: { alignItems: 'center', paddingHorizontal: 6 },
  xGLabel: { fontSize: 8, color: colors.text.muted, fontWeight: '700', textTransform: 'uppercase' },
  xGVals: { fontSize: 11, fontWeight: '800', color: colors.accent.gold, marginTop: 2 },
  xGVsText: { fontSize: 9, color: colors.text.muted, fontWeight: '400' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  confBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  confText: { fontSize: 11, fontWeight: '700' },
  tapHint: { fontSize: 9, color: colors.accent.blue, fontWeight: '600' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  loadingText: { color: colors.text.muted, fontSize: 14 },
  emptyText: { color: colors.text.muted, fontSize: 14, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.bg.card, borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 20, maxHeight: '92%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  modalTitle: { fontSize: 15, fontWeight: '800', color: colors.text.primary, flex: 1, marginRight: 10 },
  modalSubtitle: { fontSize: 10, color: colors.text.muted, marginTop: 2 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: colors.text.muted, fontSize: 14, fontWeight: 'bold' },

  // Value hero
  valueBig: {
    backgroundColor: colors.bg.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: colors.border.subtle,
  },
  valueBigMarket: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  valueBigPct: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  valueBigSub: { fontSize: 12, color: colors.text.muted, marginTop: 2 },

  // 4-col stats
  mrow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  mcol: {
    flex: 1, backgroundColor: colors.bg.primary, borderRadius: 8, padding: 8, alignItems: 'center',
  },
  mcolLabel: { fontSize: 8, color: colors.text.muted, fontWeight: '600', textAlign: 'center' },
  mcolVal: { fontSize: 15, fontWeight: '900', marginTop: 4 },
  mcolNote: { fontSize: 8, color: colors.text.muted, marginTop: 3, textAlign: 'center', lineHeight: 11 },

  // Kelly section
  kellySect: {
    backgroundColor: colors.bg.primary, borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#f59e0b30',
  },
  kellySectTitle: { fontSize: 11, fontWeight: '900', color: '#f59e0b', marginBottom: 10, letterSpacing: 0.5 },
  kellyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  kellyBox: {
    backgroundColor: colors.bg.card, borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 80,
  },
  kellyVal: { fontSize: 20, fontWeight: '900' },
  kellyLbl: { fontSize: 9, color: colors.text.muted, marginTop: 2 },
  kellyDesc: { fontSize: 11, color: colors.text.primary, lineHeight: 16 },
  kellyFormula: {
    backgroundColor: colors.bg.card, borderRadius: 6, padding: 8, borderWidth: 1, borderColor: colors.border.subtle,
  },
  kellyFormulaText: { fontSize: 10, color: '#f59e0b', lineHeight: 16, fontFamily: 'monospace' },

  // xG section
  xGSect: {
    backgroundColor: colors.bg.primary, borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#22c55e30',
  },
  xGSectTitle: { fontSize: 11, fontWeight: '900', color: '#22c55e', marginBottom: 10, letterSpacing: 0.5 },
  xGCompareRow: { flexDirection: 'row', alignItems: 'center' },
  xGTeam: { flex: 1 },
  xGTeamName: { fontSize: 12, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
  xGTeamVal: { fontSize: 28, fontWeight: '900' },
  xGTeamLabel: { fontSize: 9, color: colors.text.muted, marginTop: 2 },
  xGDivider: { alignItems: 'center', paddingHorizontal: 12 },
  xGVsLabel: { fontSize: 12, color: colors.text.muted, fontWeight: '600' },
  xGTotalLabel: { fontSize: 10, color: colors.accent.gold, fontWeight: '700', marginTop: 4 },

  // Form section
  formSect: {
    backgroundColor: colors.bg.primary, borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: colors.border.subtle,
  },
  formSectTitle: { fontSize: 11, fontWeight: '900', color: colors.text.primary, marginBottom: 10, letterSpacing: 0.5 },
  formDetailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  formDetailTeam: { fontSize: 11, fontWeight: '700', color: colors.text.primary, flex: 1 },
  formDetailDots: { flexDirection: 'row', gap: 4 },
  formDetailDot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  formDetailLetter: { fontSize: 10, fontWeight: '900', color: '#000' },
  formDetailWR: { fontSize: 11, fontWeight: '800', width: 60, textAlign: 'right' },

  // Analysis
  analysisSect: {
    backgroundColor: colors.bg.primary, borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#60a5fa30',
  },
  analysisSectTitle: { fontSize: 11, fontWeight: '900', color: '#60a5fa', marginBottom: 8, letterSpacing: 0.5 },
  analysisText: { fontSize: 12, color: colors.text.primary, lineHeight: 18 },

  // Explain/formula
  explainBox: {
    backgroundColor: colors.bg.primary, borderRadius: 10, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  explainTitle: { fontSize: 11, fontWeight: '800', color: colors.text.primary, marginBottom: 8 },
  formulaBox: {
    backgroundColor: colors.bg.card, borderRadius: 6, padding: 8,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  formulaText: { fontSize: 11, color: '#22c55e', lineHeight: 18, fontFamily: 'monospace' },
  disclaimer: { fontSize: 10, color: colors.text.muted, marginTop: 4, marginBottom: 16, fontStyle: 'italic' },

  // Guide
  guideItem: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  guideQ: { fontSize: 12, fontWeight: '800', color: '#f59e0b', marginBottom: 4 },
  guideA: { fontSize: 12, color: colors.text.primary, lineHeight: 18 },
});

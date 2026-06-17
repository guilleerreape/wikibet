import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { colors } from '@/constants/colors';
import { espnMatchService, CompetitionMatch, COMPETITIONS, Competition, StandingEntry, WC_GROUPS_STATIC } from '@/services/espnMatchService';
import { advancedAIAnalysis, AdvancedMatchAnalysis } from '@/services/advancedAIAnalysis';
import { useAuth } from '@/contexts/AuthContext';
import QuickBetModal, { QuickBetData } from '@/components/QuickBetModal';
import { savePrediction, updateActualResult, outcomeFromProbs } from '@/services/predictionTracker';

// ─── Emojis de selecciones ────────────────────────────────────────────────────
const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

// ─── Título animado "COMENTARIO IA" ──────────────────────────────────────────
function AnimatedCommentTitle() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1600, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1600, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const color = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#22c55e', '#60a5fa', '#22c55e'],
  });
  return (
    <Animated.Text style={[styles.commentTitleAnim, { color }]}>
      🤖 COMENTARIO IA
    </Animated.Text>
  );
}

const TEAM_FLAGS: Record<string, string> = {
  // CONMEBOL
  Argentina: '🇦🇷', Brasil: '🇧🇷', Uruguay: '🇺🇾', Colombia: '🇨🇴',
  Ecuador: '🇪🇨', Chile: '🇨🇱', Paraguay: '🇵🇾', Venezuela: '🇻🇪',
  Perú: '🇵🇪', Bolivia: '🇧🇴',
  // UEFA — nombres en español (como los usa la app)
  España: '🇪🇸', Francia: '🇫🇷', Alemania: '🇩🇪', Portugal: '🇵🇹',
  Italia: '🇮🇹', 'Países Bajos': '🇳🇱', Holanda: '🇳🇱', // Holanda = como traduce ESPN
  Bélgica: '🇧🇪', Croacia: '🇭🇷', Polonia: '🇵🇱', Dinamarca: '🇩🇰',
  Suiza: '🇨🇭', Austria: '🇦🇹', Turquía: '🇹🇷', Hungría: '🇭🇺',
  Serbia: '🇷🇸', Rumanía: '🇷🇴', Albania: '🇦🇱', Eslovenia: '🇸🇮',
  'Rep. Checa': '🇨🇿', Ucrania: '🇺🇦', Eslovaquia: '🇸🇰', Grecia: '🇬🇷',
  Noruega: '🇳🇴', Suecia: '🇸🇪',
  Escocia: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Gales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', Inglaterra: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  Georgia: '🇬🇪', Kosovo: '🇽🇰', Islandia: '🇮🇸',
  Bosnia: '🇧🇦', 'Bosnia-Herzegovina': '🇧🇦', // ESPN lo traduce como 'Bosnia'
  Túnez: '🇹🇳', // nombre en español con acento
  // CONCACAF
  México: '🇲🇽', USA: '🇺🇸', 'Estados Unidos': '🇺🇸', Canadá: '🇨🇦',
  Honduras: '🇭🇳', 'Costa Rica': '🇨🇷', Guatemala: '🇬🇹', Panamá: '🇵🇦',
  Jamaica: '🇯🇲', 'Trinidad y Tobago': '🇹🇹', 'El Salvador': '🇸🇻',
  Haití: '🇭🇹', Curazao: '🇨🇼',
  // CAF
  Marruecos: '🇲🇦', Senegal: '🇸🇳', Nigeria: '🇳🇬', Egipto: '🇪🇬',
  Camerún: '🇨🇲', 'Costa de Marfil': '🇨🇮', Ghana: '🇬🇭', Argelia: '🇩🇿',
  Sudáfrica: '🇿🇦', Malí: '🇲🇱', Angola: '🇦🇴', Mozambique: '🇲🇿',
  'R.D. Congo': '🇨🇩', 'Rep. Dem. Congo': '🇨🇩', Guinea: '🇬🇳',
  Tanzania: '🇹🇿', Uganda: '🇺🇬', Kenya: '🇰🇪', Zambia: '🇿🇲',
  Zimbabwe: '🇿🇼', Namibia: '🇳🇦', 'Cabo Verde': '🇨🇻',
  // AFC
  Japón: '🇯🇵', 'Corea del Sur': '🇰🇷', Australia: '🇦🇺', Irán: '🇮🇷',
  'Arabia Saudita': '🇸🇦',
  Qatar: '🇶🇦', Catar: '🇶🇦', // ESPN traduce Qatar como 'Catar' en español
  Uzbekistán: '🇺🇿', Indonesia: '🇮🇩',
  China: '🇨🇳', 'Nueva Zelanda': '🇳🇿', Irak: '🇮🇶', Jordania: '🇯🇴',
};

function getFlag(name: string): string {
  return TEAM_FLAGS[name] || '';
}

function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Post-match accuracy banner ───────────────────────────────────────────────
function PostMatchBanner({ match, analysis }: { match: CompetitionMatch; analysis: AdvancedMatchAnalysis }) {
  const hg = match.homeScore ?? 0;
  const ag = match.awayScore ?? 0;
  const total = hg + ag;
  const pred = analysis.predicciones;

  const homeWinProb = pred.probabilidades.victoriaLocal;
  const drawProb = pred.probabilidades.empate;
  const awayWinProb = pred.probabilidades.victoriaVisitante;
  const predictedOutcome = homeWinProb >= drawProb && homeWinProb >= awayWinProb ? 'local'
    : drawProb >= homeWinProb && drawProb >= awayWinProb ? 'empate' : 'visitante';
  const actualOutcome = hg > ag ? 'local' : hg === ag ? 'empate' : 'visitante';

  const checks = [
    { label: `Victoria 1X2 (${hg}-${ag})`, hit: predictedOutcome === actualOutcome },
    { label: 'Over 0.5 goles', hit: total > 0 },
    { label: 'Over 1.5 goles', hit: total > 1 },
    { label: 'Over 2.5 goles', hit: total > 2 },
    { label: 'Under 2.5 goles', hit: total < 3 },
    { label: 'Ambos marcan (BTTS)', hit: hg > 0 && ag > 0 },
    { label: 'Over 3.5 goles', hit: total > 3 },
  ];

  const correct = checks.filter(c => c.hit).length;

  return (
    <View style={styles.postMatchBanner}>
      <View style={styles.postMatchHeader}>
        <Text style={styles.postMatchTitle}>📊 RESULTADO FINAL</Text>
        <View style={styles.postMatchScoreBadge}>
          <Text style={styles.postMatchScore}>{hg} - {ag}</Text>
        </View>
        <Text style={styles.postMatchAccuracy}>
          {correct}/{checks.length} pronósticos ✓
        </Text>
      </View>
      <View style={styles.postMatchChecks}>
        {checks.map(c => (
          <View key={c.label} style={styles.postMatchCheck}>
            <Text style={[styles.postMatchCheckIcon, { color: c.hit ? '#22c55e' : '#ef4444' }]}>
              {c.hit ? '✅' : '❌'}
            </Text>
            <Text style={[styles.postMatchCheckLabel, { color: c.hit ? colors.text.primary : colors.text.muted }]}>
              {c.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Live analysis banner ─────────────────────────────────────────────────────
function LiveBanner({ match, analysis }: { match: CompetitionMatch; analysis: AdvancedMatchAnalysis }) {
  const hg = match.homeScore ?? 0;
  const ag = match.awayScore ?? 0;
  const total = hg + ag;
  const pred = analysis.predicciones;

  const homeWinProb = pred.probabilidades.victoriaLocal;
  const drawProb = pred.probabilidades.empate;
  const awayWinProb = pred.probabilidades.victoriaVisitante;
  const predictedOutcome = homeWinProb >= drawProb && homeWinProb >= awayWinProb ? match.homeTeam
    : drawProb >= homeWinProb && drawProb >= awayWinProb ? 'Empate' : match.awayTeam;
  const currentOutcome = hg > ag ? match.homeTeam : hg === ag ? 'Empate' : match.awayTeam;
  const onTrack = predictedOutcome === currentOutcome;

  const markets = [
    { label: 'Over 0.5 goles', done: total > 0, on: total > 0, off: false },
    { label: 'Over 1.5 goles', done: total > 1, on: total > 1, off: false },
    { label: 'Over 2.5 goles', done: total > 2, on: total > 2, off: false },
    { label: 'BTTS Sí', done: hg > 0 && ag > 0, on: hg > 0 && ag > 0, off: false },
    {
      label: `Victoria ${predictedOutcome}`,
      done: false,
      on: onTrack,
      off: !onTrack,
    },
  ];

  return (
    <View style={styles.liveBannerWrap}>
      <View style={styles.liveBannerHeader}>
        <Text style={styles.liveBannerDot}>🔴 EN DIRECTO</Text>
        <Text style={styles.liveBannerScore}>{hg} - {ag}</Text>
        <Text style={styles.liveBannerTitle}>ANÁLISIS IA EN DIRECTO</Text>
      </View>
      <Text style={styles.liveBannerSub}>
        Pronóstico IA: <Text style={{ fontWeight: 'bold', color: colors.accent.gold }}>{predictedOutcome}</Text>
        {'  '}→{'  '}
        <Text style={{ fontWeight: 'bold', color: onTrack ? '#22c55e' : '#ef4444' }}>
          {onTrack ? '✅ VÁ BIEN' : '⚠️ CAMBIANDO'}
        </Text>
      </Text>
      <View style={styles.liveMarkets}>
        {markets.map(m => (
          <View key={m.label} style={[styles.liveMarketChip,
            m.done || m.on ? styles.liveMarketHit : styles.liveMarketOpen]}>
            <Text style={styles.liveMarketText}>
              {m.done || m.on ? '✅' : '⏳'} {m.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Animated probability bar ─────────────────────────────────────────────────
function AnimatedProbBar({ val, color, delay = 0 }: { val: number; color: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: val,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, [val]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={styles.probBarBg}>
      <Animated.View style={[styles.probBarFill, { width, backgroundColor: color }]} />
    </View>
  );
}

// ─── Animated section fade-in ─────────────────────────────────────────────────
function AnimSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 320, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon, title, children, accent, delay = 0 }: { icon: string; title: string; children: React.ReactNode; accent?: string; delay?: number }) {
  return (
    <AnimSection delay={delay}>
      <View style={[styles.section, accent ? { borderLeftColor: accent, borderLeftWidth: 3, paddingLeft: 10 } : null]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconWrap, { backgroundColor: (accent || colors.accent.green) + '20' }]}>
            <Text style={styles.sectionIcon}>{icon}</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: accent || colors.text.primary }]}>{title}</Text>
        </View>
        {children}
      </View>
    </AnimSection>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MatchesScreen() {
  const { user, isAuthenticated, trackAnalysis, setShowLoginModal } = useAuth();
  const [quickBet, setQuickBet] = useState<QuickBetData | null>(null);
  const [selectedComp, setSelectedComp] = useState<Competition>(COMPETITIONS[0]);
  const [matches, setMatches] = useState<CompetitionMatch[]>([]);
  const [filtered, setFiltered] = useState<CompetitionMatch[]>([]);
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<CompetitionMatch | null>(null);
  const [analysis, setAnalysis] = useState<AdvancedMatchAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [postMatchComment, setPostMatchComment] = useState<string | null>(null);
  const [postMatchCommentLoading, setPostMatchCommentLoading] = useState(false);

  const loadData = useCallback(async (comp: Competition) => {
    setLoadingMatches(true);
    setLoadingStandings(true);
    setSearchTerm('');
    setStandings([]);
    const [matchData, standingsData] = await Promise.all([
      espnMatchService.getMatches(comp.id),
      espnMatchService.getStandings(comp.id),
    ]);
    setMatches(matchData);
    setStandings(standingsData);
    setLoadingMatches(false);
    setLoadingStandings(false);
  }, []);

  useEffect(() => {
    loadData(selectedComp);
    const interval = setInterval(() => loadData(selectedComp), 90 * 1000);
    return () => clearInterval(interval);
  }, [selectedComp, loadData]);

  useEffect(() => {
    const todayStart = getTodayStart().getTime();
    let result = matches;
    if (!showPast) {
      result = result.filter(m => new Date(m.date).getTime() >= todayStart || m.status === 'live');
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(m =>
        m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [matches, searchTerm, showPast]);

  const generatePostMatchComment = async (match: CompetitionMatch, anal: AdvancedMatchAnalysis) => {
    if (!CLAUDE_API_KEY) return;
    setPostMatchCommentLoading(true);
    const hg = match.homeScore ?? 0;
    const ag = match.awayScore ?? 0;
    const total = hg + ag;
    const pred = anal.predicciones;
    const pHome = pred.probabilidades.victoriaLocal;
    const pDraw = pred.probabilidades.empate;
    const pAway = pred.probabilidades.victoriaVisitante;
    const predictedOutcome = pHome >= pDraw && pHome >= pAway ? match.homeTeam
      : pDraw >= pHome && pDraw >= pAway ? 'empate' : match.awayTeam;
    const actualOutcome = hg > ag ? match.homeTeam : hg === ag ? 'empate' : match.awayTeam;
    const resultOk = predictedOutcome.toLowerCase() === actualOutcome.toLowerCase();
    const over25Ok = (pred.mercados?.over2_5 ?? 0) >= 50 ? total > 2 : total <= 2;
    const bttsOk = (pred.mercados?.btts_si ?? 0) >= 50 ? (hg > 0 && ag > 0) : !(hg > 0 && ag > 0);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          messages: [{
            role: 'user',
            content: `Partido terminado: ${match.homeTeam} ${hg}-${ag} ${match.awayTeam}.

Nuestra IA predijo:
- Resultado más probable: ${predictedOutcome} → ${resultOk ? '✅ ACERTADO' : '❌ FALLADO'} (resultado real: ${actualOutcome})
- Over 2.5 goles: ${(pred.mercados?.over2_5 ?? 0)}% de probabilidad → ${over25Ok ? '✅ ACERTADO' : '❌ FALLADO'} (${total} goles)
- BTTS ambos marcan: ${(pred.mercados?.btts_si ?? 0)}% → ${bttsOk ? '✅ ACERTADO' : '❌ FALLADO'}
- xG esperados: ${pred.golesEsperados?.local ?? '?'} (local) vs ${pred.golesEsperados?.visitante ?? '?'} (visitante)

Escribe un comentario corto (3-4 frases) en ESPAÑOL sobre cómo fue el partido real vs nuestras predicciones. Menciona si los pronósticos de goles fueron precisos, el resultado táctico, y qué podemos aprender de este partido para las próximas apuestas. Sé específico y analítico. Solo el texto del comentario, sin JSON ni formato.`,
          }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPostMatchComment(data.content?.[0]?.text || null);
      }
    } catch {}
    setPostMatchCommentLoading(false);
  };

  const openAnalysis = async (match: CompetitionMatch) => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    const ok = await trackAnalysis();
    if (!ok) return;
    setSelectedMatch(match);
    setAnalysis(null);
    setAnalysisError(false);
    setPostMatchComment(null);
    setPostMatchCommentLoading(false);
    setAnalysisLoading(true);
    try {
      const result = await advancedAIAnalysis.analyzeMatchComprehensive(
        match.homeTeam, match.awayTeam, match.league
      );
      setAnalysis(result);

      // ── Track prediction in Supabase (shared across all users/devices) ──
      const probs = result.predicciones.probabilidades;
      const mkts  = result.predicciones.mercados ?? {};
      const predicted = outcomeFromProbs(
        probs.victoriaLocal, probs.empate, probs.victoriaVisitante
      );
      // Save 4 markets: 1X2 + over1.5 + over2.5 + btts (first write wins)
      savePrediction(
        match.id,
        match.league,
        match.homeTeam,
        match.awayTeam,
        match.date,
        predicted,
        {
          pred_over15: (mkts.over1_5  ?? 0) >= 50,
          pred_over25: (mkts.over2_5  ?? 0) >= 50,
          pred_btts:   (mkts.btts_si  ?? 0) >= 50,
        }
      );
      // If match already finished, also record the actual result
      if (match.status === 'finished' &&
          match.homeScore !== undefined &&
          match.awayScore !== undefined) {
        updateActualResult(match.id, match.homeScore, match.awayScore);
      }

      // Comentario IA para partidos ya jugados
      if (match.status === 'finished') {
        generatePostMatchComment(match, result);
      }
    } catch {
      setAnalysisError(true);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      day: d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' }),
      time: d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      dateKey: d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
    };
  };

  const groupedMatches = useCallback(() => {
    const groups: Record<string, CompetitionMatch[]> = {};
    filtered.forEach(m => {
      const key = new Date(m.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const dA = filtered.find(m => new Date(m.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) === a)?.date || '';
      const dB = filtered.find(m => new Date(m.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) === b)?.date || '';
      return new Date(dA).getTime() - new Date(dB).getTime();
    });
  }, [filtered]);

  // ─── Standings ──────────────────────────────────────────────────────────────
  const StandingsRow = ({ row, i }: { row: StandingEntry; i: number }) => (
    <View style={[styles.standingsRow, i % 2 === 0 && styles.standingsRowAlt]}>
      <Text style={[styles.tdPos, i < 2 && { color: colors.accent.green }]}>{i + 1}</Text>
      <View style={styles.tdTeamWrap}>
        {getFlag(row.team) ? <Text style={styles.tdFlag}>{getFlag(row.team)}</Text> : null}
        <Text style={styles.tdTeam} numberOfLines={1}>{row.team}</Text>
      </View>
      <Text style={styles.tdStat}>{row.played}</Text>
      <Text style={styles.tdStat}>{row.won}</Text>
      <Text style={styles.tdStat}>{row.drawn}</Text>
      <Text style={styles.tdStat}>{row.lost}</Text>
      <Text style={[styles.tdStat, { color: row.gd >= 0 ? colors.accent.green : colors.accent.red }]}>
        {row.gd > 0 ? '+' : ''}{row.gd}
      </Text>
      <Text style={[styles.tdStat, { fontWeight: 'bold', color: colors.accent.gold }]}>{row.points}</Text>
    </View>
  );

  const TableHead = () => (
    <View style={styles.standingsTableHead}>
      <Text style={styles.thPos}>#</Text>
      <Text style={styles.thTeam}>Equipo</Text>
      <Text style={styles.thStat}>PJ</Text>
      <Text style={styles.thStat}>G</Text>
      <Text style={styles.thStat}>E</Text>
      <Text style={styles.thStat}>P</Text>
      <Text style={styles.thStat}>GD</Text>
      <Text style={[styles.thStat, { color: colors.accent.gold }]}>PTS</Text>
    </View>
  );

  const StandingsWidget = () => {
    if (loadingStandings) return (
      <View style={styles.standingsBg}>
        <ActivityIndicator size="small" color={colors.accent.gold} />
      </View>
    );
    if (standings.length === 0) return null;

    if (selectedComp.id === 'FIFA.WORLD') {
      const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
      const byGroup: Record<string, StandingEntry[]> = {};
      standings.forEach(s => {
        const g = s.group || 'X';
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(s);
      });
      groupLetters.forEach(g => {
        if (!byGroup[g] || byGroup[g].length === 0) byGroup[g] = WC_GROUPS_STATIC[g] || [];
      });
      return (
        <View style={styles.standingsBg}>
          <Text style={styles.standingsTitle}>🏆 Clasificación Mundial 2026 — Fase de Grupos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 8 }}>
              {groupLetters.map(letter => {
                const groupTeams = (byGroup[letter] || []).sort((a, b) => {
                  if (b.points !== a.points) return b.points - a.points;
                  if (b.gd !== a.gd) return b.gd - a.gd;
                  return b.gf - a.gf;
                });
                return (
                  <View key={letter} style={styles.wcGroupBox}>
                    <Text style={styles.wcGroupTitle}>GRUPO {letter}</Text>
                    <TableHead />
                    {groupTeams.map((row, i) => <StandingsRow key={row.team} row={row} i={i} />)}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={styles.standingsBg}>
        <Text style={styles.standingsTitle}>{selectedComp.emoji} Clasificación — {selectedComp.shortName}</Text>
        <TableHead />
        {standings.map((row, i) => <StandingsRow key={row.team} row={row} i={i} />)}
      </View>
    );
  };

  // ─── Match card ─────────────────────────────────────────────────────────────
  const MatchCard = ({ match }: { match: CompetitionMatch }) => {
    const { time } = formatDate(match.date);
    const isLive = match.status === 'live';
    const isFinished = match.status === 'finished';
    const homeFlag = getFlag(match.homeTeam);
    const awayFlag = getFlag(match.awayTeam);

    return (
      <TouchableOpacity
        style={[styles.card, isLive && styles.cardLive]}
        onPress={() => openAnalysis(match)}
        activeOpacity={0.75}
      >
        {isLive && <View style={styles.liveBadge}><Text style={styles.liveText}>● EN VIVO</Text></View>}
        <View style={styles.matchRow}>
          <View style={styles.teamSide}>
            {homeFlag ? <Text style={styles.matchFlag}>{homeFlag}</Text> : null}
            <Text style={styles.teamName} numberOfLines={1}>{match.homeTeam}</Text>
          </View>
          <View style={styles.scoreBox}>
            {isFinished || isLive ? (
              <Text style={[styles.score, isLive && { color: colors.accent.red }]}>
                {match.homeScore ?? 0} - {match.awayScore ?? 0}
              </Text>
            ) : (
              <Text style={styles.kickoff}>{time}</Text>
            )}
          </View>
          <View style={[styles.teamSide, { justifyContent: 'flex-end' }]}>
            <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
              {match.awayTeam}
            </Text>
            {awayFlag ? <Text style={styles.matchFlag}>{awayFlag}</Text> : null}
          </View>
        </View>
        <View style={styles.cardFooter}>
          {match.venue ? <Text style={styles.venueText} numberOfLines={1}>📍 {match.venue}</Text> : <View />}
          <Text style={styles.analysisHint}>
            {isLive ? '🔴 Análisis IA Live' : isFinished ? '📊 Ver resultado' : '🤖 Análisis IA'} →
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Analysis modal content ──────────────────────────────────────────────────
  const AnalysisContent = () => {
    if (!analysis || !selectedMatch) return null;
    const pred = analysis.predicciones;
    const isLive = selectedMatch.status === 'live';
    const isFinished = selectedMatch.status === 'finished';

    const ProbBar = ({ val, color, delay = 0 }: { val: number; color: string; delay?: number }) => (
      <AnimatedProbBar val={val} color={color} delay={delay} />
    );

    const LineRow = ({ label, local, visitante, total, highlight }: {
      label: string; local: number; visitante: number; total: number; highlight?: boolean;
    }) => (
      <View style={[styles.lineRow, highlight && styles.lineRowHighlight]}>
        <Text style={styles.lineLabelText}>{label}</Text>
        <Text style={[styles.lineVal, local >= 60 && { color: '#22c55e' }]}>{local}%</Text>
        <Text style={[styles.lineVal, visitante >= 60 && { color: '#22c55e' }]}>{visitante}%</Text>
        <Text style={[styles.lineValTotal, total >= 60 && { color: '#22c55e' }]}>{total}%</Text>
      </View>
    );

    return (
      <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>

        {/* COMENTARIO IA — overlay exclusivo para partidos terminados */}
        {isFinished && (
          <View style={styles.commentOverlay}>
            <AnimatedCommentTitle />
            {postMatchCommentLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <ActivityIndicator size="small" color="#60a5fa" />
                <Text style={styles.commentLoadingText}>Analizando el partido terminado...</Text>
              </View>
            ) : postMatchComment ? (
              <Text style={styles.commentText}>{postMatchComment}</Text>
            ) : null}
            <PostMatchBanner match={selectedMatch} analysis={analysis} />
          </View>
        )}

        {/* EN DIRECTO */}
        {isLive && <LiveBanner match={selectedMatch} analysis={analysis} />}

        {/* RESUMEN */}
        <Section icon="📋" title="RESUMEN EJECUTIVO" delay={0}>
          <Text style={styles.bodyText}>{analysis.resumenEjecutivo}</Text>
          <Text style={[styles.bodyText, { marginTop: 6, color: colors.text.muted, fontStyle: 'italic' }]}>
            {analysis.importanciaDelPartido}
          </Text>
        </Section>

        {/* EQUIPOS */}
        <Section icon="🎽" title="ANÁLISIS DE EQUIPOS" delay={80}>
          <View style={styles.row2}>
            {[
              { name: selectedMatch.homeTeam, data: analysis.equipoLocal, flag: getFlag(selectedMatch.homeTeam) },
              { name: selectedMatch.awayTeam, data: analysis.equipoVisitante, flag: getFlag(selectedMatch.awayTeam) },
            ].map(({ name, data, flag }) => (
              <View key={name} style={styles.teamBox}>
                <Text style={styles.teamBoxName} numberOfLines={1}>{flag} {name}</Text>
                <Text style={styles.teamBoxForm}>{data.formacion}</Text>
                <Text style={styles.teamBoxStat}>xG: {data.xG_promedio} · xGA: {data.xGA_promedio}</Text>
                <Text style={[styles.teamBoxStat, { color: colors.accent.blue, marginTop: 3 }]}>{data.forma}</Text>
                <Text style={[styles.teamBoxStat, { marginTop: 4 }]}>
                  {data.fortalezas.map(f => `✅ ${f}`).join('\n')}
                </Text>
                {data.lesionados?.length > 0 && (
                  <Text style={[styles.teamBoxStat, { color: colors.accent.red, marginTop: 3 }]}>
                    🩹 {data.lesionados.join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Section>

        {/* 1X2 */}
        <Section icon="🎯" title="PROBABILIDADES 1X2" delay={160}>
          <View style={styles.row3}>
            {[
              { label: `1 ${selectedMatch.homeTeam}`, prob: pred.probabilidades.victoriaLocal, cuota: pred.cuotasTeoricas.victoriaLocal, color: colors.accent.green, d: 200 },
              { label: 'X Empate', prob: pred.probabilidades.empate, cuota: pred.cuotasTeoricas.empate, color: colors.accent.gold, d: 320 },
              { label: `2 ${selectedMatch.awayTeam}`, prob: pred.probabilidades.victoriaVisitante, cuota: pred.cuotasTeoricas.victoriaVisitante, color: colors.accent.red, d: 440 },
            ].map(item => (
              <View key={item.label} style={styles.probCell}>
                <Text style={styles.probLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={[styles.probValue, { color: item.color }]}>{item.prob}%</Text>
                <ProbBar val={item.prob} color={item.color} delay={item.d} />
                <Text style={styles.probOdds}>{item.cuota.toFixed(2)}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.bodyText, { marginTop: 8, textAlign: 'center', color: colors.text.muted, fontSize: 11 }]}>
            🏆 Resultado más probable: <Text style={{ color: colors.accent.gold, fontWeight: 'bold' }}>{pred.resultadoMasProbable}</Text>
          </Text>
        </Section>

        {/* GOLES */}
        <Section icon="⚽" title="PROBABILIDAD DE GOLES" delay={240}>
          {/* Header tabla */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeadCell, { flex: 1.4 }]}>Mercado</Text>
            <Text style={styles.tableHeadCell}>{getFlag(selectedMatch.homeTeam)} Local</Text>
            <Text style={styles.tableHeadCell}>{getFlag(selectedMatch.awayTeam)} Visit.</Text>
            <Text style={[styles.tableHeadCell, { color: colors.accent.gold }]}>Total</Text>
          </View>
          {pred.goles && [
            { label: '+0.5 goles', data: pred.goles.over0_5 },
            { label: '+1.5 goles', data: pred.goles.over1_5 },
            { label: '+2.5 goles', data: pred.goles.over2_5 },
            { label: '+3.5 goles', data: pred.goles.over3_5 },
          ].map((row, i) => (
            <LineRow
              key={row.label}
              label={row.label}
              local={row.data.local}
              visitante={row.data.visitante}
              total={row.data.total}
              highlight={i % 2 === 0}
            />
          ))}
          <View style={[styles.lineRow, { backgroundColor: colors.accent.green + '18', marginTop: 2 }]}>
            <Text style={[styles.lineLabelText, { color: colors.accent.green, fontWeight: '700' }]}>xG esperados</Text>
            <Text style={[styles.lineVal, { color: colors.accent.green, fontWeight: '700' }]}>{pred.golesEsperados.local}</Text>
            <Text style={[styles.lineVal, { color: colors.accent.green, fontWeight: '700' }]}>{pred.golesEsperados.visitante}</Text>
            <Text style={[styles.lineValTotal, { color: colors.accent.green, fontWeight: '700' }]}>{pred.golesEsperados.total}</Text>
          </View>
        </Section>

        {/* TIROS A PUERTA */}
        <Section icon="🎯" title="TIROS A PUERTA" delay={320}>
          {pred.tiros && (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeadCell, { flex: 1.4 }]}>Stat</Text>
                <Text style={styles.tableHeadCell}>{getFlag(selectedMatch.homeTeam)} Local</Text>
                <Text style={styles.tableHeadCell}>{getFlag(selectedMatch.awayTeam)} Visit.</Text>
                <Text style={[styles.tableHeadCell, { color: colors.accent.gold }]}>Total</Text>
              </View>
              {[
                { label: 'Tiros totales', data: pred.tiros.total },
                { label: 'A puerta', data: pred.tiros.a_puerta },
              ].map((row, i) => (
                <View key={row.label} style={[styles.lineRow, i % 2 === 0 && styles.lineRowHighlight]}>
                  <Text style={styles.lineLabelText}>{row.label}</Text>
                  <Text style={styles.lineVal}>{row.data.local}</Text>
                  <Text style={styles.lineVal}>{row.data.visitante}</Text>
                  <Text style={[styles.lineValTotal, { color: colors.accent.gold }]}>{row.data.total}</Text>
                </View>
              ))}
              {pred.tiros.jugadores?.length > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>Por jugador</Text>
                  {pred.tiros.jugadores.map(j => (
                    <View key={j.nombre} style={styles.playerRow}>
                      <Text style={styles.playerRowFlag}>{j.equipo === 'local' ? getFlag(selectedMatch.homeTeam) || '🏠' : getFlag(selectedMatch.awayTeam) || '✈️'}</Text>
                      <Text style={styles.playerRowName} numberOfLines={1}>{j.nombre}</Text>
                      <Text style={styles.playerRowStat}>{j.tiros} tiros</Text>
                      <Text style={[styles.playerRowStat, { color: colors.accent.green }]}>{j.a_puerta} a puerta</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </Section>

        {/* CÓRNERS */}
        <Section icon="🚩" title="CÓRNERS" delay={400}>
          {pred.corners && (
            <>
              <View style={styles.row3} style={{ gap: 8, marginBottom: 10 }}>
                <View style={styles.bigStatCell}>
                  <Text style={[styles.bigStatVal, { color: colors.accent.gold }]}>{pred.corners.total_esperado}</Text>
                  <Text style={styles.bigStatLbl}>Esperados</Text>
                </View>
                <View style={styles.bigStatCell}>
                  <Text style={styles.bigStatVal}>{pred.corners.local}</Text>
                  <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.homeTeam)} Local</Text>
                </View>
                <View style={styles.bigStatCell}>
                  <Text style={styles.bigStatVal}>{pred.corners.visitante}</Text>
                  <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.awayTeam)} Visit.</Text>
                </View>
              </View>
              <View style={styles.marketsGrid}>
                {[
                  { label: '+8.5', val: pred.corners.over8_5 },
                  { label: '+9.5', val: pred.corners.over9_5 },
                  { label: '+10.5', val: pred.corners.over10_5 },
                  { label: '-8.5', val: pred.corners.under8_5 },
                ].map(m => (
                  <View key={m.label} style={styles.marketCell}>
                    <Text style={styles.marketLabel}>Córners {m.label}</Text>
                    <Text style={[styles.marketVal, { color: (m.val ?? 0) >= 55 ? colors.accent.green : colors.text.primary }]}>
                      {m.val ?? '-'}%
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </Section>

        {/* FALTAS */}
        <Section icon="⚠️" title="FALTAS" delay={480}>
          {pred.faltas && (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <View style={styles.bigStatCell}>
                  <Text style={[styles.bigStatVal, { color: colors.accent.red }]}>{pred.faltas.total_esperado}</Text>
                  <Text style={styles.bigStatLbl}>Esperadas</Text>
                </View>
                <View style={styles.bigStatCell}>
                  <Text style={styles.bigStatVal}>{pred.faltas.local}</Text>
                  <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.homeTeam)} Local</Text>
                </View>
                <View style={styles.bigStatCell}>
                  <Text style={styles.bigStatVal}>{pred.faltas.visitante}</Text>
                  <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.awayTeam)} Visit.</Text>
                </View>
              </View>
              <View style={styles.marketsGrid}>
                <View style={styles.marketCell}>
                  <Text style={styles.marketLabel}>+20.5 faltas</Text>
                  <Text style={[styles.marketVal, { color: pred.faltas.over20_5 >= 55 ? colors.accent.green : colors.text.primary }]}>
                    {pred.faltas.over20_5}%
                  </Text>
                </View>
              </View>
            </>
          )}
        </Section>

        {/* TARJETAS */}
        <Section icon="🟨" title="TARJETAS" delay={560}>
          {pred.tarjetas && (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <View style={styles.bigStatCell}>
                  <Text style={[styles.bigStatVal, { color: colors.accent.gold }]}>{pred.tarjetas.total_esperado}</Text>
                  <Text style={styles.bigStatLbl}>🟨 Esperadas</Text>
                </View>
                <View style={styles.bigStatCell}>
                  <Text style={styles.bigStatVal}>{pred.tarjetas.amarillas_local}</Text>
                  <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.homeTeam)} Local</Text>
                </View>
                <View style={styles.bigStatCell}>
                  <Text style={styles.bigStatVal}>{pred.tarjetas.amarillas_visitante}</Text>
                  <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.awayTeam)} Visit.</Text>
                </View>
              </View>
              <View style={styles.marketsGrid}>
                {[
                  { label: '+2.5 🟨', val: pred.tarjetas.over2_5 },
                  { label: '+3.5 🟨', val: pred.tarjetas.over3_5 },
                  { label: '+4.5 🟨', val: pred.tarjetas.over4_5 },
                  { label: '-3.5 🟨', val: pred.tarjetas.under3_5 },
                ].map(m => (
                  <View key={m.label} style={styles.marketCell}>
                    <Text style={styles.marketLabel}>{m.label}</Text>
                    <Text style={[styles.marketVal, { color: (m.val ?? 0) >= 55 ? colors.accent.gold : colors.text.primary }]}>
                      {m.val ?? '-'}%
                    </Text>
                  </View>
                ))}
              </View>
              {pred.tarjetas.rojaProb > 0 && (
                <Text style={[styles.bodyText, { marginTop: 6, color: colors.accent.red }]}>
                  🟥 Probabilidad de roja: {pred.tarjetas.rojaProb}%
                </Text>
              )}
              {pred.tarjetas.jugadores_riesgo?.length > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>Jugadores en riesgo 🟨</Text>
                  {pred.tarjetas.jugadores_riesgo.map(j => (
                    <View key={j.nombre} style={styles.playerRow}>
                      <Text style={styles.playerRowFlag}>{j.equipo === 'local' ? getFlag(selectedMatch.homeTeam) || '🏠' : getFlag(selectedMatch.awayTeam) || '✈️'}</Text>
                      <Text style={styles.playerRowName}>{j.nombre}</Text>
                      <Text style={[styles.playerRowStat, { color: colors.accent.gold }]}>{j.probabilidad}% prob. amarilla</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </Section>

        {/* GOLEADORES */}
        <Section icon="⚽" title="GOLEADORES PREVISTOS" delay={640}>
          {pred.goleadores && (
            <>
              <View style={styles.topScorerBox}>
                <Text style={styles.topScorerLabel}>⭐ PRIMER GOLEADOR</Text>
                <Text style={styles.topScorerName}>{getFlag(pred.goleadores.primer_goleador.equipo)} {pred.goleadores.primer_goleador.nombre}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                  <Text style={[styles.topScorerStat, { color: colors.accent.green }]}>{pred.goleadores.primer_goleador.probabilidad}% probabilidad</Text>
                  <Text style={[styles.topScorerStat, { color: colors.accent.gold }]}>Cuota: {pred.goleadores.primer_goleador.cuota.toFixed(2)}</Text>
                </View>
              </View>
              {pred.goleadores.anytime?.length > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>Anytime scorer</Text>
                  {pred.goleadores.anytime.map(g => (
                    <View key={g.nombre} style={styles.scorerRow}>
                      <Text style={styles.scorerFlag}>{getFlag(g.equipo)}</Text>
                      <Text style={styles.scorerName}>{g.nombre}</Text>
                      <Text style={[styles.scorerStat, { color: colors.accent.green }]}>{g.probabilidad}%</Text>
                      <Text style={[styles.scorerStat, { color: colors.accent.gold }]}>{g.cuota.toFixed(2)}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </Section>

        {/* RESULTADOS EXACTOS */}
        {pred.resultados_exactos && pred.resultados_exactos.length > 0 && (
          <Section icon="🏆" title="RESULTADOS EXACTOS (TOP 5)" delay={680}>
            {pred.resultados_exactos.map((r, i) => (
              <View key={r.resultado} style={[styles.exactScoreRow, i % 2 === 0 && styles.lineRowHighlight]}>
                <Text style={[styles.exactScorePos, { color: i === 0 ? colors.accent.gold : colors.text.muted }]}>{i + 1}.</Text>
                <Text style={styles.exactScoreResult}>{r.resultado}</Text>
                <Text style={[styles.exactScoreProb, { color: i === 0 ? colors.accent.green : colors.text.primary }]}>{r.probabilidad}%</Text>
                <Text style={styles.exactScoreOdds}>{r.cuota.toFixed(1)}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* MERCADOS */}
        <Section icon="📊" title="MERCADOS DE GOLES" delay={720}>
          <View style={styles.marketsGrid}>
            {[
              { label: 'Over 1.5', val: pred.mercados?.over1_5 },
              { label: 'Over 2.5', val: pred.mercados?.over2_5 },
              { label: 'Over 3.5', val: pred.mercados?.over3_5 },
              { label: 'Under 2.5', val: pred.mercados?.under2_5 },
              { label: 'BTTS Sí', val: pred.mercados?.btts_si },
              { label: 'BTTS No', val: pred.mercados?.btts_no },
            ].map(m => (
              <View key={m.label} style={styles.marketCell}>
                <Text style={styles.marketLabel}>{m.label}</Text>
                <Text style={[styles.marketVal, { color: (m.val ?? 0) >= 55 ? colors.accent.green : colors.text.primary }]}>
                  {m.val ?? '-'}%
                </Text>
              </View>
            ))}
          </View>
        </Section>

        {/* TÁCTICA */}
        <Section icon="♟️" title="ANÁLISIS TÁCTICO" delay={800}>
          <View style={styles.row2}>
            <View style={styles.teamBox}>
              <Text style={styles.teamBoxName}>{getFlag(selectedMatch.homeTeam)} Local</Text>
              <Text style={[styles.teamBoxForm, { fontSize: 13 }]}>{analysis.tactico.sistemaLocal}</Text>
            </View>
            <View style={styles.teamBox}>
              <Text style={styles.teamBoxName}>{getFlag(selectedMatch.awayTeam)} Visitante</Text>
              <Text style={[styles.teamBoxForm, { fontSize: 13 }]}>{analysis.tactico.sistemaVisitante}</Text>
            </View>
          </View>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>{analysis.tactico.enfoque}</Text>
          <Text style={[styles.bodyText, { marginTop: 6, fontWeight: '600', color: colors.accent.blue }]}>
            {analysis.tactico.ventajaTactica}
          </Text>
          {analysis.tactico.clavesDelPartido?.map((k, i) => (
            <Text key={i} style={[styles.bodyText, { marginTop: 4, color: colors.text.muted }]}>🔑 {k}</Text>
          ))}
        </Section>

        {/* APUESTAS CON VALOR */}
        {analysis.apuestasRecomendadas?.length > 0 && (
          <Section icon="💰" title="APUESTAS CON VALOR" accent={colors.accent.gold} delay={760}>
            {analysis.apuestasRecomendadas.slice(0, 3).map((bet, i) => (
              <View key={i} style={[styles.betCard, i === 0 && styles.betCardTop]}>
                {i === 0 && (
                  <View style={styles.topPickBadge}>
                    <Text style={styles.topPickText}>⭐ TOP PICK</Text>
                  </View>
                )}
                <View style={styles.betHead}>
                  <Text style={styles.betMarket}>{bet.mercado}</Text>
                  <View style={[styles.betValBadge, { backgroundColor: bet.valor >= 0.05 ? colors.accent.green : colors.accent.gold }]}>
                    <Text style={styles.betValText}>{bet.valor >= 0 ? '+' : ''}{(bet.valor * 100).toFixed(1)}% value</Text>
                  </View>
                  <View style={[styles.riskBadge, {
                    backgroundColor: bet.riesgo === 'bajo' ? '#22c55e30' : bet.riesgo === 'medio' ? colors.accent.gold + '30' : colors.accent.red + '30'
                  }]}>
                    <Text style={[styles.riskText, {
                      color: bet.riesgo === 'bajo' ? '#22c55e' : bet.riesgo === 'medio' ? colors.accent.gold : colors.accent.red
                    }]}>{bet.riesgo}</Text>
                  </View>
                </View>
                <Text style={[styles.betSel, i === 0 && { fontSize: 15, color: '#fff' }]}>{bet.seleccion}</Text>
                <View style={styles.betStats}>
                  <View style={styles.betOddsBox}>
                    <Text style={styles.betOddsVal}>{bet.cuota.toFixed(2)}</Text>
                    <Text style={styles.betOddsLbl}>Cuota</Text>
                  </View>
                  <View style={styles.betProbBox}>
                    <Text style={styles.betProbVal}>{bet.probabilidad}%</Text>
                    <Text style={styles.betProbLbl}>Prob. IA</Text>
                  </View>
                  <View style={styles.betValueBox}>
                    <Text style={[styles.betProbVal, { color: bet.valor >= 0.05 ? colors.accent.green : colors.accent.gold }]}>
                      {bet.valor >= 0 ? '+' : ''}{(bet.valor * 100).toFixed(0)}%
                    </Text>
                    <Text style={styles.betProbLbl}>Value</Text>
                  </View>
                </View>
                <Text style={styles.betRazon}>{bet.razonamiento}</Text>
                {/* Botón añadir apuesta rápida */}
                <TouchableOpacity
                  style={[styles.quickBetBtn, i === 0 && styles.quickBetBtnTop]}
                  onPress={() => setQuickBet({
                    match:  `${selectedMatch!.homeTeam} vs ${selectedMatch!.awayTeam}`,
                    league: selectedMatch!.league ?? 'Mundial 2026',
                    market: `${bet.mercado} — ${bet.seleccion}`,
                    odds:   bet.cuota,
                  })}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.quickBetBtnText, i === 0 && { color: '#000' }]}>
                    📥 Añadir apuesta
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </Section>
        )}

        {/* CONCLUSIÓN */}
        <Section icon="🎯" title="CONCLUSIÓN" delay={880}>
          <Text style={styles.bodyText}>{analysis.conclusion}</Text>
          <View style={styles.confBox}>
            <View style={[styles.confBar, { width: `${analysis.confianza}%` as any }]} />
            <Text style={styles.confText}>Confianza IA: {analysis.confianza}%</Text>
          </View>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  const groups = groupedMatches();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Partidos</Text>
        <Text style={styles.subtitle}>
          {filtered.length} partidos{showPast ? ' (todos)' : ' · hoy en adelante'}
        </Text>
      </View>

      {/* Competiciones */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.compBar} contentContainerStyle={styles.compContent}
      >
        {COMPETITIONS.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.compChip, selectedComp.id === c.id && styles.compChipActive]}
            onPress={() => setSelectedComp(c)}
          >
            <Text style={styles.compEmoji}>{c.emoji}</Text>
            <Text style={[styles.compText, selectedComp.id === c.id && styles.compTextActive]}>
              {c.shortName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Búsqueda + toggle */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar equipo..."
          placeholderTextColor={colors.text.muted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <TouchableOpacity
          style={[styles.pastToggleBtn, showPast && styles.pastToggleBtnActive]}
          onPress={() => setShowPast(v => !v)}
        >
          <Text style={[styles.pastToggleText, showPast && styles.pastToggleTextActive]}>
            {showPast ? '📅 Todos' : '🕐 Jugados'}
          </Text>
        </TouchableOpacity>
      </View>

      {loadingMatches ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.green} />
          <Text style={styles.loadingLabel}>Cargando partidos...</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={([date]) => date}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<StandingsWidget />}
          renderItem={({ item: [dateLabel, dayMatches] }) => (
            <View>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>
                  {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
                </Text>
                <Text style={styles.dateHeaderCount}>{dayMatches.length} partidos</Text>
              </View>
              {dayMatches.map(m => <MatchCard key={m.id} match={m} />)}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No hay partidos disponibles</Text>
            </View>
          }
        />
      )}

      {/* Modal análisis */}
      <Modal visible={!!selectedMatch} transparent animationType="slide">
        <SafeAreaView style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => { setSelectedMatch(null); setAnalysis(null); }}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalFlag}>{getFlag(selectedMatch?.homeTeam || '')}</Text>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedMatch?.homeTeam} vs {selectedMatch?.awayTeam}
              </Text>
              <Text style={styles.modalFlag}>{getFlag(selectedMatch?.awayTeam || '')}</Text>
            </View>
            <View style={{ width: 30 }} />
          </View>

          {analysisLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.accent.green} />
              <Text style={styles.loadingLabel}>🤖 Analizando con IA...</Text>
              <Text style={styles.loadingSubLabel}>Generando pronósticos detallados...</Text>
            </View>
          ) : analysisError ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>⚠️ No se pudo cargar el análisis</Text>
              <Text style={styles.errorSub}>Verifica tu API key o conexión</Text>
            </View>
          ) : analysis ? (
            <AnalysisContent />
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Quick bet modal */}
      <QuickBetModal
        visible={!!quickBet}
        data={quickBet}
        onClose={() => setQuickBet(null)}
        onSaved={() => setQuickBet(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.text.primary },
  subtitle: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  // Competition bar
  compBar: { height: 56, flexShrink: 0, flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  compContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  compChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.subtle, height: 36,
  },
  compChipActive: { backgroundColor: colors.accent.green, borderColor: colors.accent.green },
  compEmoji: { fontSize: 13 },
  compText: { fontSize: 12, fontWeight: '600', color: colors.text.primary },
  compTextActive: { color: colors.bg.primary, fontWeight: '700' },
  // Search
  searchWrap: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 9, color: colors.text.primary, borderWidth: 1,
    borderColor: colors.border.subtle, fontSize: 12,
  },
  pastToggleBtn: {
    backgroundColor: colors.bg.card, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 9, borderWidth: 1, borderColor: colors.border.subtle, justifyContent: 'center',
  },
  pastToggleBtnActive: { backgroundColor: colors.accent.gold + '25', borderColor: colors.accent.gold },
  pastToggleText: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },
  pastToggleTextActive: { color: colors.accent.gold },
  list: { paddingHorizontal: 12, paddingBottom: 16 },
  // Standings
  standingsBg: {
    backgroundColor: colors.bg.card, borderRadius: 12, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border.subtle, overflow: 'hidden', padding: 8,
  },
  standingsTitle: { fontSize: 12, fontWeight: '800', color: colors.accent.gold, marginBottom: 6, paddingHorizontal: 4 },
  wcGroupBox: {
    backgroundColor: colors.bg.primary, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border.subtle, width: 320, marginRight: 8,
  },
  wcGroupTitle: {
    fontSize: 11, fontWeight: '900', color: colors.accent.gold,
    backgroundColor: colors.accent.gold + '18', paddingHorizontal: 10, paddingVertical: 6, letterSpacing: 1,
  },
  standingsTableHead: {
    flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  thPos: { width: 22, fontSize: 9, color: colors.text.muted, fontWeight: '700', textAlign: 'center' },
  thTeam: { flex: 1, fontSize: 9, color: colors.text.muted, fontWeight: '700' },
  thStat: { width: 28, fontSize: 9, color: colors.text.muted, fontWeight: '700', textAlign: 'center' },
  standingsRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 7, alignItems: 'center' },
  standingsRowAlt: { backgroundColor: colors.bg.primary + '60' },
  tdPos: { width: 22, fontSize: 11, fontWeight: 'bold', color: colors.text.muted, textAlign: 'center' },
  tdTeamWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  tdFlag: { fontSize: 12 },
  tdTeam: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.text.primary },
  tdStat: { width: 28, fontSize: 11, color: colors.text.primary, textAlign: 'center' },
  // Date
  dateHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 4, marginTop: 4,
  },
  dateHeaderText: { fontSize: 12, fontWeight: '700', color: colors.accent.green, textTransform: 'capitalize' },
  dateHeaderCount: { fontSize: 10, color: colors.text.muted },
  // Match card
  card: {
    backgroundColor: colors.bg.card, borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border.subtle,
  },
  cardLive: { borderColor: colors.accent.red, borderWidth: 1.5 },
  liveBadge: { marginBottom: 6, alignSelf: 'flex-start' },
  liveText: { color: colors.accent.red, fontSize: 10, fontWeight: '800' },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  teamSide: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchFlag: { fontSize: 16 },
  teamName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text.primary },
  scoreBox: { paddingHorizontal: 10 },
  score: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  kickoff: { fontSize: 15, fontWeight: '700', color: colors.accent.blue },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  venueText: { fontSize: 9, color: colors.text.muted, flex: 1 },
  analysisHint: { fontSize: 10, color: colors.accent.blue, fontWeight: '600' },
  // Generic
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 40 },
  loadingLabel: { color: colors.text.primary, fontSize: 14, fontWeight: '600' },
  loadingSubLabel: { color: colors.text.muted, fontSize: 11 },
  emptyText: { color: colors.text.muted, fontSize: 14 },
  errorText: { color: colors.accent.red, fontSize: 16, fontWeight: '600' },
  errorSub: { color: colors.text.muted, fontSize: 12 },
  // Modal
  modalBg: { flex: 1, backgroundColor: colors.bg.primary },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  modalTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 'bold', color: colors.text.primary },
  modalFlag: { fontSize: 18 },
  closeBtn: { fontSize: 22, color: colors.text.primary, fontWeight: 'bold' },
  modalScroll: { flex: 1, padding: 14 },
  // Section
  section: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIconWrap: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionIcon: { fontSize: 14 },
  sectionTitle: {
    fontSize: 11, fontWeight: '900', color: colors.text.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, flex: 1,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle, paddingBottom: 4,
  },
  bodyText: { fontSize: 12, color: colors.text.primary, lineHeight: 18 },
  subSectionTitle: { fontSize: 10, fontWeight: '700', color: colors.text.muted, marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  row2: { flexDirection: 'row', gap: 8 },
  row3: { flexDirection: 'row', gap: 8 },
  teamBox: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  teamBoxName: { fontSize: 11, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
  teamBoxForm: { fontSize: 14, fontWeight: 'bold', color: colors.accent.green },
  teamBoxStat: { fontSize: 10, color: colors.text.muted, marginTop: 2, lineHeight: 16 },
  // Probabilities
  probCell: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: 8, padding: 8,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle,
  },
  probLabel: { fontSize: 9, color: colors.text.muted, fontWeight: '600' },
  probValue: { fontSize: 18, fontWeight: 'bold', marginTop: 2 },
  probOdds: { fontSize: 12, fontWeight: '600', color: colors.accent.gold, marginTop: 4 },
  probBarBg: {
    width: '100%', height: 4, backgroundColor: colors.border.subtle,
    borderRadius: 2, marginTop: 4, overflow: 'hidden', position: 'relative',
  },
  probBarFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2 },
  probBarText: { display: 'none' },
  // Goals/stats table
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5,
    backgroundColor: colors.bg.card, borderRadius: 6, marginBottom: 2,
  },
  tableHeadCell: { width: 52, fontSize: 9, fontWeight: '700', color: colors.text.muted, textAlign: 'center' },
  lineRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, alignItems: 'center', borderRadius: 4 },
  lineRowHighlight: { backgroundColor: colors.bg.card },
  lineLabelText: { flex: 1.4, fontSize: 11, fontWeight: '600', color: colors.text.primary },
  lineVal: { width: 52, fontSize: 12, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  lineValTotal: { width: 52, fontSize: 12, fontWeight: '800', color: colors.accent.gold, textAlign: 'center' },
  // Big stat cells
  bigStatCell: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: 8, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle,
  },
  bigStatVal: { fontSize: 22, fontWeight: 'bold', color: colors.text.primary },
  bigStatLbl: { fontSize: 9, color: colors.text.muted, marginTop: 2, textAlign: 'center' },
  // Players
  playerRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 5,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle + '50', gap: 6,
  },
  playerRowFlag: { fontSize: 13, width: 20 },
  playerRowName: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text.primary },
  playerRowStat: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },
  // Scorers
  topScorerBox: {
    backgroundColor: colors.accent.gold + '15', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: colors.accent.gold + '40', marginBottom: 8,
  },
  topScorerLabel: { fontSize: 9, fontWeight: '800', color: colors.accent.gold, textTransform: 'uppercase', letterSpacing: 1 },
  topScorerName: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginTop: 4 },
  topScorerStat: { fontSize: 12, fontWeight: '600' },
  scorerRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle + '50', gap: 6,
  },
  scorerFlag: { fontSize: 14, width: 22 },
  scorerName: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text.primary },
  scorerStat: { fontSize: 12, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  // Exact scores
  exactScoreRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 8, borderRadius: 6, gap: 6 },
  exactScorePos: { fontSize: 11, fontWeight: '700', width: 20 },
  exactScoreResult: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.text.primary },
  exactScoreProb: { fontSize: 13, fontWeight: '800', width: 40, textAlign: 'right' },
  exactScoreOdds: { fontSize: 11, color: colors.accent.gold, fontWeight: '600', width: 36, textAlign: 'right' },
  // Markets
  marketsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  marketCell: {
    minWidth: '22%', backgroundColor: colors.bg.card, borderRadius: 6, padding: 8,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle, flex: 1,
  },
  marketLabel: { fontSize: 9, color: colors.text.muted, fontWeight: '600', textAlign: 'center' },
  marketVal: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  // Bets
  betCard: {
    backgroundColor: colors.bg.primary, borderRadius: 10, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border.subtle,
  },
  betCardTop: {
    backgroundColor: '#0d1f0d', borderColor: colors.accent.gold + '60',
    borderWidth: 1.5,
  },
  topPickBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.accent.gold,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8,
  },
  topPickText: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
  betHead: { flexDirection: 'row', gap: 6, alignItems: 'center', marginBottom: 6 },
  betMarket: { flex: 1, fontSize: 10, fontWeight: '700', color: colors.text.muted, textTransform: 'uppercase' },
  betValBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  betValText: { fontSize: 10, fontWeight: 'bold', color: '#000' },
  riskBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  riskText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  betSel: { fontSize: 13, fontWeight: 'bold', color: colors.text.primary, marginBottom: 8 },
  betStats: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  betStat: { fontSize: 11, color: colors.text.muted },
  betOddsBox: {
    flex: 1, backgroundColor: colors.accent.gold + '18', borderRadius: 8,
    padding: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.accent.gold + '30',
  },
  betOddsVal: { fontSize: 18, fontWeight: '900', color: colors.accent.gold },
  betOddsLbl: { fontSize: 9, color: colors.text.muted, marginTop: 1 },
  betProbBox: {
    flex: 1, backgroundColor: colors.accent.green + '18', borderRadius: 8,
    padding: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.accent.green + '30',
  },
  betProbVal: { fontSize: 18, fontWeight: '900', color: colors.accent.green },
  betProbLbl: { fontSize: 9, color: colors.text.muted, marginTop: 1 },
  betValueBox: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: 8,
    padding: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle,
  },
  betRazon: { fontSize: 11, color: colors.text.primary, lineHeight: 16, fontStyle: 'italic', marginBottom: 4 },
  quickBetBtn: {
    marginTop: 8, backgroundColor: '#22c55e15', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#22c55e40',
  },
  quickBetBtnTop: {
    backgroundColor: colors.accent.green,
    borderColor: colors.accent.green,
  },
  quickBetBtnText: { fontSize: 13, fontWeight: '700', color: '#22c55e' },
  // Confidence
  confBox: {
    backgroundColor: colors.bg.card, borderRadius: 8, padding: 12, marginTop: 8,
    borderWidth: 1, borderColor: colors.border.subtle, overflow: 'hidden',
  },
  confBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: colors.accent.green + '25', borderRadius: 8,
  },
  confText: { fontSize: 13, fontWeight: '700', color: colors.text.primary },
  // Comentario IA overlay
  commentOverlay: {
    backgroundColor: '#060e1a', borderRadius: 14, padding: 16, marginBottom: 16,
    borderWidth: 2, borderColor: '#3b82f680',
  },
  commentTitleAnim: {
    fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10,
  },
  commentLoadingText: { fontSize: 12, color: '#9ca3af', fontStyle: 'italic' },
  commentText: {
    fontSize: 13, color: '#d1d5db', lineHeight: 20, marginBottom: 14,
    borderLeftWidth: 3, borderLeftColor: '#3b82f6', paddingLeft: 10,
  },
  // Post-match banner
  postMatchBanner: {
    backgroundColor: colors.bg.card, borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 2, borderColor: colors.accent.green + '60',
  },
  postMatchHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  postMatchTitle: { fontSize: 11, fontWeight: '800', color: colors.accent.green, textTransform: 'uppercase', letterSpacing: 1 },
  postMatchScoreBadge: {
    backgroundColor: colors.accent.green + '20', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1, borderColor: colors.accent.green + '50',
  },
  postMatchScore: { fontSize: 16, fontWeight: 'bold', color: colors.accent.green },
  postMatchAccuracy: { fontSize: 11, fontWeight: '600', color: colors.text.muted },
  postMatchChecks: { gap: 4 },
  postMatchCheck: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postMatchCheckIcon: { fontSize: 13, width: 20 },
  postMatchCheckLabel: { fontSize: 11, fontWeight: '500' },
  // Live banner
  liveBannerWrap: {
    backgroundColor: colors.accent.red + '15', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 2, borderColor: colors.accent.red + '60',
  },
  liveBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  liveBannerDot: { fontSize: 11, fontWeight: '800', color: colors.accent.red },
  liveBannerScore: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary, paddingHorizontal: 8 },
  liveBannerTitle: { fontSize: 11, fontWeight: '800', color: colors.accent.red, textTransform: 'uppercase', letterSpacing: 0.5 },
  liveBannerSub: { fontSize: 12, color: colors.text.primary, marginBottom: 10 },
  liveMarkets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  liveMarketChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  liveMarketHit: { backgroundColor: '#22c55e20', borderColor: '#22c55e50' },
  liveMarketOpen: { backgroundColor: colors.bg.card, borderColor: colors.border.subtle },
  liveMarketText: { fontSize: 10, fontWeight: '600', color: colors.text.primary },
});

import React, { useState, useEffect, useCallback, useRef, Component } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { colors } from '@/constants/colors';
import { espnMatchService, CompetitionMatch, COMPETITIONS, Competition, StandingEntry, WC_GROUPS_STATIC, getMatchDetails, MatchLineup, MatchEvent } from '@/services/espnMatchService';
import { advancedAIAnalysis, AdvancedMatchAnalysis } from '@/services/advancedAIAnalysis';
import { localDataService } from '@/services/localDataService';
import LineupPitch from '@/components/LineupPitch';
import MatchEventsPanel from '@/components/MatchEventsPanel';
import { useAuth } from '@/contexts/AuthContext';
import QuickBetModal, { QuickBetData } from '@/components/QuickBetModal';
import SmartAddBetModal, { type SmartMatch } from '@/components/SmartAddBetModal';
import { savePrediction, updateActualResult, outcomeFromProbs, buildConfidentPredictions, verifyPredictions } from '@/services/predictionTracker';
import { sportsDbService } from '@/services/sportsDbService';
import { getWcSquad } from '@/services/wcSquads';
import { getVenueWeather } from '@/services/weatherService';

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

// ─── Header animado "PARTIDOS" ────────────────────────────────────────────────
function PartidosHeader({ count, showPast, comp }: { count: number; showPast: boolean; comp?: { name: string; id: string; emoji: string; shortName: string } }) {
  const anim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2200, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 2200, useNativeDriver: false }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
    return () => { anim.stopAnimation(); pulse.stopAnimation(); };
  }, []);

  const color = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#22c55e', '#f59e0b', '#22c55e'],
  });
  const glowColor = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['#22c55e40', '#f59e0b40', '#22c55e40'],
  });

  return (
    <Animated.View style={[{
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 1, borderBottomColor: '#1f2937',
      backgroundColor: '#060d18',
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    }, { backgroundColor: glowColor }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Animated.Text style={{ fontSize: 22, transform: [{ scale: pulse }] }}>
          {comp?.emoji ?? '📊'}
        </Animated.Text>
        <View>
          <Animated.Text style={{ fontSize: 18, fontWeight: '900', letterSpacing: 0.5, color }}>
            PARTIDOS
          </Animated.Text>
          {comp && (
            <Text style={{ fontSize: 9, color: '#4b5563', fontWeight: '600', marginTop: 1 }}>
              {comp.id === 'FIFA.WORLD' ? 'Mundial 2026 · Fase de Grupos' : comp.name}
            </Text>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Animated.Text style={{ fontSize: 20, fontWeight: '900', color }}>
          {count}
        </Animated.Text>
        <Text style={{ fontSize: 9, color: '#4b5563', fontWeight: '600' }}>
          {showPast ? 'total' : 'próximos'}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Error Boundary for analysis render ──────────────────────────────────────
// Catches render-phase errors in child components (AiBetPanel, LiveBanner, etc.)
// that cannot be caught by try/catch inside a render function.
class AnalysisErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error?.message ?? String(error) };
  }
  componentDidCatch(error: any, info: any) {
    console.error('[WikiBet] AnalysisErrorBoundary caught:', error?.message, info?.componentStack?.slice(0, 200));
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <View style={{ padding: 30, alignItems: 'center' }}>
          <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center', marginBottom: 6 }}>
            ⚠️ Error mostrando análisis
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 10, textAlign: 'center' }}>
            {this.state.errorMsg}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Panel APUESTA DE LA IA (upcoming + played) ───────────────────────────────
function AiBetPanel({ match, analysis }: { match: CompetitionMatch; analysis: AdvancedMatchAnalysis }) {
  if (!analysis?.predicciones) return null;
  const isFinished = match.status === 'finished';
  const isLive     = match.status === 'live';
  const hg = match.homeScore ?? 0;
  const ag = match.awayScore ?? 0;

  const preds    = buildConfidentPredictions(analysis.predicciones);
  const verified = (isFinished || isLive)
    ? verifyPredictions(preds, hg, ag)
    : preds;

  const correct = verified.filter(p => p.hit === true).length;
  const total   = verified.length;
  const hitPct  = total > 0 ? Math.round((correct / total) * 100) : null;

  const headerAccent = isFinished
    ? (hitPct !== null && hitPct >= 65 ? '#22c55e' : '#f59e0b')
    : '#3b82f6';

  // Animated bar per prediction
  const PredBar = ({ prob, hit }: { prob?: number; hit?: boolean }) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(anim, { toValue: prob ?? 0, duration: 700, useNativeDriver: false }).start();
    }, [prob]);
    const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
    const barColor = hit === true ? '#22c55e' : hit === false ? '#ef4444' : '#3b82f6';
    return (
      <View style={aib.barBg}>
        <Animated.View style={[aib.barFill, { width, backgroundColor: barColor + 'cc' }]} />
        {prob !== undefined && (
          <Text style={aib.barLabel}>{prob}%</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[aib.wrap, { borderColor: headerAccent + '60' }]}>
      {/* Header */}
      <View style={[aib.header, { backgroundColor: headerAccent + '18' }]}>
        <View style={aib.headerLeft}>
          <Text style={[aib.headerTitle, { color: headerAccent }]}>🤖 APUESTA DE LA IA</Text>
          <Text style={aib.headerSub}>
            {isFinished
              ? `Resultado: ${correct}/${total} pronósticos acertados`
              : isLive
              ? `En directo · ${total} pronósticos activos`
              : `${total} pronósticos con alta confianza`}
          </Text>
        </View>
        {isFinished && hitPct !== null && (
          <View style={[aib.pctBadge, { backgroundColor: headerAccent + '30', borderColor: headerAccent + '80' }]}>
            <Text style={[aib.pctText, { color: headerAccent }]}>{hitPct}%</Text>
          </View>
        )}
        {!isFinished && !isLive && (
          <View style={[aib.pctBadge, { backgroundColor: '#3b82f620', borderColor: '#3b82f660' }]}>
            <Text style={[aib.pctText, { color: '#3b82f6' }]}>⭐ TOP</Text>
          </View>
        )}
      </View>

      {/* Prediction rows */}
      {verified.map((p, i) => (
        <View key={p.market} style={[aib.predRow, i < verified.length - 1 && aib.predBorder]}>
          <Text style={aib.predEmoji}>{p.emoji}</Text>
          <View style={aib.predInfo}>
            <Text style={[aib.predLabel, (isFinished || isLive) && p.hit !== undefined && {
              color: p.hit ? '#e5e7eb' : '#6b7280',
            }]}>
              {p.label}
            </Text>
            <PredBar prob={p.prob} hit={isFinished || isLive ? p.hit : undefined} />
          </View>
          {(isFinished || isLive) && p.hit !== undefined ? (
            <Text style={aib.hitIcon}>{p.hit ? '✅' : '❌'}</Text>
          ) : (
            <View style={[aib.probChip, p.prob && p.prob >= 80 && aib.probChipHot]}>
              <Text style={[aib.probChipText, p.prob && p.prob >= 80 && aib.probChipTextHot]}>
                {p.prob ?? '—'}%
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* Footer note */}
      <View style={aib.footer}>
        <Text style={aib.footerText}>
          {isFinished
            ? `📊 Análisis post-partido · Se registra en % Aciertos IA`
            : `📌 La IA solo incluye los pronósticos en los que confía más del umbral`}
        </Text>
      </View>
    </View>
  );
}

const aib = StyleSheet.create({
  wrap: {
    borderRadius: 14, borderWidth: 1.5,
    backgroundColor: '#080f1a', marginBottom: 18, overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  headerSub:   { fontSize: 10, color: '#6b7280', marginTop: 2 },
  pctBadge: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center',
  },
  pctText: { fontSize: 14, fontWeight: '900' },
  predRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 10,
  },
  predBorder: { borderBottomWidth: 1, borderBottomColor: '#0f1e2e' },
  predEmoji:  { fontSize: 16, width: 22 },
  predInfo:   { flex: 1, gap: 4 },
  predLabel:  { fontSize: 12, fontWeight: '600', color: '#d1d5db' },
  barBg: {
    height: 6, backgroundColor: '#1e293b', borderRadius: 3,
    overflow: 'hidden', position: 'relative', justifyContent: 'center',
  },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  barLabel: { fontSize: 8, color: '#fff', fontWeight: '700', textAlign: 'right', paddingRight: 4, zIndex: 1 },
  hitIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  probChip: {
    backgroundColor: '#1e293b', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#334155',
  },
  probChipHot: { backgroundColor: '#1e3a1e', borderColor: '#22c55e60' },
  probChipText: { fontSize: 11, fontWeight: '800', color: '#94a3b8' },
  probChipTextHot: { color: '#22c55e' },
  footer: {
    backgroundColor: '#050c15', paddingHorizontal: 14, paddingVertical: 7,
    borderTopWidth: 1, borderTopColor: '#0f1e2e',
  },
  footerText: { fontSize: 9, color: '#374151', fontStyle: 'italic' },
});

// ─── Post-match accuracy banner ───────────────────────────────────────────────
function PostMatchBanner({ match, analysis }: { match: CompetitionMatch; analysis: AdvancedMatchAnalysis }) {
  const hg = match.homeScore ?? 0;
  const ag = match.awayScore ?? 0;

  // Dynamic: the AI emits however many predictions it's confident about
  const preds   = buildConfidentPredictions(analysis.predicciones);
  const verified = verifyPredictions(preds, hg, ag);
  const correct  = verified.filter(p => p.hit === true).length;

  return (
    <View style={styles.postMatchBanner}>
      <View style={styles.postMatchHeader}>
        <Text style={styles.postMatchTitle}>📊 RESULTADO FINAL</Text>
        <View style={styles.postMatchScoreBadge}>
          <Text style={styles.postMatchScore}>{hg} - {ag}</Text>
        </View>
        <Text style={styles.postMatchAccuracy}>
          {correct}/{verified.length} pronósticos ✓
        </Text>
      </View>
      <View style={styles.postMatchChecks}>
        {verified.map(p => (
          <View key={p.market} style={styles.postMatchCheck}>
            <Text style={[styles.postMatchCheckIcon, { color: p.hit ? '#22c55e' : '#ef4444' }]}>
              {p.hit ? '✅' : '❌'}
            </Text>
            <Text style={[styles.postMatchCheckLabel, { color: p.hit ? colors.text.primary : colors.text.muted }]}>
              {p.emoji} {p.label}
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

  const homeWinProb = pred?.probabilidades?.victoriaLocal ?? 50;
  const drawProb    = pred?.probabilidades?.empate ?? 25;
  const awayWinProb = pred?.probabilidades?.victoriaVisitante ?? 25;
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

// ─── Animated Section Card ────────────────────────────────────────────────────
// Each section gets a reactive animated colored border — "reactive overlay" effect.
// border pulses between dim and bright, creating a living perimeter around each section.
function Section({ icon, title, children, accent = '#22c55e', delay = 0 }: {
  icon: string; title: string; children: React.ReactNode; accent?: string; delay?: number;
}) {
  const glow = useRef(new Animated.Value(0)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entrance, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 350, delay, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2800, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 2800, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [`${accent}28`, `${accent}99`],
  });

  return (
    <Animated.View style={{ opacity: entrance, transform: [{ translateY: slide }], marginBottom: 14 }}>
      <Animated.View style={{
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor,
        backgroundColor: colors.bg.card,
        overflow: 'hidden',
      }}>
        {/* Colored header strip */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          paddingHorizontal: 14, paddingTop: 11, paddingBottom: 9,
          borderBottomWidth: 1, borderBottomColor: `${accent}1a`,
          backgroundColor: `${accent}0e`,
        }}>
          <View style={{
            width: 28, height: 28, borderRadius: 8,
            backgroundColor: `${accent}22`,
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Text style={{ fontSize: 14 }}>{icon}</Text>
          </View>
          <Text style={{
            fontSize: 11, fontWeight: '900', color: accent,
            letterSpacing: 0.9, textTransform: 'uppercase', flex: 1,
          }}>
            {title}
          </Text>
        </View>
        {/* Content */}
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, paddingTop: 10 }}>
          {children}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MatchesScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 700; // stack vertically on phones
  const { user, isAuthenticated, trackAnalysis, setShowLoginModal } = useAuth();
  const [quickBet, setQuickBet] = useState<QuickBetData | null>(null);
  const [smartBetMatch, setSmartBetMatch] = useState<SmartMatch | null>(null);
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
  const [matchLineup, setMatchLineup] = useState<MatchLineup | null>(null);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [estimatedEvents, setEstimatedEvents] = useState<MatchEvent[]>([]);
  // Store TheSportsDB context for squad fallback in lineup building
  const [sdbCtxRef, setSdbCtxRef] = useState<{ homeSquad: any[]; awaySquad: any[] } | null>(null);
  // Lineup confirmed state (true when sdbLineup has players for an upcoming match)
  const [lineupConfirmed, setLineupConfirmed] = useState(false);
  // Pre-fetched confirmed lineups for upcoming matches within 24h
  const [preMatchLineups, setPreMatchLineups] = useState<Record<string, { lineup: any; confirmed: boolean; checkedAt: number }>>({});
  // Real-time live scores map: matchId → { homeScore, awayScore, status, minute, rawStatus, scorers }
  const [liveScoresMap, setLiveScoresMap] = useState<Record<string, {
    homeScore: number;
    awayScore: number;
    status: 'live' | 'finished';
    minute?: number;
    rawStatus?: 'HT' | '1H' | '2H' | 'ET';
    homeScorers: { name: string; minute: number }[];
    awayScorers: { name: string; minute: number }[];
  }>>({});
  // Tracks when each live minute was received for dead-reckoning advancement
  const liveMinuteTimestamps = useRef<Record<string, { minute: number; receivedAt: number }>>({});
  // Tick every 30s to force live minute re-render in match cards
  const [liveTick, setLiveTick] = useState(0);
  // Weather for the currently selected match's venue
  const [matchWeather, setMatchWeather] = useState<{ temp: number; feelsLike: number; description: string; humidity: number; windSpeed: number; icon: string; city: string } | null>(null);
  // Goal flash: matchId → team that scored last
  const [goalFlash, setGoalFlash] = useState<Record<string, 'home' | 'away' | 'both' | null>>({});
  const prevScoresRef = useRef<Record<string, { home: number; away: number }>>({});;
  // Timestamps de última actualización de pronósticos por matchId
  const [predTimestamps, setPredTimestamps] = useState<Record<string, number>>(() => {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('wikibet_pred_ts') : null;
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  function savePredTimestamp(matchId: string) {
    const now = Date.now();
    setPredTimestamps(prev => {
      const next = { ...prev, [matchId]: now };
      try { if (typeof localStorage !== 'undefined') localStorage.setItem('wikibet_pred_ts', JSON.stringify(next)); } catch {}
      return next;
    });
  }

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

  // ─── Real-time live score polling ────────────────────────────────────────────
  // Polls TheSportsDB every 30s for any match that is live OR has started
  useEffect(() => {
    if (matches.length === 0) return;

    const pollLiveScores = async () => {
      const now = Date.now();
      // Candidates: explicitly live + upcoming but scheduled time passed
      const candidates = matches.filter(m => {
        if (m.status === 'live') return true;
        if (m.status === 'upcoming') {
          const matchTime = new Date(m.date).getTime();
          return matchTime <= now + 5 * 60 * 1000;
        }
        return false;
      });
      if (candidates.length === 0) return;

      await Promise.all(candidates.map(async (match) => {
        try {
          const liveData = await sportsDbService.getLiveMatchScore(match.id);
          if (!liveData || liveData.homeScore === null || liveData.awayScore === null) return;
          if (liveData.status !== 'live' && liveData.status !== 'finished') return;

          // For live/finished matches, also fetch events to get goalscorers
          let homeScorers: { name: string; minute: number }[] = [];
          let awayScorers: { name: string; minute: number }[] = [];
          try {
            const events = await sportsDbService.getMatchEvents(
              match.id, match.homeTeam, match.awayTeam
            );
            const goals = events.filter(e => e.type === 'goal' || e.type === 'penalty');
            homeScorers = goals
              .filter(e => e.team === 'home')
              .map(e => ({ name: e.player, minute: e.minute }));
            awayScorers = goals
              .filter(e => e.team === 'away')
              .map(e => ({ name: e.player, minute: e.minute }));
          } catch {}

          // Detect new goals for flash effect
          const prev = prevScoresRef.current[match.id];
          const newHome = liveData.homeScore!;
          const newAway = liveData.awayScore!;
          if (prev) {
            const homeScored = newHome > prev.home;
            const awayScored = newAway > prev.away;
            if (homeScored || awayScored) {
              const flashTeam = homeScored && awayScored ? 'both' : homeScored ? 'home' : 'away';
              setGoalFlash(gf => ({ ...gf, [match.id]: flashTeam }));
              setTimeout(() => setGoalFlash(gf => ({ ...gf, [match.id]: null })), 5000);
            }
          }
          prevScoresRef.current[match.id] = { home: newHome, away: newAway };

          // Dead-reckoning: store when we received this minute so we can advance it smoothly
          if (liveData.minute != null) {
            liveMinuteTimestamps.current[match.id] = { minute: liveData.minute, receivedAt: Date.now() };
          }

          // Auto-verify predictions when match just finished (transition live → finished)
          if (liveData.status === 'finished') {
            const prevStatus = prevScoresRef.current[match.id];
            // Only run once on transition (prev was live, now finished)
            if (prevStatus && liveData.homeScore != null && liveData.awayScore != null) {
              updateActualResult(match.id, liveData.homeScore, liveData.awayScore).catch(() => {});
            }
          }

          setLiveScoresMap(prev => ({
            ...prev,
            [match.id]: {
              homeScore: newHome,
              awayScore: newAway,
              status: liveData.status as 'live' | 'finished',
              minute: liveData.minute,
              rawStatus: liveData.rawStatus,
              homeScorers,
              awayScorers,
            },
          }));
        } catch {}
      }));
      // Tick to force live minute re-render in match cards
      setLiveTick(t => t + 1);
    };

    pollLiveScores(); // immediate first fetch
    const interval = setInterval(pollLiveScores, 30 * 1000); // every 30s
    return () => clearInterval(interval);
  // Re-run when match list changes (new comp loaded)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.length, selectedComp.id]);

  // ─── Clock tick for live minute display (every 30s) ─────────────────────────
  useEffect(() => {
    const ticker = setInterval(() => setLiveTick(t => t + 1), 30 * 1000);
    return () => clearInterval(ticker);
  }, []);

  // ─── Pre-match lineup auto-check: for ALL upcoming matches (coaches submit lineups 1h before) ────
  // Check TheSportsDB for official lineup; coaches typically submit 1h before kickoff
  useEffect(() => {
    if (matches.length === 0) return;

    const checkPreMatchLineups = async () => {
      // Check all upcoming matches (any time) — TheSportsDB returns data when lineup is submitted
      const upcoming = matches.filter(m => m.status === 'upcoming');

      for (const match of upcoming.slice(0, 6)) {
        try {
          const lineup = await sportsDbService.getMatchLineup(match.id, match.homeTeam, match.awayTeam);
          if (lineup && (lineup.homePlayers.length >= 8 || lineup.awayPlayers.length >= 8)) {
            setPreMatchLineups(prev => ({
              ...prev,
              [match.id]: {
                lineup,
                confirmed: true,
                checkedAt: Date.now(),
              },
            }));
          }
        } catch {}
      }
    };

    checkPreMatchLineups();
    const interval = setInterval(checkPreMatchLineups, 10 * 60 * 1000); // check every 10 min
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches.length, selectedComp.id]);

  // ─── Auto-update weather every 10 min while modal is open ──────────────────────
  useEffect(() => {
    if (!selectedMatch?.venue) return;
    const weatherInterval = setInterval(() => {
      getVenueWeather(selectedMatch.venue!).then(w => { if (w) setMatchWeather(w); }).catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(weatherInterval);
  }, [selectedMatch?.id]);

  // ─── Sync selectedMatch score with live data ──────────────────────────────────
  // When live scores update, push them into selectedMatch so modal stays current
  useEffect(() => {
    if (!selectedMatch) return;
    const ld = liveScoresMap[selectedMatch.id];
    if (!ld) return;
    const changed = ld.homeScore !== selectedMatch.homeScore ||
                    ld.awayScore !== selectedMatch.awayScore ||
                    ld.status !== selectedMatch.status;
    if (changed) {
      setSelectedMatch(prev => prev ? {
        ...prev,
        homeScore: ld.homeScore,
        awayScore: ld.awayScore,
        status: ld.status,
      } : null);
    }
  }, [liveScoresMap]);

  // ─── Auto-refresh analysis modal (lineup + events) when match is live ─────────
  useEffect(() => {
    if (!selectedMatch) return;
    const now = Date.now();
    const matchTime = new Date(selectedMatch.date).getTime();
    const isLiveOrStarting =
      selectedMatch.status === 'live' ||
      liveScoresMap[selectedMatch.id]?.status === 'live' ||
      (selectedMatch.status === 'upcoming' && matchTime <= now + 5 * 60 * 1000);
    if (!isLiveOrStarting) return;

    const refreshLiveModal = async () => {
      // Refresh lineup from TheSportsDB (might now be available)
      const lineup = await sportsDbService.getMatchLineup(
        selectedMatch.id, selectedMatch.homeTeam, selectedMatch.awayTeam
      ).catch(() => null);
      if (lineup && (lineup.homePlayers.length > 0 || lineup.awayPlayers.length > 0)) {
        setMatchLineup(prev => {
          // Only update if TheSportsDB has more complete data
          const newCount = lineup.homePlayers.length + lineup.awayPlayers.length;
          const oldCount = (prev?.homePlayers.length ?? 0) + (prev?.awayPlayers.length ?? 0);
          if (newCount > oldCount) {
            return {
              homeFormation: lineup.homeFormation ?? '4-3-3',
              awayFormation: lineup.awayFormation ?? '4-3-3',
              homePlayers: lineup.homePlayers.map(p => ({ name: p.name, number: p.number, position: p.position })),
              awayPlayers: lineup.awayPlayers.map(p => ({ name: p.name, number: p.number, position: p.position })),
            };
          }
          return prev;
        });
      }

      // Refresh events (apply same penalty/owngoal detail fix as openAnalysis)
      const events = await sportsDbService.getMatchEvents(
        selectedMatch.id, selectedMatch.homeTeam, selectedMatch.awayTeam
      ).catch(() => []);
      if (events.length > 0) {
        setMatchEvents(events.map(e => ({
          minute: e.minute, type: e.type, team: e.team,
          player: e.player,
          detail: e.type === 'penalty' ? (e.detail ?? 'Penalti') : e.type === 'owngoal' ? (e.detail ?? 'En propia') : e.detail,
        })));
      }
    };

    refreshLiveModal(); // immediate
    const interval = setInterval(refreshLiveModal, 30 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch?.id, selectedMatch?.status]);

  // ─── Auto-refresh AI predictions when modal is open for live match ───────────
  // Re-runs full AI analysis every 5 minutes for live matches to update predictions
  useEffect(() => {
    if (!selectedMatch || !analysis) return;
    const isCurrentlyLive = (liveScoresMap[selectedMatch.id]?.status ?? selectedMatch.status) === 'live';
    if (!isCurrentlyLive) return;

    const refreshPredictions = async () => {
      try {
        const sdbCtx = sdbCtxRef
          ? { homeSquad: sdbCtxRef.homeSquad as any, awaySquad: sdbCtxRef.awaySquad as any, homeForm: {} as any, awayForm: {} as any }
          : undefined;
        const result = await advancedAIAnalysis.analyzeMatchComprehensive(
          selectedMatch.homeTeam, selectedMatch.awayTeam, selectedMatch.league, sdbCtx
        );
        setAnalysis(result);
        savePredTimestamp(selectedMatch.id);
      } catch {}
    };

    // Refresh predictions every 5 minutes during live match
    const predInterval = setInterval(refreshPredictions, 5 * 60 * 1000);
    return () => clearInterval(predInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatch?.id, analysis != null, liveScoresMap[selectedMatch?.id ?? '']?.status]);

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
    const pHome = pred?.probabilidades?.victoriaLocal ?? 50;
    const pDraw  = pred?.probabilidades?.empate ?? 25;
    const pAway  = pred?.probabilidades?.victoriaVisitante ?? 25;
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

  function generateEstimatedEvents(match: CompetitionMatch, anal: any): MatchEvent[] {
    // For upcoming matches we generate predicted events; for finished we need scores
    const isUpcoming = match.status === 'upcoming';
    if (!isUpcoming && (match.homeScore === null || match.awayScore === null)) return [];
    const events: MatchEvent[] = [];

    const homeGoals = isUpcoming
      ? Math.round(anal?.predicciones?.golesEsperados?.local ?? 1)
      : (match.homeScore ?? 0);
    const awayGoals = isUpcoming
      ? Math.round(anal?.predicciones?.golesEsperados?.visitante ?? 1)
      : (match.awayScore ?? 0);

    const allScorers: string[] = (anal?.predicciones?.goleadores?.anytime ?? []).map((g: any) => g.nombre as string);
    const homeScorers = (anal?.predicciones?.goleadores?.anytime ?? [])
      .filter((g: any) => g.equipo === match.homeTeam)
      .map((g: any) => g.nombre as string);
    const awayScorers = (anal?.predicciones?.goleadores?.anytime ?? [])
      .filter((g: any) => g.equipo === match.awayTeam)
      .map((g: any) => g.nombre as string);

    const defaultHome = homeScorers[0] ?? 'Gol local';
    const defaultAway = awayScorers[0] ?? 'Gol visitante';

    const homeMinutes = [23, 45, 67, 78, 88].slice(0, homeGoals);
    const awayMinutes = [34, 56, 71, 82, 90].slice(0, awayGoals);

    homeMinutes.forEach((min, i) => {
      events.push({ minute: min, type: 'goal', team: 'home', player: homeScorers[i] ?? defaultHome });
    });
    awayMinutes.forEach((min, i) => {
      events.push({ minute: min, type: 'goal', team: 'away', player: awayScorers[i] ?? defaultAway });
    });

    const homeYellow = anal?.predicciones?.tarjetas?.amarillas_local ?? 0;
    const awayYellow = anal?.predicciones?.tarjetas?.amarillas_visitante ?? 0;
    const riskPlayers: any[] = anal?.predicciones?.tarjetas?.jugadores_riesgo ?? [];

    if (homeYellow > 0 && riskPlayers[0]) {
      events.push({ minute: 38, type: 'yellow', team: 'home', player: riskPlayers[0].nombre });
    }
    if (awayYellow > 0 && riskPlayers[1]) {
      events.push({ minute: 62, type: 'yellow', team: 'away', player: riskPlayers[1].nombre });
    }
    if (homeYellow > 1 && riskPlayers[2]) {
      events.push({ minute: 74, type: 'yellow', team: 'home', player: riskPlayers[2].nombre });
    }

    // ── Fouls (estimated from predicted foul count) ──────────────────────────
    const totalFouls = anal?.predicciones?.faltas?.total_esperado ?? 22;
    const homeFouls = anal?.predicciones?.faltas?.local ?? Math.ceil(totalFouls / 2);
    const awayFouls = anal?.predicciones?.faltas?.visitante ?? Math.floor(totalFouls / 2);
    const foulMinutesHome = [12, 31, 48, 66, 83].slice(0, Math.min(homeFouls, 3));
    const foulMinutesAway = [18, 42, 55, 72, 87].slice(0, Math.min(awayFouls, 3));
    const foulPlayerHome = allScorers[0] ?? homeScorers[0] ?? 'Local';
    const foulPlayerAway = allScorers[1] ?? awayScorers[0] ?? 'Visitante';
    foulMinutesHome.forEach((min, i) => {
      if (i < 2) events.push({ minute: min, type: 'foul', team: 'home', player: i === 0 ? foulPlayerHome : (homeScorers[1] ?? foulPlayerHome) });
    });
    foulMinutesAway.forEach((min, i) => {
      if (i < 2) events.push({ minute: min, type: 'foul', team: 'away', player: i === 0 ? foulPlayerAway : (awayScorers[1] ?? foulPlayerAway) });
    });

    // ── Offsides (1-2 per team) ───────────────────────────────────────────────
    events.push({ minute: 27, type: 'offside', team: 'home', player: homeScorers[0] ?? 'Fuera de juego' });
    events.push({ minute: 58, type: 'offside', team: 'away', player: awayScorers[0] ?? 'Fuera de juego' });
    if (homeGoals >= 2) events.push({ minute: 80, type: 'offside', team: 'home', player: homeScorers[1] ?? homeScorers[0] ?? 'Fuera de juego' });

    // ── Substitutions (1-2 per team from 60' onwards) ─────────────────────────
    const homeSubOff = homeScorers[0] ?? allScorers[0] ?? 'Titular local';
    const homeSubOn  = allScorers[2] ?? homeScorers[1] ?? 'Suplente local';
    const awaySubOff = awayScorers[0] ?? allScorers[1] ?? 'Titular visitante';
    const awaySubOn  = allScorers[3] ?? awayScorers[1] ?? 'Suplente visitante';
    events.push({ minute: 64, type: 'sub', team: 'home', player: homeSubOff, detail: `${homeSubOff}→${homeSubOn}` });
    events.push({ minute: 71, type: 'sub', team: 'away', player: awaySubOff, detail: `${awaySubOff}→${awaySubOn}` });
    if (!isUpcoming) {
      // For finished matches: add a second sub wave
      events.push({ minute: 77, type: 'sub', team: 'home', player: homeScorers[1] ?? homeSubOn, detail: `${homeScorers[1] ?? homeSubOn}→${allScorers[4] ?? 'Suplente'}` });
    }

    return events.sort((a, b) => a.minute - b.minute);
  }

  const openAnalysis = async (match: CompetitionMatch) => {
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    const ok = await trackAnalysis();
    if (!ok) return;
    setSelectedMatch(match);
    setAnalysis(null);
    setAnalysisError(false);
    setPostMatchComment(null);
    setPostMatchCommentLoading(false);
    setMatchEvents([]);
    setEstimatedEvents([]);
    setSdbCtxRef(null);
    setLineupConfirmed(false);
    setMatchWeather(null);
    setAnalysisLoading(true);

    // ── IMMEDIATE: Show local analysis RIGHT AWAY (synchronous, < 1ms) ──────────
    // Guarantees the user ALWAYS sees full analysis + predictions immediately.
    // AI result (analyzeMatchComprehensive) will REPLACE this when it arrives.
    try {
      const quickLocal = advancedAIAnalysis.generateLocalAnalysis(
        match.homeTeam, match.awayTeam, match.league,
        localDataService.getPlayersByTeam(match.homeTeam),
        localDataService.getPlayersByTeam(match.awayTeam),
        localDataService.getTeamByName(match.homeTeam),
        localDataService.getTeamByName(match.awayTeam),
      );
      setAnalysis(quickLocal);
      const quickEstimated = generateEstimatedEvents(match, quickLocal);
      setEstimatedEvents(quickEstimated);
      setAnalysisLoading(false);   // Stop spinner — show analysis immediately
    } catch (quickErr) {
      console.warn('[WikiBet] Quick local analysis failed:', quickErr);
      // Don't leave spinner stuck forever — clear it even if local failed
      setAnalysisLoading(false);
    }

    // Fetch weather for this match's venue
    if (match.venue) {
      getVenueWeather(match.venue).then(w => { if (w) setMatchWeather(w); }).catch(() => {});
    }

    // ── PRE-POPULATE lineup from wcSquads immediately (synchronous — no API wait) ──
    // This ensures the pitch ALWAYS shows players the moment the modal opens.
    // The real TheSportsDB lineup will override this if/when it arrives.
    {
      const wcHome = getWcSquad(match.homeTeam);
      const wcAway = getWcSquad(match.awayTeam);
      // Placeholder: if one team has squad data and the other doesn't, use numbered players
      // so BOTH halves of the pitch always render (avoids "only one team shows" issue).
      function genPlaceholders(n: number) {
        return Array.from({length: n}, (_, i) => ({ name: `#${i+1}`, number: i+1, position: '' }));
      }
      if (wcHome.length > 0 || wcAway.length > 0) {
        setMatchLineup({
          homeFormation: '4-3-3',
          awayFormation: '4-3-3',
          homePlayers: wcHome.length > 0 ? wcHome : genPlaceholders(11),
          awayPlayers: wcAway.length > 0 ? wcAway : genPlaceholders(11),
        });
      } else {
        setMatchLineup(null);
      }

      // Check if we have a pre-fetched confirmed lineup for this match
      const preMatch = preMatchLineups[match.id];
      if (preMatch?.confirmed && preMatch.lineup) {
        setMatchLineup({
          homeFormation: preMatch.lineup.homeFormation ?? '4-3-3',
          awayFormation: preMatch.lineup.awayFormation ?? '4-3-3',
          homePlayers: preMatch.lineup.homePlayers.map((p: any) => ({ name: p.name, number: p.number, position: p.position })),
          awayPlayers: preMatch.lineup.awayPlayers.map((p: any) => ({ name: p.name, number: p.number, position: p.position })),
        });
        setLineupConfirmed(true);
      }
    }

    // ── TheSportsDB: fetch real lineup, events, squad & form in parallel ──────
    // Also fetch live score immediately so the events panel shows correct status right away
    const [sdbContext, sdbLineup, sdbEvents, liveScoreNow] = await Promise.all([
      sportsDbService.getMatchContext(match.homeTeam, match.awayTeam, match.id).catch(() => null),
      sportsDbService.getMatchLineup(match.id, match.homeTeam, match.awayTeam).catch(() => null),
      sportsDbService.getMatchEvents(match.id, match.homeTeam, match.awayTeam).catch(() => [] as import('@/services/sportsDbService').SDBMatchEvent[]),
      sportsDbService.getLiveMatchScore(match.id).catch(() => null),
    ]);

    // Immediately update liveScoresMap if the match is live or finished
    // This ensures the events panel shows correct status even before the polling interval fires
    if (liveScoreNow && liveScoreNow.homeScore !== null && liveScoreNow.awayScore !== null &&
        (liveScoreNow.status === 'live' || liveScoreNow.status === 'finished')) {
      setLiveScoresMap(prev => ({
        ...prev,
        [match.id]: {
          homeScore: liveScoreNow.homeScore!,
          awayScore: liveScoreNow.awayScore!,
          status: liveScoreNow.status as 'live' | 'finished',
          minute: liveScoreNow.minute,
          rawStatus: liveScoreNow.rawStatus,
          homeScorers: prev[match.id]?.homeScorers ?? [],
          awayScorers: prev[match.id]?.awayScorers ?? [],
        },
      }));
    }

    // Save squad context for lineup fallback
    if (sdbContext) {
      setSdbCtxRef({ homeSquad: sdbContext.homeSquad ?? [], awaySquad: sdbContext.awaySquad ?? [] });
    }

    // Apply real lineup from TheSportsDB.
    // For UPCOMING matches: if sdbLineup has ≥8 players, it's the official confirmed lineup —
    // ALWAYS use it (overrides wcSquads predicted players with actual official players).
    // For other statuses: only override if sdb has MORE players than wcSquads to avoid bad data.
    if (sdbLineup && (sdbLineup.homePlayers.length > 0 || sdbLineup.awayPlayers.length > 0)) {
      const isConfirmedUpcoming = match.status === 'upcoming' &&
        (sdbLineup.homePlayers.length >= 8 || sdbLineup.awayPlayers.length >= 8);

      setMatchLineup(prev => {
        const currentCount = (prev?.homePlayers.length ?? 0) + (prev?.awayPlayers.length ?? 0);
        const sdbTotal = sdbLineup.homePlayers.length + sdbLineup.awayPlayers.length;
        // For confirmed upcoming: always use official lineup (coaches have submitted it)
        // For others: only override if sdb has more players
        if (!isConfirmedUpcoming && sdbTotal <= currentCount) return prev;
        return {
          homeFormation: sdbLineup.homeFormation ?? '4-3-3',
          awayFormation: sdbLineup.awayFormation ?? '4-3-3',
          homePlayers: sdbLineup.homePlayers.map(p => ({ name: p.name, number: p.number, position: p.position })),
          awayPlayers: sdbLineup.awayPlayers.map(p => ({ name: p.name, number: p.number, position: p.position })),
        };
      });
      if (isConfirmedUpcoming) {
        setLineupConfirmed(true);
      }
    } else {
      // Fallback: ESPN numeric IDs (rarely works for WC static IDs)
      getMatchDetails(match.leagueId, match.id).then(({ events, lineup }) => {
        if (lineup) setMatchLineup(lineup);
        if (events.length > 0) setMatchEvents(events);
      });
    }

    // Apply real events from TheSportsDB
    // Normalize type to 'goal' for defensive safety — penalty/owngoal keep their own types
    // but add readable detail labels so icons are always unambiguous
    if (sdbEvents.length > 0) {
      setMatchEvents(sdbEvents.map(e => ({
        minute: e.minute,
        type: e.type,
        team: e.team,
        player: e.player,
        detail: e.type === 'penalty' ? (e.detail ?? 'Penalti') : e.type === 'owngoal' ? (e.detail ?? 'En propia') : e.detail,
      })));
    }

    // ── AI Analysis: upgrades the local analysis already shown above ────────────
    // analyzeMatchComprehensive calls Claude AI (up to 45s). On success, it
    // replaces the quick local analysis with richer AI predictions.
    // On any failure, the local analysis is already visible — nothing to do.
    try {
      const result = await advancedAIAnalysis.analyzeMatchComprehensive(
        match.homeTeam, match.awayTeam, match.league, sdbContext ?? undefined,
        match.venue,
      );
      setAnalysis(result);  // Replace local analysis with AI result

      // ── BUILD LINEUP from AI + squad data, update pitch if still empty ──────
      const sdbLineupCount = (sdbLineup?.homePlayers.length ?? 0) + (sdbLineup?.awayPlayers.length ?? 0);
      if (sdbLineupCount < 8) {
        setMatchLineup(prev => {
          const currentCount = (prev?.homePlayers.length ?? 0) + (prev?.awayPlayers.length ?? 0);
          const hasPlaceholders =
            (prev?.homePlayers ?? []).some(p => p.name.startsWith('#')) ||
            (prev?.awayPlayers ?? []).some(p => p.name.startsWith('#'));
          if (currentCount >= 10 && !hasPlaceholders) return prev;
          const aiLineup = buildPredictedLineup(match.homeTeam, match.awayTeam, result, sdbContext);
          const aiCount = aiLineup.homePlayers.length + aiLineup.awayPlayers.length;
          if (aiCount > currentCount || hasPlaceholders) return aiLineup;
          return prev;
        });
      }

      // Update estimated events with AI data
      const estimated = generateEstimatedEvents(match, result);
      setEstimatedEvents(estimated);

      // ── Track prediction in Supabase ────────────────────────────────────────
      try {
        const probs = result.predicciones?.probabilidades;
        if (probs) {
          const predicted = outcomeFromProbs(
            probs.victoriaLocal, probs.empate, probs.victoriaVisitante
          );
          const preds = buildConfidentPredictions(result.predicciones);
          savePrediction(match.id, match.league, match.homeTeam, match.awayTeam, match.date, predicted, preds);
          savePredTimestamp(match.id);
          if (match.status === 'finished' &&
              match.homeScore !== undefined &&
              match.awayScore !== undefined) {
            updateActualResult(match.id, match.homeScore, match.awayScore);
          }
        }
      } catch { /* Supabase unavailable */ }

      // Comentario IA para partidos ya jugados
      if (match.status === 'finished') {
        generatePostMatchComment(match, result);
      }
    } catch (e) {
      // AI call failed — local analysis may already be showing.
      console.warn('[WikiBet] AI analysis failed, ensuring local fallback:', e);
    } finally {
      // GUARANTEE: if analysis is still null (both local and AI failed), regenerate local now
      setAnalysis(prev => {
        if (prev !== null) return prev;
        try {
          return advancedAIAnalysis.generateLocalAnalysis(
            match.homeTeam, match.awayTeam, match.league,
            localDataService.getPlayersByTeam(match.homeTeam),
            localDataService.getPlayersByTeam(match.awayTeam),
            localDataService.getTeamByName(match.homeTeam),
            localDataService.getTeamByName(match.awayTeam),
          );
        } catch { return null; }
      });
      setAnalysisLoading(false);  // Safety — ensure spinner never stays on
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

  function applyLiveAdjustments(
    standingsArr: StandingEntry[],
    matchesArr: CompetitionMatch[],
    liveMap: typeof liveScoresMap,
  ): (StandingEntry & { liveAdjusted?: boolean })[] {
    // Deep copy
    const adjusted: (StandingEntry & { liveAdjusted?: boolean })[] = standingsArr.map(s => ({ ...s }));

    for (const [matchId, liveData] of Object.entries(liveMap)) {
      if (liveData.status !== 'live' && liveData.status !== 'finished') continue;
      const match = matchesArr.find(m => m.id === matchId);
      if (!match) continue;
      const hs = liveData.homeScore ?? 0;
      const as_ = liveData.awayScore ?? 0;

      let homeProvisional = 0;
      let awayProvisional = 0;
      if (hs > as_) { homeProvisional = 3; awayProvisional = 0; }
      else if (hs === as_) { homeProvisional = 1; awayProvisional = 1; }
      else { homeProvisional = 0; awayProvisional = 3; }

      const homeNorm = match.homeTeam.toLowerCase();
      const awayNorm = match.awayTeam.toLowerCase();

      for (const entry of adjusted) {
        const entryNorm = entry.team.toLowerCase();
        if (homeNorm.includes(entryNorm) || entryNorm.includes(homeNorm)) {
          entry.points += homeProvisional;
          entry.liveAdjusted = true;
        } else if (awayNorm.includes(entryNorm) || entryNorm.includes(awayNorm)) {
          entry.points += awayProvisional;
          entry.liveAdjusted = true;
        }
      }
    }

    return adjusted;
  }

  const StandingsRow = ({ row, i }: { row: StandingEntry & { liveAdjusted?: boolean }; i: number }) => (
    <View style={[styles.standingsRow, i % 2 === 0 && styles.standingsRowAlt]}>
      <Text style={[styles.tdPos, i < 2 && { color: colors.accent.green }]}>{i + 1}</Text>
      <View style={styles.tdTeamWrap}>
        {getFlag(row.team) ? <Text style={styles.tdFlag}>{getFlag(row.team)}</Text> : null}
        <Text style={styles.tdTeam} numberOfLines={1}>{row.team}</Text>
        {row.liveAdjusted && (
          <View style={styles.liveAdjBadge}>
            <Text style={styles.liveAdjText}>🔴</Text>
          </View>
        )}
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
                const rawGroup = byGroup[letter] || [];
                const adjustedGroup = applyLiveAdjustments(rawGroup, matches, liveScoresMap);
                const groupTeams = adjustedGroup.sort((a, b) => {
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

    const adjustedStandings = applyLiveAdjustments(standings, matches, liveScoresMap);

    return (
      <View style={styles.standingsBg}>
        <Text style={styles.standingsTitle}>{selectedComp.emoji} Clasificación — {selectedComp.shortName}</Text>
        <TableHead />
        {adjustedStandings.map((row, i) => <StandingsRow key={row.team} row={row} i={i} />)}
      </View>
    );
  };

  // ─── Match card ─────────────────────────────────────────────────────────────
  const MatchCard = ({ match }: { match: CompetitionMatch }) => {
    const { time } = formatDate(match.date);
    // Override with real-time data from TheSportsDB polling
    const liveData = liveScoresMap[match.id];
    const effectiveStatus = liveData ? liveData.status : match.status;
    const effectiveHomeScore = liveData ? liveData.homeScore : match.homeScore;
    const effectiveAwayScore = liveData ? liveData.awayScore : match.awayScore;
    const isLive = effectiveStatus === 'live';
    const flash = goalFlash[match.id];
    const rawStatus = liveData?.rawStatus;
    const isHalftime = rawStatus === 'HT';
    // Smart minute with dead-reckoning: advance from last known API minute.
    // API (TheSportsDB free) updates every ~5 min — we drift forward from it.
    const displayMinute = (() => {
      const storedTs = liveMinuteTimestamps.current[match.id];
      if (storedTs) {
        const drift = Math.floor((Date.now() - storedTs.receivedAt) / 60000);
        const estimated = storedTs.minute + drift;
        if (rawStatus === 'HT') return 45;
        if (rawStatus === '1H') return Math.min(45, estimated);
        if (rawStatus === '2H') return Math.min(97, estimated);
        if (rawStatus === 'ET') return Math.min(120, estimated);
        return Math.min(97, estimated);
      }
      if (!isLive) return undefined;
      const elapsed = Math.floor((Date.now() - new Date(match.date).getTime()) / 60000);
      if (rawStatus === 'HT') return 45;
      if (rawStatus === '1H') return Math.min(45, Math.max(1, elapsed));
      if (rawStatus === '2H') return Math.min(97, 45 + Math.max(0, elapsed - 62));
      if (rawStatus === 'ET') return Math.min(120, elapsed);
      // No rawStatus: best estimate from elapsed
      if (elapsed <= 47) return Math.min(45, elapsed);
      if (elapsed <= 62) return 45;
      return Math.min(97, 45 + Math.max(0, elapsed - 62));
    })();
    const isFinished = effectiveStatus === 'finished';
    const predTs = predTimestamps[match.id];
    const predTimeStr = predTs ? new Date(predTs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null;
    const homeFlag = getFlag(match.homeTeam);
    const awayFlag = getFlag(match.awayTeam);
    const livePulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isLive) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(livePulse, { toValue: 1, duration: 900, useNativeDriver: false }),
            Animated.timing(livePulse, { toValue: 0, duration: 900, useNativeDriver: false }),
          ])
        ).start();
      } else {
        livePulse.stopAnimation();
      }
      return () => { livePulse.stopAnimation(); };
    }, [isLive]);

    const liveBorderColor = livePulse.interpolate({
      inputRange: [0, 1],
      outputRange: ['#ef4444', '#ff6b6b'],
    });

    // Goal flash animation
    const goalFlashAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      if (flash) {
        goalFlashAnim.setValue(0);
        Animated.sequence([
          Animated.timing(goalFlashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
          Animated.timing(goalFlashAnim, { toValue: 0.4, duration: 300, useNativeDriver: false }),
          Animated.timing(goalFlashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
          Animated.timing(goalFlashAnim, { toValue: 0.4, duration: 300, useNativeDriver: false }),
          Animated.timing(goalFlashAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
          Animated.timing(goalFlashAnim, { toValue: 0, duration: 3800, useNativeDriver: false }),
        ]).start();
      }
    }, [flash]);
    const goalFlashBg = goalFlashAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['transparent', '#22c55e30'],
    });

    const homeScorers = liveData?.homeScorers ?? [];
    const awayScorers = liveData?.awayScorers ?? [];

    const cardContent = (
      <>
        {flash && (
          <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, backgroundColor: goalFlashBg, zIndex: 0 }} />
        )}
        {flash && (
          <View style={{ position: 'absolute', top: 6, right: 8, zIndex: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: '#22c55e' }}>⚽ GOL!</Text>
          </View>
        )}
        {isLive && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>
              {isHalftime ? '⏸️ DESCANSO' : '● EN VIVO'}
            </Text>
          </View>
        )}
        {!isFinished && !isLive && predTimeStr && (
          <View style={styles.predUpdateBadge}>
            <Text style={styles.predUpdateText}>🤖 Última actualización pronóstico: {predTimeStr} h</Text>
          </View>
        )}
        <View style={styles.matchRow}>
          {/* HOME team + scorers */}
          <View style={styles.teamSide}>
            {homeFlag ? <Text style={styles.matchFlag}>{homeFlag}</Text> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.teamName} numberOfLines={1}>{match.homeTeam}</Text>
              {(isLive || isFinished) && homeScorers.map((s, i) => (
                <Text key={i} style={styles.scorerLine} numberOfLines={1}>
                  ⚽ {s.name.split(' ').pop()} {s.minute}'
                </Text>
              ))}
            </View>
          </View>

          {/* Score — minute shown above in small text */}
          <View style={styles.scoreBox}>
            {isLive && isHalftime && (
              <Text style={{ color: '#22c55e', fontSize: 9, fontWeight: '700', textAlign: 'center', marginBottom: 2, letterSpacing: 0.5 }}>
                ⏸ HT
              </Text>
            )}
            {isLive && !isHalftime && (
              <Text style={{ color: '#9ca3af', fontSize: 10, fontWeight: '600', textAlign: 'center', marginBottom: 1 }}>
                {displayMinute ? `${displayMinute}'` : '●'}
              </Text>
            )}
            {isFinished || isLive ? (
              <Text style={[styles.score, isLive && { color: colors.accent.red }]}>
                {effectiveHomeScore ?? 0}–{effectiveAwayScore ?? 0}
              </Text>
            ) : (
              <Text style={styles.kickoff}>{time}</Text>
            )}
            {isFinished && <Text style={{ color: '#4b5563', fontSize: 9, textAlign: 'center' }}>FIN</Text>}
          </View>

          {/* AWAY team + scorers */}
          <View style={[styles.teamSide, { justifyContent: 'flex-end' }]}>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
                {match.awayTeam}
              </Text>
              {(isLive || isFinished) && awayScorers.map((s, i) => (
                <Text key={i} style={[styles.scorerLine, { textAlign: 'right' }]} numberOfLines={1}>
                  {s.minute}' {s.name.split(' ').pop()} ⚽
                </Text>
              ))}
            </View>
            {awayFlag ? <Text style={styles.matchFlag}>{awayFlag}</Text> : null}
          </View>
        </View>
        <View style={styles.cardFooter}>
          {match.venue ? <Text style={styles.venueText} numberOfLines={1}>📍 {
            // Show city (after last comma) rather than full stadium name
            match.venue.includes(',')
              ? match.venue.split(',').slice(-1)[0].trim()
              : match.venue.split(' ').slice(0, 3).join(' ')
          }</Text> : <View />}
          <Text style={styles.analysisHint}>
            {isLive ? '🔴 Análisis IA Live' : isFinished ? '📊 Ver resultados análisis' : '🤖 Análisis IA'} →
          </Text>
        </View>
      </>
    );

    if (isLive) {
      return (
        <Animated.View style={[styles.card, styles.cardLive, { borderColor: liveBorderColor, borderWidth: 1.5 }]}>
          <TouchableOpacity onPress={() => openAnalysis(match)} activeOpacity={0.75}>
            {cardContent}
          </TouchableOpacity>
        </Animated.View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openAnalysis(match)}
        activeOpacity={0.75}
      >
        {cardContent}
      </TouchableOpacity>
    );
  };

  // ─── Build predicted lineup ───────────────────────────────────────────────────
  // Strategy: TheSportsDB squad is PRIMARY (reliable), AI names are secondary
  function buildPredictedLineup(
    homeTeam: string,
    awayTeam: string,
    anal: any,
    sdbCtx?: { homeSquad: any[]; awaySquad: any[] } | null
  ): MatchLineup {
    const homeForm = anal?.alineaciones?.local?.formacion ?? anal?.equipoLocal?.formacion ?? '4-3-3';
    const awayForm = anal?.alineaciones?.visitante?.formacion ?? anal?.equipoVisitante?.formacion ?? '4-3-3';

    // Position priority for sorting squad (GK first, then DEF, MID, FWD)
    function positionPriority(pos: string): number {
      const p = (pos ?? '').toLowerCase();
      if (p.includes('goalkeeper') || p.includes('portero') || p === 'gk') return 0;
      if (p.includes('back') || p.includes('defender') || p.includes('defensa') || p.includes('centre-back')) return 1;
      if (p.includes('defensive mid') || p.includes('central mid') || p.includes('midfielder') || p.includes('medio')) return 2;
      if (p.includes('attacking mid') || p.includes('mediapunta')) return 3;
      if (p.includes('wing') || p.includes('forward') || p.includes('striker') || p.includes('delantero') || p.includes('extremo')) return 4;
      return 2; // default to midfielder
    }

    // Build 11-player lineup from squad, sorted by position
    function buildFromSquad(squad: any[]): { name: string; number: number; position: string }[] {
      if (!squad?.length) return [];
      const valid = squad.filter(p => (p.name ?? p.strPlayer ?? '').length > 1);
      const sorted = [...valid].sort((a, b) => positionPriority(a.position) - positionPriority(b.position));
      return sorted.slice(0, 11).map((p, i) => ({
        name: (p.name ?? p.strPlayer ?? '').trim(),
        number: p.number ?? (i + 1),
        position: p.position ?? '',
      }));
    }

    // Extract players from AI response, filtering out generic placeholder labels
    const GENERIC_RE = /^(portero|delantero|defensa|medio|centrocampista|extremo|lateral|mediapunta|mediocentro|goalkeeper|defender|midfielder|forward|winger|striker|back|nombre|name|jugador|player|nombrereal|nr)[0-9]*$/i;
    function extractFromAI(titulares: any[]): { name: string; number: number; position: string }[] {
      if (!titulares?.length) return [];
      return titulares
        .map((p: any) => ({
          name: (typeof p === 'string' ? p : (p.nombre ?? p.name ?? '')).trim(),
          number: typeof p === 'object' ? (p.dorsal ?? p.number ?? 0) : 0,
          position: typeof p === 'object' ? (p.posicion ?? p.position ?? '') : '',
        }))
        .filter(p => p.name.length > 2 && !GENERIC_RE.test(p.name));
    }

    // ── Data sources: WC squads (trusted), SDB squad, AI analysis ──
    const wcHome = buildFromSquad(getWcSquad(homeTeam));
    const wcAway = buildFromSquad(getWcSquad(awayTeam));
    const aiHome = extractFromAI(anal?.alineaciones?.local?.titulares ?? []);
    const aiAway = extractFromAI(anal?.alineaciones?.visitante?.titulares ?? []);
    const sdbHome = buildFromSquad(sdbCtx?.homeSquad ?? []);
    const sdbAway = buildFromSquad(sdbCtx?.awaySquad ?? []);

    // ── HOME: wcSquads (trusted) → AI (11 real names) → SDB → placeholder ──
    let homePlayers =
      wcHome.length >= 5 ? wcHome :
      aiHome.length >= 7 ? aiHome :  // AI gave us nearly-complete lineup → trust it
      sdbHome.length >= 5 ? sdbHome :
      aiHome.length >= 3 ? aiHome :  // AI gave partial but better than nothing
      wcHome.length > 0  ? wcHome  :
      [];

    // ── AWAY: same priority ──
    let awayPlayers =
      wcAway.length >= 5 ? wcAway :
      aiAway.length >= 7 ? aiAway :
      sdbAway.length >= 5 ? sdbAway :
      aiAway.length >= 3 ? aiAway :
      wcAway.length > 0  ? wcAway  :
      [];

    // ── FINAL FALLBACK: numbered placeholders — ensures BOTH halves always render ──
    if (homePlayers.length < 3) {
      homePlayers = Array.from({length: 11}, (_, i) => ({ name: `#${i+1}`, number: i+1, position: '' }));
    }
    if (awayPlayers.length < 3) {
      awayPlayers = Array.from({length: 11}, (_, i) => ({ name: `#${i+1}`, number: i+1, position: '' }));
    }

    return { homeFormation: homeForm, awayFormation: awayForm, homePlayers, awayPlayers };
  }

  // ─── Analysis modal content ──────────────────────────────────────────────────
  const AnalysisContent = () => {
    if (!analysis || !selectedMatch) return null;
    const pred = analysis.predicciones ?? {} as typeof analysis.predicciones;
    // Apply live score overrides from polling
    const liveDataForModal = liveScoresMap[selectedMatch.id];
    const isLive = (liveDataForModal?.status ?? selectedMatch.status) === 'live';
    const isFinished = (liveDataForModal?.status ?? selectedMatch.status) === 'finished';
    const liveHomeScore = liveDataForModal?.homeScore ?? selectedMatch.homeScore;
    const liveAwayScore = liveDataForModal?.awayScore ?? selectedMatch.awayScore;

    const ProbBar = ({ val, color, delay = 0 }: { val: number; color: string; delay?: number }) => (
      <AnimatedProbBar val={val} color={color} delay={delay} />
    );

    const LineRow = ({ label, local, visitante, total, highlight }: {
      label: string; local: number; visitante: number; total: number; highlight?: boolean;
    }) => (
      <View style={[styles.lineRow, highlight && styles.lineRowHighlight]}>
        <Text style={styles.lineLabelText}>{label}</Text>
        <Text style={[styles.lineVal, { color: local >= 60 ? '#22c55e' : '#4A5A6E' }]}>{local}%</Text>
        <Text style={[styles.lineVal, { color: visitante >= 60 ? '#22c55e' : '#4A5A6E' }]}>{visitante}%</Text>
        <Text style={[styles.lineValTotal, { color: total >= 60 ? '#22c55e' : colors.text.primary }]}>{total}%</Text>
      </View>
    );

    // ─── Bet365-style table component ───
    // ─── Bet365Table — professional sportsbook-style table ───────────────────
    // First column is always flex:1 (label), data columns have fixed widths
    // based on how many data columns there are (2→58px, 3→52px, ≥4→46px)
    const Bet365Table = ({ headers, rows }: {
      headers: string[];
      rows: (string | number)[][];
    }) => {
      const numDataCols = headers.length - 1;
      const dataW = numDataCols <= 2 ? 58 : numDataCols === 3 ? 52 : 46;
      return (
        <View style={styles.bet365Table}>
          {/* Header */}
          <View style={styles.bet365Header}>
            {headers.map((h, i) => (
              <Text
                key={i}
                style={[
                  styles.bet365HeaderCell,
                  i === 0
                    ? { flex: 1, textAlign: 'left' }
                    : { width: dataW, textAlign: 'center',
                        color: i === headers.length - 1 ? colors.accent.gold : '#6A7A8E' },
                ]}
                numberOfLines={1}
              >
                {h}
              </Text>
            ))}
          </View>
          {/* Rows */}
          {rows.map((row, ri) => (
            <View key={ri} style={[styles.bet365Row, ri % 2 === 1 && styles.bet365RowAlt]}>
              {row.map((cell, ci) => {
                const isLabel = ci === 0;
                const isOdds  = ci === row.length - 1 && row.length > 2;
                return (
                  <Text
                    key={ci}
                    style={[
                      isLabel ? styles.bet365CellLabel
                      : isOdds ? styles.bet365CellOdds
                      : styles.bet365CellValue,
                      isLabel ? { flex: 1 } : { width: dataW },
                    ]}
                    numberOfLines={isLabel ? 2 : 1}
                    adjustsFontSizeToFit={!isLabel}
                  >
                    {cell}
                  </Text>
                );
              })}
            </View>
          ))}
        </View>
      );
    };

    try { return (
      <View style={styles.modalScroll}>

        {/* Lineup caption */}
        <Text style={{ color: '#6b7280', fontSize: 10, textAlign: 'center', marginBottom: 10 }}>
          {matchLineup && (matchLineup.homePlayers.length > 0)
            ? (liveScoresMap[selectedMatch!.id]?.status === 'live' || selectedMatch!.status === 'live'
                ? '🔄 Alineación · Se actualiza automáticamente'
                : selectedMatch!.status === 'upcoming'
                  ? '🤖 Alineación probable · Predicción IA + histórico'
                  : '📋 Alineación del partido')
            : '⏳ Cargando alineación...'
          }
        </Text>

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
            <PostMatchBanner
              match={{ ...selectedMatch, homeScore: liveHomeScore, awayScore: liveAwayScore }}
              analysis={analysis}
            />
          </View>
        )}

        {/* EN DIRECTO — auto-updates with live score from polling */}
        {isLive && (
          <LiveBanner
            match={{ ...selectedMatch, homeScore: liveHomeScore, awayScore: liveAwayScore, status: 'live' }}
            analysis={analysis}
          />
        )}

        {/* RESUMEN */}
        <Section icon="📋" title="RESUMEN EJECUTIVO" accent="#f59e0b" delay={0}>
          <Text style={styles.bodyText}>{analysis.resumenEjecutivo}</Text>
          <Text style={[styles.bodyText, { marginTop: 6, color: colors.text.muted, fontStyle: 'italic' }]}>
            {analysis.importanciaDelPartido}
          </Text>
        </Section>

        {/* EQUIPOS */}
        <Section icon="🎽" title="ANÁLISIS DE EQUIPOS" accent="#3b82f6" delay={80}>
          <View style={styles.row2}>
            {[
              { name: selectedMatch.homeTeam, data: analysis.equipoLocal, flag: getFlag(selectedMatch.homeTeam) },
              { name: selectedMatch.awayTeam, data: analysis.equipoVisitante, flag: getFlag(selectedMatch.awayTeam) },
            ].map(({ name, data, flag }) => (
              <View key={name} style={styles.teamBox}>
                <Text style={styles.teamBoxName} numberOfLines={1}>{flag} {name}</Text>
                <Text style={styles.teamBoxForm}>{data?.formacion ?? ''}</Text>
                <Text style={styles.teamBoxStat}>xG: {data?.xG_promedio ?? '-'} · xGA: {data?.xGA_promedio ?? '-'}</Text>
                <Text style={[styles.teamBoxStat, { color: colors.accent.blue, marginTop: 3 }]}>{data?.forma ?? ''}</Text>
                <Text style={[styles.teamBoxStat, { marginTop: 4 }]}>
                  {(data.fortalezas ?? []).map(f => `✅ ${f}`).join('\n')}
                </Text>
                {(data.lesionados?.length ?? 0) > 0 && (
                  <Text style={[styles.teamBoxStat, { color: colors.accent.red, marginTop: 3 }]}>
                    🩹 {data.lesionados.join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </Section>

        {/* TÁCTICA — entre equipos y probabilidades */}
        <Section icon="♟️" title="ANÁLISIS TÁCTICO" accent="#8b5cf6" delay={120}>
          <View style={styles.row2}>
            <View style={styles.teamBox}>
              <Text style={styles.teamBoxName}>{getFlag(selectedMatch.homeTeam)} {selectedMatch.homeTeam}</Text>
              <Text style={[styles.teamBoxForm, { fontSize: 13 }]}>{analysis.tactico?.sistemaLocal ?? ''}</Text>
            </View>
            <View style={styles.teamBox}>
              <Text style={styles.teamBoxName}>{getFlag(selectedMatch.awayTeam)} {selectedMatch.awayTeam}</Text>
              <Text style={[styles.teamBoxForm, { fontSize: 13 }]}>{analysis.tactico?.sistemaVisitante ?? ''}</Text>
            </View>
          </View>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>{analysis.tactico?.enfoque ?? ''}</Text>
          <Text style={[styles.bodyText, { marginTop: 6, fontWeight: '600', color: colors.accent.blue }]}>
            {analysis.tactico?.ventajaTactica ?? ''}
          </Text>
          {(analysis.tactico?.clavesDelPartido ?? []).map((k, i) => (
            <Text key={i} style={[styles.bodyText, { marginTop: 4, color: colors.text.muted }]}>🔑 {k}</Text>
          ))}
        </Section>

        {/* CONCLUSIÓN — entre táctica y probabilidades */}
        <Section icon="🎯" title="CONCLUSIÓN IA" accent="#22c55e" delay={140}>
          <Text style={styles.bodyText}>{analysis.conclusion}</Text>
          <View style={styles.confBox}>
            <View style={[styles.confBar, { width: `${analysis.confianza}%` as any }]} />
            <Text style={styles.confText}>Confianza IA: {analysis.confianza}%</Text>
          </View>
        </Section>

        {/* APUESTA DE LA IA — between Conclusion and 1X2 */}
        <AiBetPanel match={selectedMatch} analysis={analysis} />

        {/* 1X2 */}
        <Section icon="🎯" title="PROBABILIDADES 1X2" accent="#22c55e" delay={160}>
          <View style={styles.row3}>
            {[
              { label: `1 ${selectedMatch.homeTeam}`, prob: pred.probabilidades?.victoriaLocal ?? 50, cuota: pred.cuotasTeoricas?.victoriaLocal ?? 2.0, color: colors.accent.green, d: 200 },
              { label: 'X Empate', prob: pred.probabilidades?.empate ?? 25, cuota: pred.cuotasTeoricas?.empate ?? 3.5, color: colors.accent.gold, d: 320 },
              { label: `2 ${selectedMatch.awayTeam}`, prob: pred.probabilidades?.victoriaVisitante ?? 25, cuota: pred.cuotasTeoricas?.victoriaVisitante ?? 3.5, color: colors.accent.red, d: 440 },
            ].map(item => (
              <View key={item.label} style={styles.probCell}>
                <Text style={styles.probLabel} numberOfLines={1}>{item.label}</Text>
                <Text style={[styles.probValue, { color: item.color }]}>{item.prob}%</Text>
                <ProbBar val={item.prob} color={item.color} delay={item.d} />
                <Text style={styles.probOdds}>{(typeof item.cuota === 'number' ? item.cuota : 0).toFixed(2)}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.bodyText, { marginTop: 8, textAlign: 'center', color: colors.text.muted, fontSize: 11 }]}>
            🏆 Resultado más probable: <Text style={{ color: colors.accent.gold, fontWeight: 'bold' }}>{pred.resultadoMasProbable ?? '-'}</Text>
          </Text>
        </Section>

        {/* DOBLE OPORTUNIDAD */}
        {pred.dobleOportunidad && (
          <Section icon="🔀" title="DOBLE OPORTUNIDAD" accent="#60a5fa" delay={200}>
            <View style={styles.row3}>
              {[
                { label: `1X (${selectedMatch.homeTeam} o Empate)`, data: pred.dobleOportunidad.localOEmpate, color: colors.accent.green },
                { label: `X2 (Empate o ${selectedMatch.awayTeam})`, data: pred.dobleOportunidad.visitanteOEmpate, color: colors.accent.gold },
                { label: `1-2 (Local o Visitante)`, data: pred.dobleOportunidad.localOVisitante, color: colors.accent.blue },
              ].map(item => (
                <View key={item.label} style={styles.probCell}>
                  <Text style={[styles.probLabel, { fontSize: 9 }]} numberOfLines={2}>{item.label}</Text>
                  <Text style={[styles.probValue, { color: item.color }]}>{item.data?.probabilidad ?? 0}%</Text>
                  <AnimatedProbBar val={item.data?.probabilidad ?? 0} color={item.color} delay={0} />
                  <Text style={styles.probOdds}>{(typeof item.data?.cuota === 'number' ? item.data.cuota : 0).toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {/* MARCAR POR MITAD — below Doble Oportunidad */}
        {pred.marcadorPorTiempo && (
          <Section icon="⏱️" title="MARCAR POR MITAD" accent="#06b6d4" delay={210}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeadCell, { flex: 1.4, textAlign: 'left', color: '#4A5A6E' }]}>Equipo</Text>
              <Text style={[styles.tableHeadCell, { color: '#06b6d4' }]}>1ª Parte</Text>
              <Text style={[styles.tableHeadCell, { color: '#1A6BFF' }]}>2ª Parte</Text>
              <Text style={[styles.tableHeadCell, { color: colors.accent.gold }]}>Cuota 1ª</Text>
            </View>
            {[
              { label: `${getFlag(selectedMatch.homeTeam)} Local`, data: pred.marcadorPorTiempo.local },
              { label: `${getFlag(selectedMatch.awayTeam)} Visit.`, data: pred.marcadorPorTiempo.visitante },
            ].map((row, i) => (
              <View key={row.label} style={[styles.lineRow, i % 2 === 0 && styles.lineRowHighlight]}>
                <Text style={[styles.lineLabelText, { flex: 1.4 }]}>{row.label}</Text>
                <Text style={[styles.lineVal, { color: '#06b6d4' }]}>{row.data?.primeraParteProb ?? 0}%</Text>
                <Text style={[styles.lineVal, { color: colors.accent.blue }]}>{row.data?.segundaParteProb ?? 0}%</Text>
                <Text style={[styles.lineValTotal, { color: colors.accent.gold }]}>{(typeof row.data?.cuotaPrimeraParte === 'number' ? row.data.cuotaPrimeraParte : 0).toFixed(2)}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* GOLES */}
        <Section icon="⚽" title="PROBABILIDAD DE GOLES" accent="#22c55e" delay={240}>
          {/* Header tabla */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeadCell, { flex: 1.4, textAlign: 'left', color: '#4A5A6E' }]}>Mercado</Text>
            <Text style={[styles.tableHeadCell, { color: '#22c55e' }]}>{getFlag(selectedMatch.homeTeam)} Local</Text>
            <Text style={[styles.tableHeadCell, { color: '#22c55e' }]}>{getFlag(selectedMatch.awayTeam)} Visit.</Text>
            <Text style={[styles.tableHeadCell, { color: colors.accent.gold }]}>Total</Text>
          </View>
          {pred.goles && [
            { label: '+0.5 goles', data: pred.goles.over0_5 },
            { label: '+1.5 goles', data: pred.goles.over1_5 },
            { label: '+2.5 goles', data: pred.goles.over2_5 },
            { label: '+3.5 goles', data: pred.goles.over3_5 },
            { label: '+4.5 goles', data: pred.goles.over4_5 },
            { label: '+5.5 goles', data: pred.goles.over5_5 },
            { label: '+6.5 goles', data: pred.goles.over6_5 },
            { label: '+7.5 goles', data: pred.goles.over7_5 },
          ].filter(row => row.data != null && (row.data?.total ?? 0) >= 2).map((row, i) => (
            <LineRow
              key={row.label}
              label={row.label}
              local={row.data?.local ?? 0}
              visitante={row.data?.visitante ?? 0}
              total={row.data?.total ?? 0}
              highlight={i % 2 === 0}
            />
          ))}
          <View style={[styles.lineRow, { backgroundColor: colors.accent.green + '18', marginTop: 2 }]}>
            <Text style={[styles.lineLabelText, { color: colors.accent.green, fontWeight: '700' }]}>xG esperados</Text>
            <Text style={[styles.lineVal, { color: colors.accent.green, fontWeight: '700' }]}>{pred.golesEsperados?.local ?? '-'}</Text>
            <Text style={[styles.lineVal, { color: colors.accent.green, fontWeight: '700' }]}>{pred.golesEsperados?.visitante ?? '-'}</Text>
            <Text style={[styles.lineValTotal, { color: colors.accent.green, fontWeight: '700' }]}>{pred.golesEsperados?.total ?? '-'}</Text>
          </View>
        </Section>

        {/* GOLES POR MITAD — expanded to +5.5 */}
        {pred.golesporMitad && (
          <Section icon="⏱️" title="GOLES POR MITAD" accent="#34d399" delay={280}>
            {/* xG split info */}
            <View style={[styles.row3, { gap: 6, marginBottom: 8 }]}>
              <View style={styles.bigStatCell}>
                <Text style={[styles.bigStatVal, { color: '#34d399', fontSize: 13 }]}>{pred.golesporMitad.local_xG_1H}</Text>
                <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.homeTeam)} xG 1H</Text>
              </View>
              <View style={styles.bigStatCell}>
                <Text style={[styles.bigStatVal, { color: '#34d399', fontSize: 13 }]}>{pred.golesporMitad.visitante_xG_1H}</Text>
                <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.awayTeam)} xG 1H</Text>
              </View>
              <View style={styles.bigStatCell}>
                <Text style={[styles.bigStatVal, { color: '#34d399', fontSize: 13 }]}>{pred.golesporMitad.local_xG_2H}</Text>
                <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.homeTeam)} xG 2H</Text>
              </View>
              <View style={styles.bigStatCell}>
                <Text style={[styles.bigStatVal, { color: '#34d399', fontSize: 13 }]}>{pred.golesporMitad.visitante_xG_2H}</Text>
                <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.awayTeam)} xG 2H</Text>
              </View>
            </View>
            {/* 1ª Parte */}
            <View style={styles.tableGroupChip}>
              <View style={[styles.tableGroupChipDot, { backgroundColor: '#34d399' }]} />
              <Text style={styles.tableGroupChipText}>1ª Parte</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeadCell, { flex: 1.6, textAlign: 'left', color: '#4A5A6E' }]}>Mercado</Text>
              <Text style={styles.tableHeadCell}>Prob.</Text>
              <Text style={[styles.tableHeadCell, { color: colors.accent.gold }]}>Cuota</Text>
            </View>
            {[
              { label: '+0.5 goles 1H', prob: pred.golesporMitad.over0_5_1H, cuota: pred.golesporMitad.cuota_over0_5_1H },
              { label: '+1.5 goles 1H', prob: pred.golesporMitad.over1_5_1H, cuota: pred.golesporMitad.cuota_over1_5_1H },
              { label: '+2.5 goles 1H', prob: pred.golesporMitad.over2_5_1H, cuota: pred.golesporMitad.cuota_over2_5_1H },
              { label: '+3.5 goles 1H', prob: pred.golesporMitad.over3_5_1H, cuota: pred.golesporMitad.cuota_over3_5_1H },
              { label: '+4.5 goles 1H', prob: pred.golesporMitad.over4_5_1H, cuota: undefined },
              { label: '+5.5 goles 1H', prob: pred.golesporMitad.over5_5_1H, cuota: undefined },
            ].filter(r => r.prob != null && (r.prob ?? 0) >= 2 && (r.prob ?? 0) <= 90).map((row, i) => (
              <View key={row.label} style={[styles.lineRow, i % 2 === 0 && styles.lineRowHighlight]}>
                <Text style={[styles.lineLabelText, { flex: 1.6 }]}>{row.label}</Text>
                <Text style={[styles.lineVal, { color: (row.prob ?? 0) >= 60 ? '#34d399' : colors.text.primary }]}>{row.prob ?? 0}%</Text>
                <Text style={[styles.lineValTotal, { color: colors.accent.gold }]}>
                  {row.cuota != null ? (row.cuota as number).toFixed(2) : Math.max(1.10, parseFloat((100/Math.max(1,row.prob??1)*0.93).toFixed(2))).toFixed(2)}
                </Text>
              </View>
            ))}
            {/* 2ª Parte */}
            <View style={styles.tableGroupChip}>
              <View style={[styles.tableGroupChipDot, { backgroundColor: '#60a5fa' }]} />
              <Text style={styles.tableGroupChipText}>2ª Parte</Text>
            </View>
            {[
              { label: '+0.5 goles 2H', prob: pred.golesporMitad.over0_5_2H, cuota: pred.golesporMitad.cuota_over0_5_2H },
              { label: '+1.5 goles 2H', prob: pred.golesporMitad.over1_5_2H, cuota: pred.golesporMitad.cuota_over1_5_2H },
              { label: '+2.5 goles 2H', prob: pred.golesporMitad.over2_5_2H, cuota: pred.golesporMitad.cuota_over2_5_2H },
              { label: '+3.5 goles 2H', prob: pred.golesporMitad.over3_5_2H, cuota: pred.golesporMitad.cuota_over3_5_2H },
              { label: '+4.5 goles 2H', prob: pred.golesporMitad.over4_5_2H, cuota: undefined },
              { label: '+5.5 goles 2H', prob: pred.golesporMitad.over5_5_2H, cuota: undefined },
            ].filter(r => r.prob != null && (r.prob ?? 0) >= 2 && (r.prob ?? 0) <= 90).map((row, i) => (
              <View key={row.label} style={[styles.lineRow, i % 2 === 0 && styles.lineRowHighlight]}>
                <Text style={[styles.lineLabelText, { flex: 1.6 }]}>{row.label}</Text>
                <Text style={[styles.lineVal, { color: (row.prob ?? 0) >= 60 ? '#34d399' : colors.text.primary }]}>{row.prob ?? 0}%</Text>
                <Text style={[styles.lineValTotal, { color: colors.accent.gold }]}>
                  {row.cuota != null ? (row.cuota as number).toFixed(2) : Math.max(1.10, parseFloat((100/Math.max(1,row.prob??1)*0.93).toFixed(2))).toFixed(2)}
                </Text>
              </View>
            ))}
          </Section>
        )}

        {/* TIROS TOTALES — expanded 15-20 thresholds with team/half breakdown */}
        {pred.tiros && (
          <Section icon="⚡" title="TIROS (TOTALES)" accent="#f97316" delay={310}>
            {/* Summary stats */}
            <View style={[styles.row3, { gap: 6, marginBottom: 8 }]}>
              <View style={styles.bigStatCell}>
                <Text style={[styles.bigStatVal, { color: '#f97316' }]}>{pred.tiros.total.total ?? 0}</Text>
                <Text style={styles.bigStatLbl}>Total esp.</Text>
              </View>
              <View style={styles.bigStatCell}>
                <Text style={styles.bigStatVal}>{pred.tiros.total.local ?? 0}</Text>
                <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.homeTeam)} Local</Text>
              </View>
              <View style={styles.bigStatCell}>
                <Text style={styles.bigStatVal}>{pred.tiros.total.visitante ?? 0}</Text>
                <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.awayTeam)} Visit.</Text>
              </View>
            </View>
            {/* Over/under thresholds: total, local, visitante — 8.5 to 25.5 */}
            {(() => {
              function pOver(lambda: number, n: number): number {
                let cum = 0;
                for (let k = 0; k <= Math.floor(n); k++) {
                  let f = 1; for (let i = 1; i <= k; i++) f *= i;
                  cum += Math.exp(-lambda) * Math.pow(lambda, k) / f;
                }
                return Math.max(1, Math.min(99, Math.round((1 - cum) * 100)));
              }
              const tTotal = pred.tiros.total.total ?? 0;
              const tLocal = pred.tiros.total.local ?? 0;
              const tVisit = pred.tiros.total.visitante ?? 0;
              const tLocal1H = Math.round(tLocal * 0.46);
              const tVisit1H = Math.round(tVisit * 0.44);
              const tLocal2H = tLocal - tLocal1H;
              const tVisit2H = tVisit - tVisit1H;
              const tTotal1H = tLocal1H + tVisit1H;
              const tTotal2H = tLocal2H + tVisit2H;
              // Generate thresholds: 8.5 to 25.5 step 1, filter for realistic range
              const thresholds = Array.from({length: 18}, (_, i) => 8.5 + i);
              const rowsTotal = thresholds.map(th => ({
                label: `+${th}`,
                total: pOver(tTotal, th),
                local: pOver(tLocal, th),
                visit: pOver(tVisit, th),
              })).filter(r => r.total >= 3 && r.total <= 94);
              const rows1H = [4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5].map(th => ({
                label: `+${th} 1H`,
                total: pOver(tTotal1H, th),
                local: pOver(tLocal1H, th),
                visit: pOver(tVisit1H, th),
              })).filter(r => r.total >= 3 && r.total <= 94);
              const rows2H = [4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5].map(th => ({
                label: `+${th} 2H`,
                total: pOver(tTotal2H, th),
                local: pOver(tLocal2H, th),
                visit: pOver(tVisit2H, th),
              })).filter(r => r.total >= 3 && r.total <= 94);
              const formatOdds = (prob: number) => Math.max(1.10, parseFloat((100 / Math.max(1, prob) * 0.93).toFixed(2))).toFixed(2);
              return (
                <>
                  <View style={styles.tableGroupChip}>
                    <View style={[styles.tableGroupChipDot, { backgroundColor: '#f97316' }]} />
                    <Text style={styles.tableGroupChipText}>Todo el partido</Text>
                  </View>
                  <Bet365Table
                    headers={['Umbral', `${getFlag(selectedMatch.homeTeam)} Loc`, `${getFlag(selectedMatch.awayTeam)} Vis`, 'Total', 'Cuota']}
                    rows={rowsTotal.map(r => [r.label, `${r.local}%`, `${r.visit}%`, `${r.total}%`, formatOdds(r.total)])}
                  />
                  {rows1H.length > 0 && (
                    <>
                      <View style={[styles.tableGroupChip, { marginTop: 10 }]}>
                        <View style={[styles.tableGroupChipDot, { backgroundColor: '#60a5fa' }]} />
                        <Text style={styles.tableGroupChipText}>1ª Parte</Text>
                      </View>
                      <Bet365Table
                        headers={['Mercado', `${getFlag(selectedMatch.homeTeam)} Loc`, `${getFlag(selectedMatch.awayTeam)} Vis`, 'Total', 'Cuota']}
                        rows={rows1H.map(r => [r.label, `${r.local}%`, `${r.visit}%`, `${r.total}%`, formatOdds(r.total)])}
                      />
                    </>
                  )}
                  {rows2H.length > 0 && (
                    <>
                      <View style={[styles.tableGroupChip, { marginTop: 10 }]}>
                        <View style={[styles.tableGroupChipDot, { backgroundColor: '#818cf8' }]} />
                        <Text style={styles.tableGroupChipText}>2ª Parte</Text>
                      </View>
                      <Bet365Table
                        headers={['Mercado', `${getFlag(selectedMatch.homeTeam)} Loc`, `${getFlag(selectedMatch.awayTeam)} Vis`, 'Total', 'Cuota']}
                        rows={rows2H.map(r => [r.label, `${r.local}%`, `${r.visit}%`, `${r.total}%`, formatOdds(r.total)])}
                      />
                    </>
                  )}
                </>
              );
            })()}
            {/* Players breakdown */}
            {pred.tiros.jugadores?.length > 0 && (
              <>
                <View style={[styles.tableGroupChip, { marginTop: 10 }]}>
                  <View style={[styles.tableGroupChipDot, { backgroundColor: '#f97316' }]} />
                  <Text style={styles.tableGroupChipText}>Tiros por jugador</Text>
                </View>
                <Bet365Table
                  headers={['Jugador', 'Tiros', 'Puerta', '% IA', 'Cuota']}
                  rows={pred.tiros.jugadores.map(j => [
                    `${j.equipo === 'local' ? getFlag(selectedMatch.homeTeam) || '🏠' : getFlag(selectedMatch.awayTeam) || '✈️'} ${j.nombre}`,
                    String(j.tiros ?? '-'),
                    String(j.a_puerta ?? '-'),
                    j.probabilidad ? `${j.probabilidad}%` : '-',
                    j.cuota ? j.cuota.toFixed(2) : '-'
                  ])}
                />
              </>
            )}
          </Section>
        )}

        {/* TIROS A PUERTA — expanded with team/half breakdown */}
        {pred.tiros && (
          <Section icon="🎯" title="TIROS A PUERTA" accent="#fb923c" delay={320}>
            {/* Summary */}
            <View style={[styles.row3, { gap: 6, marginBottom: 8 }]}>
              <View style={styles.bigStatCell}>
                <Text style={[styles.bigStatVal, { color: '#fb923c' }]}>{pred.tiros.a_puerta?.total ?? 0}</Text>
                <Text style={styles.bigStatLbl}>Total esp.</Text>
              </View>
              <View style={styles.bigStatCell}>
                <Text style={styles.bigStatVal}>{pred.tiros.a_puerta?.local ?? 0}</Text>
                <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.homeTeam)} Local</Text>
              </View>
              <View style={styles.bigStatCell}>
                <Text style={styles.bigStatVal}>{pred.tiros.a_puerta?.visitante ?? 0}</Text>
                <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.awayTeam)} Visit.</Text>
              </View>
            </View>
            {(() => {
              function pOver(lambda: number, n: number): number {
                let cum = 0;
                for (let k = 0; k <= Math.floor(n); k++) {
                  let f = 1; for (let i = 1; i <= k; i++) f *= i;
                  cum += Math.exp(-lambda) * Math.pow(lambda, k) / f;
                }
                return Math.max(1, Math.min(99, Math.round((1 - cum) * 100)));
              }
              const tTotal = pred.tiros.a_puerta?.total ?? 0;
              const tLocal = pred.tiros.a_puerta?.local ?? 0;
              const tVisit = pred.tiros.a_puerta?.visitante ?? 0;
              const tLocal1H = Math.round(tLocal * 0.46);
              const tVisit1H = Math.round(tVisit * 0.44);
              const tLocal2H = tLocal - tLocal1H;
              const tVisit2H = tVisit - tVisit1H;
              const tTotal1H = tLocal1H + tVisit1H;
              const tTotal2H = tLocal2H + tVisit2H;
              const thresholds = [2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5];
              const rowsTotal = thresholds.map(th => ({
                label: `+${th}`,
                total: pOver(tTotal, th),
                local: pOver(tLocal, th),
                visit: pOver(tVisit, th),
              })).filter(r => r.total >= 3 && r.total <= 94);
              const rows1H = [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5].map(th => ({
                label: `+${th} 1H`,
                total: pOver(tTotal1H, th),
                local: pOver(tLocal1H, th),
                visit: pOver(tVisit1H, th),
              })).filter(r => r.total >= 3 && r.total <= 94);
              const rows2H = [1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5].map(th => ({
                label: `+${th} 2H`,
                total: pOver(tTotal2H, th),
                local: pOver(tLocal2H, th),
                visit: pOver(tVisit2H, th),
              })).filter(r => r.total >= 3 && r.total <= 94);
              const formatOdds = (prob: number) => Math.max(1.10, parseFloat((100 / Math.max(1, prob) * 0.93).toFixed(2))).toFixed(2);
              return (
                <>
                  <View style={styles.tableGroupChip}>
                    <View style={[styles.tableGroupChipDot, { backgroundColor: '#fb923c' }]} />
                    <Text style={styles.tableGroupChipText}>Todo el partido</Text>
                  </View>
                  <Bet365Table
                    headers={['Umbral', `${getFlag(selectedMatch.homeTeam)} Loc`, `${getFlag(selectedMatch.awayTeam)} Vis`, 'Total', 'Cuota']}
                    rows={rowsTotal.map(r => [r.label, `${r.local}%`, `${r.visit}%`, `${r.total}%`, formatOdds(r.total)])}
                  />
                  {rows1H.length > 0 && (
                    <>
                      <View style={[styles.tableGroupChip, { marginTop: 10 }]}>
                        <View style={[styles.tableGroupChipDot, { backgroundColor: '#60a5fa' }]} />
                        <Text style={styles.tableGroupChipText}>1ª Parte</Text>
                      </View>
                      <Bet365Table
                        headers={['Mercado', `${getFlag(selectedMatch.homeTeam)} Loc`, `${getFlag(selectedMatch.awayTeam)} Vis`, 'Total', 'Cuota']}
                        rows={rows1H.map(r => [r.label, `${r.local}%`, `${r.visit}%`, `${r.total}%`, formatOdds(r.total)])}
                      />
                    </>
                  )}
                  {rows2H.length > 0 && (
                    <>
                      <View style={[styles.tableGroupChip, { marginTop: 10 }]}>
                        <View style={[styles.tableGroupChipDot, { backgroundColor: '#818cf8' }]} />
                        <Text style={styles.tableGroupChipText}>2ª Parte</Text>
                      </View>
                      <Bet365Table
                        headers={['Mercado', `${getFlag(selectedMatch.homeTeam)} Loc`, `${getFlag(selectedMatch.awayTeam)} Vis`, 'Total', 'Cuota']}
                        rows={rows2H.map(r => [r.label, `${r.local}%`, `${r.visit}%`, `${r.total}%`, formatOdds(r.total)])}
                      />
                    </>
                  )}
                </>
              );
            })()}
          </Section>
        )}

        {/* CÓRNERS */}
        <Section icon="🚩" title="CÓRNERS" accent="#f59e0b" delay={400}>
          {pred.corners && (
            <>
              {/* Resumen */}
              <View style={[styles.row3, { gap: 6, marginBottom: 8 }]}>
                <View style={styles.bigStatCell}>
                  <Text style={[styles.bigStatVal, { color: colors.accent.gold }]}>{pred.corners.total_esperado}</Text>
                  <Text style={styles.bigStatLbl}>Total esp.</Text>
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

              {/* Todo el partido */}
              <View style={styles.tableGroupChip}>
                <View style={[styles.tableGroupChipDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.tableGroupChipText}>Todo el partido</Text>
              </View>
              <Bet365Table
                headers={['Mercado', 'Prob.', 'Cuota']}
                rows={[
                  { label: 'Córners +6.5',  prob: pred.corners.over6_5,  cuota: pred.corners.cuota_over8_5 },
                  { label: 'Córners +7.5',  prob: pred.corners.over7_5,  cuota: null },
                  { label: 'Córners +8.5',  prob: pred.corners.over8_5,  cuota: pred.corners.cuota_over8_5 },
                  { label: 'Córners +9.5',  prob: pred.corners.over9_5,  cuota: pred.corners.cuota_over9_5 },
                  { label: 'Córners +10.5', prob: pred.corners.over10_5, cuota: pred.corners.cuota_over10_5 },
                  { label: 'Córners +11.5', prob: pred.corners.over11_5, cuota: null },
                ].filter(r => r.prob != null && (r.prob ?? 0) > 0).map(r => [
                  r.label,
                  `${r.prob ?? '-'}%`,
                  r.cuota ? r.cuota.toFixed(2) : '-'
                ])}
              />

              {/* 1ª Parte */}
              {(pred.corners.local_1H != null) && (
                <>
                  <View style={[styles.tableGroupChip, { marginTop: 10 }]}>
                    <View style={[styles.tableGroupChipDot, { backgroundColor: '#60a5fa' }]} />
                    <Text style={styles.tableGroupChipText}>1ª Parte</Text>
                  </View>
                  <View style={[styles.row3, { gap: 6, marginBottom: 6 }]}>
                    <View style={styles.bigStatCell}>
                      <Text style={styles.bigStatVal}>{(pred.corners.local_1H ?? 0) + (pred.corners.visitante_1H ?? 0)}</Text>
                      <Text style={styles.bigStatLbl}>Total</Text>
                    </View>
                    <View style={styles.bigStatCell}>
                      <Text style={styles.bigStatVal}>{pred.corners.local_1H ?? 0}</Text>
                      <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.homeTeam)} Loc</Text>
                    </View>
                    <View style={styles.bigStatCell}>
                      <Text style={styles.bigStatVal}>{pred.corners.visitante_1H ?? 0}</Text>
                      <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.awayTeam)} Vis</Text>
                    </View>
                  </View>
                  <Bet365Table
                    headers={['Mercado', 'Prob.', 'Cuota']}
                    rows={[
                      { label: 'Córners +3.5 1H', prob: pred.corners.over3_5_1H },
                      { label: 'Córners +4.5 1H', prob: pred.corners.over4_5_1H },
                      { label: 'Córners +5.5 1H', prob: pred.corners.over5_5_1H },
                    ].filter(r => r.prob != null).map(r => [r.label, `${r.prob ?? '-'}%`, '-'])}
                  />
                </>
              )}

              {/* 2ª Parte */}
              {(pred.corners.local_2H != null) && (
                <>
                  <View style={[styles.tableGroupChip, { marginTop: 10 }]}>
                    <View style={[styles.tableGroupChipDot, { backgroundColor: '#818cf8' }]} />
                    <Text style={styles.tableGroupChipText}>2ª Parte</Text>
                  </View>
                  <View style={[styles.row3, { gap: 6, marginBottom: 6 }]}>
                    <View style={styles.bigStatCell}>
                      <Text style={styles.bigStatVal}>{(pred.corners.local_2H ?? 0) + (pred.corners.visitante_2H ?? 0)}</Text>
                      <Text style={styles.bigStatLbl}>Total</Text>
                    </View>
                    <View style={styles.bigStatCell}>
                      <Text style={styles.bigStatVal}>{pred.corners.local_2H ?? 0}</Text>
                      <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.homeTeam)} Loc</Text>
                    </View>
                    <View style={styles.bigStatCell}>
                      <Text style={styles.bigStatVal}>{pred.corners.visitante_2H ?? 0}</Text>
                      <Text style={styles.bigStatLbl}>{getFlag(selectedMatch.awayTeam)} Vis</Text>
                    </View>
                  </View>
                  <Bet365Table
                    headers={['Mercado', 'Prob.', 'Cuota']}
                    rows={[
                      { label: 'Córners +3.5 2H', prob: pred.corners.over3_5_2H, cuota: null },
                      { label: 'Córners +4.5 2H', prob: pred.corners.over4_5_2H, cuota: null },
                      { label: 'Córners +5.5 2H', prob: pred.corners.over5_5_2H, cuota: null },
                    ].filter(r => r.prob != null).map(r => [r.label, `${r.prob ?? '-'}%`, '-'])}
                  />
                </>
              )}
            </>
          )}
        </Section>

        {/* FALTAS */}
        <Section icon="⚠️" title="FALTAS" accent="#ef4444" delay={480}>
          {pred.faltas && (
            <>
              <View style={[styles.row3, { gap: 6, marginBottom: 8 }]}>
                <View style={styles.bigStatCell}>
                  <Text style={[styles.bigStatVal, { color: colors.accent.red }]}>{pred.faltas.total_esperado}</Text>
                  <Text style={styles.bigStatLbl}>Total esp.</Text>
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

              {/* Todo el partido */}
              <View style={styles.tableGroupChip}>
                <View style={[styles.tableGroupChipDot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.tableGroupChipText}>Todo el partido</Text>
              </View>
              <Bet365Table
                headers={['Mercado', 'Prob.', 'Cuota']}
                rows={[
                  { label: 'Faltas +15.5', prob: pred.faltas.over15_5, cuota: null },
                  { label: 'Faltas +17.5', prob: pred.faltas.over17_5, cuota: null },
                  { label: 'Faltas +20.5', prob: pred.faltas.over20_5, cuota: pred.faltas.cuota_over20_5 },
                  { label: 'Faltas +24.5', prob: pred.faltas.over24_5, cuota: null },
                ].filter(r => r.prob != null).map(r => [
                  r.label,
                  `${r.prob ?? '-'}%`,
                  (r as any).cuota ? ((r as any).cuota as number).toFixed(2) : '-'
                ])}
              />

              {/* Por equipo y mitad */}
              {pred.faltas.local_1H != null && (
                <>
                  <View style={[styles.tableGroupChip, { marginTop: 10 }]}>
                    <View style={[styles.tableGroupChipDot, { backgroundColor: '#ef4444' }]} />
                    <Text style={styles.tableGroupChipText}>Desglose por equipo</Text>
                  </View>
                  <Bet365Table
                    headers={['Equipo', '1ª P.', '2ª P.', 'Total']}
                    rows={[
                      { label: `${getFlag(selectedMatch.homeTeam)} Local`, h1: pred.faltas.local_1H, h2: pred.faltas.local_2H, total: pred.faltas.local },
                      { label: `${getFlag(selectedMatch.awayTeam)} Visit.`, h1: pred.faltas.visitante_1H, h2: pred.faltas.visitante_2H, total: pred.faltas.visitante },
                    ].map(r => [r.label, String(r.h1 ?? '-'), String(r.h2 ?? '-'), String(r.total ?? '-')])}
                  />
                </>
              )}
            </>
          )}
        </Section>

        {/* TARJETAS */}
        <Section icon="🟨" title="TARJETAS" accent="#fbbf24" delay={560}>
          {pred.tarjetas && (
            <>
              {/* Totales */}
              <View style={[styles.row3, { gap: 6, marginBottom: 8 }]}>
                <View style={styles.bigStatCell}>
                  <Text style={[styles.bigStatVal, { color: colors.accent.gold }]}>{pred.tarjetas.total_esperado}</Text>
                  <Text style={styles.bigStatLbl}>🟨 Total esp.</Text>
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

              {/* Todo el partido */}
              <View style={styles.tableGroupChip}>
                <View style={[styles.tableGroupChipDot, { backgroundColor: '#fbbf24' }]} />
                <Text style={styles.tableGroupChipText}>Todo el partido</Text>
              </View>
              <Bet365Table
                headers={['Mercado', 'Prob.', 'Cuota']}
                rows={[
                  { label: '🟨 +1.5 tarjetas', prob: pred.tarjetas.over1_5, cuota: null },
                  { label: '🟨 +2.5 tarjetas', prob: pred.tarjetas.over2_5, cuota: pred.tarjetas.cuota_over2_5 },
                  { label: '🟨 +3.5 tarjetas', prob: pred.tarjetas.over3_5, cuota: pred.tarjetas.cuota_over3_5 },
                  { label: '🟨 +4.5 tarjetas', prob: pred.tarjetas.over4_5, cuota: null },
                  { label: '🟨 +5.5 tarjetas', prob: pred.tarjetas.over5_5, cuota: null },
                  { label: '🟨 -3.5 tarjetas', prob: pred.tarjetas.under3_5, cuota: null },
                ].filter(r => r.prob != null && (r.prob ?? 0) > 0).map(r => [
                  r.label,
                  `${r.prob ?? '-'}%`,
                  r.cuota ? (r.cuota as number).toFixed(2) : '-'
                ])}
              />

              {pred.tarjetas.rojaProb > 0 && (
                <Text style={[styles.bodyText, { marginTop: 8, marginBottom: 8, color: colors.accent.red, fontWeight: '600' }]}>
                  🟥 Probabilidad de roja: {pred.tarjetas.rojaProb}%
                </Text>
              )}

              {/* Por equipo y mitad */}
              {pred.tarjetas.amarillas_local_1H != null && (
                <>
                  <View style={[styles.tableGroupChip, { marginTop: 10 }]}>
                    <View style={[styles.tableGroupChipDot, { backgroundColor: '#fbbf24' }]} />
                    <Text style={styles.tableGroupChipText}>Desglose por equipo</Text>
                  </View>
                  <Bet365Table
                    headers={['Equipo', '1ª P.', '2ª P.', 'Total']}
                    rows={[
                      { label: `${getFlag(selectedMatch.homeTeam)} Local`, h1: pred.tarjetas.amarillas_local_1H, h2: (pred.tarjetas.amarillas_local ?? 0) - (pred.tarjetas.amarillas_local_1H ?? 0), total: pred.tarjetas.amarillas_local },
                      { label: `${getFlag(selectedMatch.awayTeam)} Visit.`, h1: pred.tarjetas.amarillas_visitante_1H, h2: (pred.tarjetas.amarillas_visitante ?? 0) - (pred.tarjetas.amarillas_visitante_1H ?? 0), total: pred.tarjetas.amarillas_visitante },
                    ].map(r => [r.label, String(r.h1 ?? '-'), String(r.h2 ?? '-'), String(r.total ?? '-')])}
                  />
                </>
              )}

              {/* Jugadores en riesgo */}
              {pred.tarjetas.jugadores_riesgo?.length > 0 && (
                <>
                  <Text style={[styles.subSectionTitle, { marginTop: 10 }]}>🟨 Jugadores con más riesgo</Text>
                  {pred.tarjetas.jugadores_riesgo.map(j => (
                    <View key={j.nombre} style={styles.playerRow}>
                      <Text style={styles.playerRowFlag}>{j.equipo === 'local' ? getFlag(selectedMatch.homeTeam) || '🏠' : getFlag(selectedMatch.awayTeam) || '✈️'}</Text>
                      <Text style={styles.playerRowName}>{j.nombre}</Text>
                      <Text style={[styles.playerRowStat, { color: colors.accent.gold }]}>{j.probabilidad}% amarilla</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </Section>

        {/* GOLEADORES */}
        <Section icon="⚽" title="GOLEADORES PREVISTOS" accent="#f59e0b" delay={640}>
          {pred.goleadores && (
            <>
              <View style={styles.topScorerBox}>
                <Text style={styles.topScorerLabel}>⭐ PRIMER GOLEADOR</Text>
                <Text style={styles.topScorerName}>{getFlag(pred.goleadores?.primer_goleador?.equipo ?? '')} {pred.goleadores?.primer_goleador?.nombre ?? '-'}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                  <Text style={[styles.topScorerStat, { color: colors.accent.green }]}>{pred.goleadores?.primer_goleador?.probabilidad ?? 0}% probabilidad</Text>
                  <Text style={[styles.topScorerStat, { color: colors.accent.gold }]}>Cuota: {(typeof pred.goleadores?.primer_goleador?.cuota === 'number' ? pred.goleadores.primer_goleador.cuota : 0).toFixed(2)}</Text>
                </View>
              </View>
              {(pred.goleadores?.anytime?.length ?? 0) > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>Anytime scorer</Text>
                  {pred.goleadores!.anytime.map(g => (
                    <View key={g.nombre} style={styles.scorerRow}>
                      <Text style={styles.scorerFlag}>{getFlag(g.equipo)}</Text>
                      <Text style={styles.scorerName}>{g.nombre}</Text>
                      <Text style={[styles.scorerStat, { color: colors.accent.green }]}>{g.probabilidad}%</Text>
                      <Text style={[styles.scorerStat, { color: colors.accent.gold }]}>{(typeof g.cuota === 'number' ? g.cuota : 0).toFixed(2)}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </Section>

        {/* ASISTENCIAS Y MERCADOS DE JUGADORES */}
        {pred.mercadosJugadores && pred.mercadosJugadores.asistencias && pred.mercadosJugadores.asistencias.length > 0 && (
          <Section icon="🎯" title="ASISTENCIAS PREVISTAS" accent="#60a5fa" delay={665}>
            <Text style={styles.subSectionTitle}>Jugadores con más probabilidad de asistir</Text>
            {pred.mercadosJugadores.asistencias.map(j => (
              <View key={j.nombre} style={styles.scorerRow}>
                <Text style={styles.scorerFlag}>{j.equipo === 'local' ? getFlag(selectedMatch.homeTeam) : getFlag(selectedMatch.awayTeam)}</Text>
                <Text style={styles.scorerName}>{j.nombre}</Text>
                <Text style={[styles.scorerStat, { color: colors.accent.blue }]}>{j.probabilidad}%</Text>
                <Text style={[styles.scorerStat, { color: colors.accent.gold }]}>{(typeof j.cuota === 'number' ? j.cuota : 0).toFixed(2)}</Text>
              </View>
            ))}
            {pred.mercadosJugadores.scorerOAsistente && pred.mercadosJugadores.scorerOAsistente.length > 0 && (
              <>
                <Text style={[styles.subSectionTitle, { marginTop: 8 }]}>Gol o Asistencia (Score+Assist)</Text>
                {pred.mercadosJugadores.scorerOAsistente.map(j => (
                  <View key={j.nombre + '_sa'} style={styles.scorerRow}>
                    <Text style={styles.scorerFlag}>{j.equipo === 'local' ? getFlag(selectedMatch.homeTeam) : getFlag(selectedMatch.awayTeam)}</Text>
                    <Text style={styles.scorerName}>{j.nombre}</Text>
                    <Text style={[styles.scorerStat, { color: colors.accent.green }]}>{j.probabilidad}%</Text>
                    <Text style={[styles.scorerStat, { color: colors.accent.gold }]}>{(typeof j.cuota === 'number' ? j.cuota : 0).toFixed(2)}</Text>
                  </View>
                ))}
              </>
            )}
          </Section>
        )}

        {/* RESULTADOS EXACTOS */}
        {pred.resultados_exactos && pred.resultados_exactos.length > 0 && (
          <Section icon="🏆" title="RESULTADOS EXACTOS (TOP 5)" accent="#8b5cf6" delay={680}>
            {pred.resultados_exactos.map((r, i) => (
              <View key={r.resultado} style={[styles.exactScoreRow, i % 2 === 0 && styles.lineRowHighlight]}>
                <Text style={[styles.exactScorePos, { color: i === 0 ? colors.accent.gold : colors.text.muted }]}>{i + 1}.</Text>
                <Text style={styles.exactScoreResult}>{r.resultado}</Text>
                <Text style={[styles.exactScoreProb, { color: i === 0 ? colors.accent.green : colors.text.primary }]}>{r.probabilidad}%</Text>
                <Text style={styles.exactScoreOdds}>{(typeof r.cuota === 'number' ? r.cuota : 0).toFixed(1)}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* MERCADOS */}
        <Section icon="📊" title="MERCADOS DE GOLES" accent="#10b981" delay={720}>
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

        {/* APUESTAS CON VALOR */}
        {analysis.apuestasRecomendadas?.length > 0 && (
          <Section icon="💰" title="APUESTAS CON VALOR" accent={colors.accent.gold} delay={760}>
            {analysis.apuestasRecomendadas.map((bet, i) => (
              <View key={i} style={[styles.betCard, i === 0 && styles.betCardTop]}>
                {i === 0 && (
                  <View style={styles.topPickBadge}>
                    <Text style={styles.topPickText}>⭐ TOP PICK</Text>
                  </View>
                )}
                <View style={styles.betHead}>
                  <Text style={styles.betMarket}>{bet.mercado}</Text>
                  <View style={[styles.betValBadge, { backgroundColor: (bet.valor ?? 0) >= 0.05 ? colors.accent.green : colors.accent.gold }]}>
                    <Text style={styles.betValText}>{(bet.valor ?? 0) >= 0 ? '+' : ''}{((bet.valor ?? 0) * 100).toFixed(1)}% value</Text>
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
                    <Text style={styles.betOddsVal}>{(typeof bet.cuota === 'number' ? bet.cuota : 0).toFixed(2)}</Text>
                    <Text style={styles.betOddsLbl}>Cuota</Text>
                  </View>
                  <View style={styles.betProbBox}>
                    <Text style={styles.betProbVal}>{bet.probabilidad}%</Text>
                    <Text style={styles.betProbLbl}>Prob. IA</Text>
                  </View>
                  <View style={styles.betValueBox}>
                    <Text style={[styles.betProbVal, { color: (bet.valor ?? 0) >= 0.05 ? colors.accent.green : colors.accent.gold }]}>
                      {(bet.valor ?? 0) >= 0 ? '+' : ''}{((bet.valor ?? 0) * 100).toFixed(0)}%
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

        {/* APUESTA PERSONALIZADA */}
        {selectedMatch && (
          <View style={{ marginBottom: 18 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#1e293b',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#334155',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
              onPress={() => setSmartBetMatch({
                id: selectedMatch.id,
                homeTeam: selectedMatch.homeTeam,
                awayTeam: selectedMatch.awayTeam,
                league: selectedMatch.league ?? 'Mundial 2026',
              })}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 16 }}>🎰</Text>
              <Text style={{ color: '#e2e8f0', fontWeight: '700', fontSize: 14 }}>
                Crear apuesta personalizada
              </Text>
              <Text style={{ color: '#22c55e', fontSize: 14 }}>→</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </View>
    ); } catch (renderErr: any) {
      console.error('[WikiBet] AnalysisContent crash caught:', renderErr?.message ?? renderErr);
      return (
        <View style={styles.modalScroll}>
          <View style={{ padding: 30, alignItems: 'center' }}>
            <Text style={{ color: '#ef4444', fontSize: 15, textAlign: 'center', marginBottom: 8 }}>
              ⚠️ Error al renderizar el análisis
            </Text>
            <Text style={{ color: '#9ca3af', fontSize: 11, textAlign: 'center' }}>
              {renderErr?.message ?? 'Error desconocido'}
            </Text>
          </View>
        </View>
      );
    }
  };

  const groups = groupedMatches();

  return (
    <SafeAreaView style={styles.container}>
      <PartidosHeader count={filtered.length} showPast={showPast} comp={selectedComp} />

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
              <Text style={styles.modalTeamA} numberOfLines={1}>
                {getFlag(selectedMatch?.homeTeam || '')} {selectedMatch?.homeTeam}
              </Text>
              <Text style={styles.modalVs}>vs</Text>
              <Text style={styles.modalTeamB} numberOfLines={1}>
                {selectedMatch?.awayTeam} {getFlag(selectedMatch?.awayTeam || '')}
              </Text>
            </View>
            <View style={{ width: 70, alignItems: 'flex-end' }}>
              <Text style={{ color: '#6b7280', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' }}>
                {selectedMatch && new Date(selectedMatch.date).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })}
              </Text>
              <Text style={{ color: '#9ca3af', fontSize: 13, fontWeight: '800' }}>
                {selectedMatch && new Date(selectedMatch.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {/* ── Weather + venue bar ── */}
          {selectedMatch && (
            <View style={{
              paddingHorizontal: 14, paddingVertical: 6,
              backgroundColor: '#050d18', borderBottomWidth: 1, borderBottomColor: '#111827',
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Text style={{ color: '#374151', fontSize: 9, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                📍 {selectedMatch.venue ?? 'Estadio por confirmar'}
              </Text>
              {matchWeather ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0f1b2d', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 15 }}>{matchWeather.icon}</Text>
                  <View>
                    <Text style={{ color: '#f9fafb', fontSize: 15, fontWeight: '900', lineHeight: 17 }}>{matchWeather.temp}°C</Text>
                    <Text style={{ color: '#3b82f6', fontSize: 8, fontWeight: '700', lineHeight: 11 }}>{matchWeather.city}</Text>
                    <Text style={{ color: '#6b7280', fontSize: 8, lineHeight: 10 }}>{matchWeather.description}</Text>
                  </View>
                  <View style={{ borderLeftWidth: 1, borderLeftColor: '#1f2937', paddingLeft: 7 }}>
                    <Text style={{ color: '#9ca3af', fontSize: 8, lineHeight: 11 }}>💧 {matchWeather.humidity}%</Text>
                    <Text style={{ color: '#9ca3af', fontSize: 8, lineHeight: 11 }}>💨 {matchWeather.windSpeed}km/h</Text>
                  </View>
                </View>
              ) : (
                <View style={{ backgroundColor: '#0f1b2d', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ color: '#374151', fontSize: 9, fontStyle: 'italic' }}>
                    {selectedMatch.venue ? 'Cargando clima...' : '🌍 Clima no disponible'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {selectedMatch && predTimestamps[selectedMatch.id] && selectedMatch.status === 'upcoming' && (
            <View style={{
              paddingHorizontal: 16, paddingVertical: 6,
              backgroundColor: '#0f2a1a', borderBottomWidth: 1, borderBottomColor: '#1a4a2a',
              flexDirection: 'row', alignItems: 'center', gap: 6,
            }}>
              <Text style={{ fontSize: 9, color: '#22c55e', fontWeight: '700' }}>
                🤖 Última actualización pronóstico: {new Date(predTimestamps[selectedMatch.id]).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} h
              </Text>
              <Text style={{ fontSize: 9, color: '#4ade80' }}>· IA recalibrada</Text>
            </View>
          )}

          {/* ── TODO EL CONTENIDO SCROLLEA JUNTO (campo + análisis) ── */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* PITCH + EVENTOS — responsive: side-by-side on web, stacked on mobile */}
            {selectedMatch && (
              <View style={{
                flexDirection: isMobile ? 'column' : 'row',
                gap: 10, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6,
              }}>
                <LineupPitch
                  homeTeam={selectedMatch.homeTeam}
                  awayTeam={selectedMatch.awayTeam}
                  homeFormation={matchLineup?.homeFormation ?? '4-3-3'}
                  awayFormation={matchLineup?.awayFormation ?? '4-3-3'}
                  homePlayers={matchLineup?.homePlayers ?? []}
                  awayPlayers={matchLineup?.awayPlayers ?? []}
                  isUpcoming={!matchLineup && selectedMatch.status === 'upcoming'}
                  isLoading={false}
                  lineupConfirmed={lineupConfirmed}
                  pitchWidth={isMobile ? Math.min(screenWidth * 0.44, 170) : 300}
                />
                <View style={isMobile ? { width: '100%', minHeight: 300 } : { flex: 1 }}>
                <MatchEventsPanel
                  homeTeam={selectedMatch.homeTeam}
                  awayTeam={selectedMatch.awayTeam}
                  homeScore={liveScoresMap[selectedMatch.id]?.homeScore ?? selectedMatch.homeScore}
                  awayScore={liveScoresMap[selectedMatch.id]?.awayScore ?? selectedMatch.awayScore}
                  status={(liveScoresMap[selectedMatch.id]?.status ?? selectedMatch.status) as 'upcoming' | 'live' | 'finished'}
                  events={matchEvents}
                  estimatedEvents={estimatedEvents}
                  matchDate={selectedMatch.date}
                  liveMinute={(() => {
                    const ld = liveScoresMap[selectedMatch.id];
                    const rs = ld?.rawStatus;
                    // HT always shows 45'
                    if (rs === 'HT') return 45;
                    const storedTs = liveMinuteTimestamps.current[selectedMatch.id];
                    if (storedTs) {
                      const driftMin = Math.floor((Date.now() - storedTs.receivedAt) / 60000);
                      if (rs === '1H') return Math.min(45, storedTs.minute + driftMin);
                      if (rs === '2H') {
                        // If stored minute is still from 1H (≤45), halftime break
                        // already elapsed — compute 2H start as 45 + drift minus 15min break
                        if (storedTs.minute <= 45) {
                          return Math.min(97, 45 + Math.max(0, driftMin - 15));
                        }
                        // Stored minute is already in 2H territory — just add drift
                        return Math.min(97, storedTs.minute + driftMin);
                      }
                      return Math.min(97, storedTs.minute + driftMin);
                    }
                    // No stored timestamp — fall back to elapsed time from kick-off
                    const elapsed = Math.floor((Date.now() - new Date(selectedMatch.date).getTime()) / 60000);
                    if (rs === '1H') return Math.min(45, Math.max(1, elapsed));
                    if (rs === '2H') return Math.min(97, 45 + Math.max(0, elapsed - 62));
                    // Live but no rawStatus — use elapsed
                    const st = ld?.status ?? selectedMatch.status;
                    if (st === 'live' && elapsed > 0) {
                      if (elapsed <= 47) return Math.min(45, elapsed);
                      if (elapsed <= 62) return 45;
                      return Math.min(97, 45 + Math.max(0, elapsed - 62));
                    }
                    return undefined;
                  })()}
                  rawStatus={liveScoresMap[selectedMatch.id]?.rawStatus}
                />
                </View>
              </View>
            )}

            {/* ANÁLISIS IA */}
            {analysisLoading ? (
              <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
                <ActivityIndicator size="large" color={colors.accent.green} />
                <Text style={styles.loadingLabel}>🤖 Analizando con IA...</Text>
                <Text style={styles.loadingSubLabel}>Generando pronósticos detallados · ~15s</Text>
              </View>
            ) : analysisError ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={styles.errorText}>⚠️ No se pudo cargar el análisis</Text>
                <Text style={styles.errorSub}>Verifica tu API key o conexión</Text>
              </View>
            ) : analysis ? (
              <AnalysisErrorBoundary key={analysis.resumenEjecutivo ?? 'analysis'}>
                <AnalysisContent />
              </AnalysisErrorBoundary>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Quick bet modal */}
      <QuickBetModal
        visible={!!quickBet}
        data={quickBet}
        onClose={() => setQuickBet(null)}
        onSaved={() => setQuickBet(null)}
      />

      {/* Smart add bet modal */}
      <SmartAddBetModal
        visible={!!smartBetMatch}
        matches={smartBetMatch ? [smartBetMatch] : []}
        onClose={() => setSmartBetMatch(null)}
        onSaved={() => setSmartBetMatch(null)}
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
  liveAdjBadge: { marginLeft: 2 },
  liveAdjText: { fontSize: 8 },
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
  predUpdateBadge: {
    marginBottom: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    backgroundColor: '#0f2a1a', borderWidth: 1, borderColor: '#1a4a2a', alignSelf: 'flex-start',
  },
  predUpdateText: { color: '#22c55e', fontSize: 9, fontWeight: '700' },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  teamSide: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  matchFlag: { fontSize: 16, paddingTop: 2 },
  teamName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text.primary },
  scorerLine: { fontSize: 9, color: '#22c55e', fontWeight: '600', marginTop: 1 },
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
  modalTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  modalTeamA: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '800', color: colors.text.primary },
  modalVs: { fontSize: 10, color: colors.text.muted, fontWeight: '600', paddingHorizontal: 4 },
  modalTeamB: { flex: 1, textAlign: 'left', fontSize: 12, fontWeight: '800', color: colors.text.primary },
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
  subSectionTitle: { fontSize: 9, fontWeight: '800', color: '#6A7A8E', marginTop: 10, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#ffffff08', borderRadius: 6, alignSelf: 'flex-start' },
  tableGroupChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ffffff0a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, marginTop: 10, marginBottom: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#ffffff12' },
  tableGroupChipText: { fontSize: 9, fontWeight: '800', color: '#6A7A8E', textTransform: 'uppercase', letterSpacing: 0.9 },
  tableGroupChipDot: { width: 5, height: 5, borderRadius: 3 },
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
    flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 7,
    backgroundColor: '#161D28', borderRadius: 8, marginBottom: 2,
    borderWidth: 1, borderColor: '#1C2535',
  },
  tableHeadCell: { width: 50, fontSize: 9, fontWeight: '700', color: '#4A5A6E', textAlign: 'center' },
  lineRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center', borderRadius: 4 },
  lineRowHighlight: { backgroundColor: '#ffffff04' },
  lineLabelText: { flex: 1.4, fontSize: 11, fontWeight: '600', color: colors.text.primary },
  lineVal: { width: 50, fontSize: 11, fontWeight: '600', color: colors.text.primary, textAlign: 'center' },
  lineValTotal: { width: 50, fontSize: 13, fontWeight: '800', color: colors.accent.gold, textAlign: 'center' },
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
  // ─── BET365-style table ───
  bet365Table: { marginBottom: 12, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#1C2535' },
  bet365Header: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: '#161D28',
    borderBottomWidth: 1.5, borderBottomColor: '#253040',
  },
  bet365HeaderCell: {
    fontSize: 9, fontWeight: '800', color: '#6A7A8E',
    textTransform: 'uppercase', letterSpacing: 0.7,
  },
  bet365Row: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: '#1C2535',
    alignItems: 'center',
  },
  bet365RowAlt: { backgroundColor: '#ffffff04' },
  bet365CellLabel: {
    fontSize: 11, fontWeight: '600', color: colors.text.primary,
    textAlign: 'left',
  },
  bet365CellValue: {
    fontSize: 12, fontWeight: '700', color: '#A8BCCE',
    textAlign: 'center',
  },
  bet365CellValueBold: {
    fontSize: 13, fontWeight: '800', color: colors.text.primary,
    textAlign: 'center',
  },
  bet365CellOdds: {
    fontSize: 12, fontWeight: '800', color: colors.accent.gold,
    textAlign: 'center',
  },
});

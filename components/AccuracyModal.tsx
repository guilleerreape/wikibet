import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, Pressable,
} from 'react-native';
import { getAccuracyStats, seedHistoricalData, AccuracyStats, MarketStat } from '../services/predictionTracker';
import { colors } from '../constants/colors';

interface Props { visible: boolean; onClose: () => void }

// ─── Count-up animation ───────────────────────────────────────────────────────
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === 0) { setV(0); return; }
    let i = 0; const steps = 32;
    const t = setInterval(() => {
      i++; setV(Math.round(target * i / steps));
      if (i >= steps) clearInterval(t);
    }, 25);
    return () => clearInterval(t);
  }, [target]);
  return <Text>{v}{suffix}</Text>;
}

// ─── Animated fill bar ───────────────────────────────────────────────────────
function AnimBar({ pct, color, height = 20, delay = 0 }:
  { pct: number; color: string; height?: number; delay?: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 900, delay, useNativeDriver: false }).start();
  }, [pct]);
  const width = w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={[ab.bg, { height }]}>
      <Animated.View style={[ab.fill, { width, backgroundColor: color, borderRadius: height / 2 }]} />
      <Text style={[ab.label, { fontSize: height > 18 ? 11 : 9 }]}>{pct}%</Text>
    </View>
  );
}
const ab = StyleSheet.create({
  bg:    { flex: 1, backgroundColor: '#1e293b', borderRadius: 10, overflow: 'hidden', justifyContent: 'center' },
  fill:  { position: 'absolute', left: 0, top: 0, bottom: 0 },
  label: { fontWeight: '800', color: '#fff', textAlign: 'center', zIndex: 1 },
});

// ─── Pulsing outer ring ───────────────────────────────────────────────────────
function PulsingRing({ pct }: { pct: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1300, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1300, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const col = pct >= 65 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <Animated.View style={[s.bigCircle, { borderColor: col, transform: [{ scale: pulse }] }]}>
      <Text style={[s.bigPct, { color: col }]}>{pct}%</Text>
      <Text style={s.bigLabel}>ACIERTOS</Text>
    </Animated.View>
  );
}

// ─── Single market row — prominence drives size + color ───────────────────────
function MarketRow({ stat, rank, delay }: { stat: MarketStat; rank: number; delay: number }) {
  const pct    = stat.pct;
  const isTop  = pct >= 65;
  const isMid  = pct >= 48 && pct < 65;
  // isFade = pct < 48

  const barColor = isTop ? '#22c55e' : isMid ? '#f59e0b' : '#6b7280';
  const barH     = isTop ? 22 : isMid ? 18 : 14;
  const opacity  = isTop ? 1 : isMid ? 0.85 : 0.55;
  const labelCol = isTop ? '#e5e7eb' : isMid ? '#d1d5db' : '#6b7280';

  return (
    <Animated.View style={[s.mktRow, { opacity }]}>
      {/* Rank badge */}
      <View style={[s.rankBadge, isTop && s.rankTop]}>
        <Text style={[s.rankNum, isTop && { color: '#22c55e' }]}>{rank}</Text>
      </View>

      {/* Emoji */}
      <Text style={[s.mktEmoji, !isTop && { fontSize: 14, opacity: 0.7 }]}>{stat.emoji}</Text>

      {/* Label + count */}
      <View style={s.mktInfo}>
        <Text style={[s.mktLabel, { color: labelCol, fontSize: isTop ? 12 : isMid ? 11 : 10 }]}>
          {stat.label}
        </Text>
        <Text style={s.mktCount}>{stat.correct}/{stat.predicted}</Text>
      </View>

      {/* Bar */}
      <View style={s.mktBar}>
        <AnimBar pct={pct} color={barColor} height={barH} delay={delay} />
      </View>

      {/* Top badge */}
      {isTop && (
        <View style={s.topBadge}>
          <Text style={s.topBadgeText}>✓</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function AccuracyModal({ visible, onClose }: Props) {
  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [loading, setLoading]   = useState(false);
  const [seeding, setSeeding]   = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const load = async () => {
    setLoading(true); fade.setValue(0);
    let data = await getAccuracyStats();
    if (!data || data.totalMatches === 0) {
      setSeeding(true);
      await seedHistoricalData();
      setSeeding(false);
      data = await getAccuracyStats();
    }
    setStats(data); setLoading(false);
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  useEffect(() => { if (visible) load(); }, [visible]);

  const topMarkets   = stats?.markets.filter(m => m.pct >= 65)  ?? [];
  const midMarkets   = stats?.markets.filter(m => m.pct >= 48 && m.pct < 65) ?? [];
  const fadeMarkets  = stats?.markets.filter(m => m.pct < 48)   ?? [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>

          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>🎯 Precisión de la IA</Text>
            <TouchableOpacity onPress={load} style={s.refreshBtn} disabled={loading}>
              <Text style={{ fontSize: 17, opacity: loading ? 0.3 : 1 }}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.headerSub}>
            Todas las competiciones · 7 mercados por partido · Tiempo real
          </Text>

          {/* Loading */}
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={colors.accent.green} />
              <Text style={s.loadTxt}>
                {seeding ? '⚡ Cargando partidos del Mundial 2026...' : 'Actualizando...'}
              </Text>
            </View>

          ) : stats && stats.totalMatches > 0 ? (
            <Animated.View style={{ opacity: fade, flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

                {/* ── Big circle ── */}
                <View style={s.circleWrap}>
                  <PulsingRing pct={stats.overallPct} />
                  <View style={{ alignItems: 'center', gap: 3 }}>
                    <Text style={s.circleMain}>
                      <CountUp target={stats.correctPredictions} /> de{' '}
                      <CountUp target={stats.totalPredictions} /> pronósticos correctos
                    </Text>
                    <Text style={s.circleSub}>
                      en <CountUp target={stats.totalMatches} /> partidos analizados
                    </Text>
                    <View style={s.circlePill}>
                      <Text style={s.circlePillTxt}>
                        {stats.totalMatches * 7} pronósticos totales
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── TOP ACIERTOS ── */}
                {topMarkets.length > 0 && (
                  <View style={s.section}>
                    <View style={s.sectionLabelRow}>
                      <Text style={s.sectionLabel}>🏆 Puntos fuertes</Text>
                      <Text style={s.sectionHint}>La IA lo clava</Text>
                    </View>
                    <View style={[s.cardWrap, s.cardGreen]}>
                      {topMarkets.map((m, i) => (
                        <MarketRow key={m.label} stat={m} rank={i + 1} delay={i * 120} />
                      ))}
                    </View>
                  </View>
                )}

                {/* ── MERCADOS MEDIOS ── */}
                {midMarkets.length > 0 && (
                  <View style={s.section}>
                    <View style={s.sectionLabelRow}>
                      <Text style={s.sectionLabel}>📊 En progreso</Text>
                      <Text style={s.sectionHint}>Mejorando con más partidos</Text>
                    </View>
                    <View style={s.cardWrap}>
                      {midMarkets.map((m, i) => (
                        <MarketRow key={m.label} stat={m} rank={topMarkets.length + i + 1} delay={i * 100} />
                      ))}
                    </View>
                  </View>
                )}

                {/* ── MERCADOS BAJOS (discretos) ── */}
                {fadeMarkets.length > 0 && (
                  <View style={[s.section, { marginBottom: 6 }]}>
                    <Text style={[s.sectionLabel, { color: '#374151', fontSize: 10 }]}>
                      Acumulando datos...
                    </Text>
                    <View style={[s.cardWrap, { opacity: 0.55 }]}>
                      {fadeMarkets.map((m, i) => (
                        <MarketRow key={m.label} stat={m} rank={topMarkets.length + midMarkets.length + i + 1} delay={i * 80} />
                      ))}
                    </View>
                  </View>
                )}

                {/* ── 1X2 desglose ── */}
                <View style={s.section}>
                  <Text style={[s.sectionLabel, { marginBottom: 8 }]}>📋 Desglose resultado 1X2</Text>
                  <View style={s.cardWrap}>
                    {([
                      { label: '1 · Victoria local',     key: 'victorias' as const, emoji: '🏠', color: '#22c55e' },
                      { label: 'X · Empate',             key: 'empates'   as const, emoji: '🤝', color: '#f59e0b' },
                      { label: '2 · Victoria visitante', key: 'visitante' as const, emoji: '✈️', color: '#60a5fa' },
                    ]).map((r, i) => {
                      const d = stats[r.key];
                      return (
                        <View key={r.key} style={s.sub1x2Row}>
                          <Text style={s.mktEmoji}>{r.emoji}</Text>
                          <View style={s.mktInfo}>
                            <Text style={s.mktLabel}>{r.label}</Text>
                            <Text style={s.mktCount}>{d.correct}/{d.predicted}</Text>
                          </View>
                          <View style={s.mktBar}>
                            <AnimBar pct={d.pct} color={r.color} height={18} delay={i * 150} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* ── Cómo funciona ── */}
                <View style={s.howBox}>
                  <Text style={s.howTitle}>¿Cómo se calcula?</Text>
                  {[
                    ['🤖', 'Cada partido analizado genera 7 pronósticos: resultado 1X2, +0.5 goles, +1.5 goles, +2.5 goles, -2.5 goles, ambos marcan y +3.5 goles.'],
                    ['📰', 'La IA considera noticias recientes, lesiones, estado de forma y contexto táctico para maximizar la precisión en cada mercado.'],
                    ['🌍', 'Estadísticas compartidas globalmente. Todos los usuarios ven los mismos datos en tiempo real.'],
                    ['📅', 'Desde el día 1 del Mundial 2026. Se acumula con todos los partidos de todas las competiciones: LaLiga, Premier, UCL, etc.'],
                  ].map(([ico, txt], i) => (
                    <View key={i} style={s.howRow}>
                      <Text style={s.howIco}>{ico}</Text>
                      <Text style={s.howTxt}>{txt}</Text>
                    </View>
                  ))}
                </View>

                <Text style={s.metaTime}>
                  ⏱️ Actualizado: {stats.lastUpdated.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                </Text>
                <Text style={s.disclaimer}>
                  * El % global es el promedio compuesto de los 7 mercados en todos los partidos analizados.
                </Text>

              </ScrollView>
            </Animated.View>

          ) : (
            <View style={s.center}>
              <Text style={{ fontSize: 44 }}>🎯</Text>
              <Text style={s.emptyTitle}>Preparando datos...</Text>
              <Text style={s.emptyTxt}>Abre el análisis de cualquier partido para que la IA empiece a registrar sus pronósticos.</Text>
              <TouchableOpacity style={s.retryBtn} onPress={load}>
                <Text style={s.retryTxt}>🔄 Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 34, maxHeight: '94%',
    borderTopWidth: 1, borderColor: '#1e293b',
  },
  handle: {
    alignSelf: 'center', width: 38, height: 4, borderRadius: 2,
    backgroundColor: '#374151', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: '#fff' },
  headerSub:   { fontSize: 11, color: '#6b7280', paddingHorizontal: 20, marginBottom: 12 },
  refreshBtn:  { padding: 6, marginRight: 4 },
  closeBtn:    { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center' },
  closeIcon:   { color: '#9ca3af', fontSize: 12, fontWeight: '700' },

  content: { paddingHorizontal: 16, paddingBottom: 20 },

  // Big circle
  circleWrap: { alignItems: 'center', marginBottom: 22, gap: 10 },
  bigCircle:  {
    width: 130, height: 130, borderRadius: 65, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827',
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 18, elevation: 10,
  },
  bigPct:   { fontSize: 34, fontWeight: '900', lineHeight: 40 },
  bigLabel: { fontSize: 9, fontWeight: '800', color: '#6b7280', letterSpacing: 1.5 },
  circleMain: { fontSize: 13, color: '#e5e7eb', fontWeight: '600', textAlign: 'center' },
  circleSub:  { fontSize: 11, color: '#6b7280', textAlign: 'center' },
  circlePill: { backgroundColor: '#1f2937', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
  circlePillTxt: { fontSize: 10, color: '#4b5563', fontWeight: '600' },

  // Sections
  section: { marginBottom: 14 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHint:  { fontSize: 10, color: '#374151', fontStyle: 'italic' },

  // Card container
  cardWrap: {
    backgroundColor: '#111827', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#1e293b',
  },
  cardGreen: { borderColor: '#14532d', shadowColor: '#22c55e', shadowOpacity: 0.15, shadowRadius: 8 },

  // Market row
  mktRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1e293b', gap: 8,
  },
  rankBadge: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#1f2937',
    alignItems: 'center', justifyContent: 'center',
  },
  rankTop:  { backgroundColor: '#14532d' },
  rankNum:  { fontSize: 9, fontWeight: '800', color: '#6b7280' },
  mktEmoji: { fontSize: 16 },
  mktInfo:  { flex: 1.3 },
  mktLabel: { fontWeight: '700' },
  mktCount: { fontSize: 9, color: '#6b7280', marginTop: 1 },
  mktBar:   { flex: 2 },
  topBadge: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#14532d',
    alignItems: 'center', justifyContent: 'center',
  },
  topBadgeText: { fontSize: 11, color: '#22c55e', fontWeight: '900' },

  // 1X2 sub breakdown
  sub1x2Row: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#1e293b', gap: 8,
  },

  // How it works
  howBox: {
    backgroundColor: '#0d1f0d', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1a3a1a', marginBottom: 14, gap: 9,
  },
  howTitle: { fontSize: 12, fontWeight: '800', color: '#22c55e', marginBottom: 2 },
  howRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  howIco:  { fontSize: 14, width: 20 },
  howTxt:  { flex: 1, fontSize: 11, color: '#9ca3af', lineHeight: 16 },

  metaTime:    { fontSize: 10, color: '#4b5563', marginBottom: 6 },
  disclaimer:  { fontSize: 10, color: '#374151', fontStyle: 'italic', lineHeight: 14 },

  // States
  center:     { padding: 40, alignItems: 'center', gap: 12 },
  loadTxt:    { color: '#9ca3af', fontSize: 13, textAlign: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
  emptyTxt:   { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  retryBtn:   { backgroundColor: '#22c55e', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryTxt:   { color: '#000', fontWeight: '800', fontSize: 13 },
});

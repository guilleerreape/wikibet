import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, Pressable,
} from 'react-native';
import { getAccuracyStats, seedHistoricalData, AccuracyStats, MarketStat } from '../services/predictionTracker';
import { colors } from '../constants/colors';

interface Props { visible: boolean; onClose: () => void }

// ─── Animated count-up ───────────────────────────────────────────────────────
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target === 0) { setV(0); return; }
    const steps = 36; let i = 0;
    const t = setInterval(() => { i++; setV(Math.round(target * i / steps)); if (i >= steps) clearInterval(t); }, 28);
    return () => clearInterval(t);
  }, [target]);
  return <Text>{v}{suffix}</Text>;
}

// ─── Animated fill bar ───────────────────────────────────────────────────────
function AnimBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 850, delay, useNativeDriver: false }).start();
  }, [pct]);
  const width = w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={ab.bg}>
      <Animated.View style={[ab.fill, { width, backgroundColor: color }]} />
      <Text style={ab.label}>{pct}%</Text>
    </View>
  );
}
const ab = StyleSheet.create({
  bg:    { flex: 1, height: 20, backgroundColor: '#1e293b', borderRadius: 10, overflow: 'hidden', justifyContent: 'center' },
  fill:  { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 10 },
  label: { fontSize: 10, fontWeight: '800', color: '#fff', textAlign: 'center', zIndex: 1 },
});

// ─── Pulsing ring ─────────────────────────────────────────────────────────────
function PulsingRing({ pct }: { pct: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 1300, useNativeDriver: true }),
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

// ─── Market row ───────────────────────────────────────────────────────────────
function MktRow({ emoji, label, stat, color, delay }: {
  emoji: string; label: string; stat: MarketStat; color: string; delay: number;
}) {
  return (
    <View style={s.mktRow}>
      <View style={[s.mktIcon, { backgroundColor: color + '20' }]}>
        <Text style={s.mktEmoji}>{emoji}</Text>
      </View>
      <View style={s.mktInfo}>
        <Text style={s.mktLabel}>{label}</Text>
        <Text style={s.mktCount}>{stat.correct}/{stat.predicted}</Text>
      </View>
      <View style={s.mktBar}>
        <AnimBar pct={stat.pct} color={color} delay={delay} />
      </View>
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function AccuracyModal({ visible, onClose }: Props) {
  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const fade = useRef(new Animated.Value(0)).current;

  const load = async () => {
    setLoading(true);
    fade.setValue(0);
    let data = await getAccuracyStats();
    if (!data || data.totalMatches === 0) {
      setSeeding(true);
      await seedHistoricalData();
      setSeeding(false);
      data = await getAccuracyStats();
    }
    setStats(data);
    setLoading(false);
    Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  useEffect(() => { if (visible) load(); }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>

          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>🎯 Precisión de la IA</Text>
            <TouchableOpacity onPress={load} style={s.refreshBtn} disabled={loading}>
              <Text style={[s.refreshIcon, loading && { opacity: 0.4 }]}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.headerSub}>
            Todas las competiciones · V/X/D + Goles + BTTS · Tiempo real global
          </Text>

          {/* Loading */}
          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={colors.accent.green} />
              <Text style={s.loadingText}>
                {seeding ? '⚡ Cargando partidos del Mundial 2026...' : 'Actualizando estadísticas...'}
              </Text>
              {seeding && (
                <Text style={s.seedSub}>Generando predicciones de IA para los primeros partidos</Text>
              )}
            </View>

          ) : stats && stats.totalMatches > 0 ? (
            <Animated.View style={{ opacity: fade, flex: 1 }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

                {/* Big composite % circle */}
                <View style={s.circleWrap}>
                  <PulsingRing pct={stats.overallPct} />
                  <View style={s.circleStats}>
                    <Text style={s.circleMain}>
                      <CountUp target={stats.correctPredictions} /> de{' '}
                      <CountUp target={stats.totalPredictions} /> predicciones correctas
                    </Text>
                    <Text style={s.circleSub}>
                      en <CountUp target={stats.totalMatches} /> partidos analizados
                    </Text>
                  </View>
                </View>

                {/* ── Mercados ── */}
                <View style={s.section}>
                  <Text style={s.sectionTitle}>📊 Por mercado</Text>

                  <View style={s.tableWrap}>
                    <View style={s.tableHeader}>
                      <Text style={[s.th, { flex: 1.6 }]}>Mercado</Text>
                      <Text style={[s.th, { width: 48 }]}>N</Text>
                      <Text style={[s.th, { flex: 2, textAlign: 'left' }]}>Precisión</Text>
                    </View>

                    <MktRow emoji="🏆" label="Resultado 1X2"    stat={stats.h1x2}   color="#22c55e" delay={100} />
                    <MktRow emoji="⚽" label="+1.5 goles"       stat={stats.over15} color="#60a5fa" delay={220} />
                    <MktRow emoji="🔥" label="+2.5 goles"       stat={stats.over25} color="#f59e0b" delay={340} />
                    <MktRow emoji="🎯" label="Ambos marcan"     stat={stats.btts}   color="#a78bfa" delay={460} />
                  </View>
                </View>

                {/* ── Desglose 1X2 ── */}
                <View style={s.section}>
                  <Text style={s.sectionTitle}>📋 Desglose resultado 1X2</Text>
                  <View style={s.tableWrap}>
                    {[
                      { label: '1 · Victoria local',    key: 'victorias' as const, emoji: '🏠', color: '#22c55e', d: 100 },
                      { label: 'X · Empate',            key: 'empates'   as const, emoji: '🤝', color: '#f59e0b', d: 220 },
                      { label: '2 · Victoria visitante',key: 'visitante' as const, emoji: '✈️', color: '#60a5fa', d: 340 },
                    ].map(r => (
                      <View key={r.key} style={s.mktRow}>
                        <View style={[s.mktIcon, { backgroundColor: r.color + '20' }]}>
                          <Text style={s.mktEmoji}>{r.emoji}</Text>
                        </View>
                        <View style={s.mktInfo}>
                          <Text style={s.mktLabel}>{r.label}</Text>
                          <Text style={s.mktCount}>{stats[r.key].correct}/{stats[r.key].predicted}</Text>
                        </View>
                        <View style={s.mktBar}>
                          <AnimBar pct={stats[r.key].pct} color={r.color} delay={r.d} />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {/* ── Cómo funciona ── */}
                <View style={s.howBox}>
                  <Text style={s.howTitle}>¿Cómo se contabiliza?</Text>
                  {[
                    ['🤖', 'Cada partido analizado genera 4 predicciones: resultado 1X2, +1.5 goles, +2.5 goles y si ambos marcan.'],
                    ['📰', 'La IA considera noticias de última hora, estado físico, lesiones, forma reciente y contexto táctico para maximizar la precisión.'],
                    ['🌍', 'Estadísticas compartidas en tiempo real entre todos los usuarios. El % que ves es el mismo para todos.'],
                    ['🏆', 'Incluye todas las competiciones: Mundial 2026, LaLiga, Premier, Bundesliga, Serie A, Ligue 1, UCL y las que se añadan.'],
                    ['📅', 'Contabiliza desde el día 1 del Mundial 2026. Se acumula de forma permanente con cada nuevo partido.'],
                  ].map(([ico, txt], i) => (
                    <View key={i} style={s.howRow}>
                      <Text style={s.howIcon}>{ico}</Text>
                      <Text style={s.howText}>{txt}</Text>
                    </View>
                  ))}
                </View>

                {/* ── Meta ── */}
                <View style={s.metaRow2}>
                  <Text style={s.metaIcon2}>⏱️</Text>
                  <Text style={s.metaText2}>
                    Actualizado: {stats.lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </Text>
                </View>

                <Text style={s.disclaimer}>
                  * El % global es el compuesto de todos los mercados (1X2 + goles + BTTS). Cuanto más partidos se analicen, más preciso será el dato.
                </Text>

              </ScrollView>
            </Animated.View>

          ) : (
            <View style={s.center}>
              <Text style={s.emptyEmoji}>🎯</Text>
              <Text style={s.emptyTitle}>Preparando datos...</Text>
              <Text style={s.emptyText}>Abre el análisis de cualquier partido para que la IA empiece a registrar sus predicciones.</Text>
              <TouchableOpacity style={s.retryBtn} onPress={load}>
                <Text style={s.retryText}>🔄 Reintentar</Text>
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
    paddingBottom: 34, maxHeight: '92%',
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
  headerSub: { fontSize: 11, color: '#6b7280', paddingHorizontal: 20, marginBottom: 12 },
  refreshBtn: { padding: 6, marginRight: 4 },
  refreshIcon: { fontSize: 17 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#1f2937',
    alignItems: 'center', justifyContent: 'center',
  },
  closeIcon: { color: '#9ca3af', fontSize: 12, fontWeight: '700' },

  content: { paddingHorizontal: 16, paddingBottom: 20 },

  // Big circle
  circleWrap: { alignItems: 'center', marginBottom: 24, gap: 10 },
  bigCircle: {
    width: 130, height: 130, borderRadius: 65, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#111827',
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35, shadowRadius: 18, elevation: 12,
  },
  bigPct:   { fontSize: 34, fontWeight: '900', lineHeight: 40 },
  bigLabel: { fontSize: 9, fontWeight: '800', color: '#6b7280', letterSpacing: 1.5 },
  circleStats: { alignItems: 'center', gap: 2 },
  circleMain: { fontSize: 13, color: '#e5e7eb', fontWeight: '600', textAlign: 'center' },
  circleSub:  { fontSize: 11, color: '#6b7280', textAlign: 'center' },

  // Section
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },

  // Market table
  tableWrap: {
    backgroundColor: '#111827', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#1e293b',
  },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 7, backgroundColor: '#0f172a', gap: 4,
  },
  th: { fontSize: 9, fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  // Market row
  mktRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1e293b', gap: 8,
  },
  mktIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  mktEmoji: { fontSize: 15 },
  mktInfo: { flex: 1.4 },
  mktLabel: { fontSize: 11, fontWeight: '700', color: '#d1d5db' },
  mktCount: { fontSize: 10, color: '#6b7280', marginTop: 1 },
  mktBar: { flex: 2 },

  // How it works
  howBox: {
    backgroundColor: '#0d1f0d', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1a3a1a', marginBottom: 16, gap: 10,
  },
  howTitle: { fontSize: 12, fontWeight: '800', color: '#22c55e', letterSpacing: 0.3 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howIcon: { fontSize: 15, width: 22 },
  howText: { flex: 1, fontSize: 11, color: '#9ca3af', lineHeight: 17 },

  // Meta
  metaRow2: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  metaIcon2: { fontSize: 13 },
  metaText2: { fontSize: 11, color: '#6b7280' },

  disclaimer: { fontSize: 10, color: '#374151', fontStyle: 'italic', lineHeight: 14 },

  // States
  center:       { padding: 40, alignItems: 'center', gap: 12 },
  loadingText:  { color: '#9ca3af', fontSize: 13, textAlign: 'center' },
  seedSub:      { color: '#6b7280', fontSize: 11, textAlign: 'center', paddingHorizontal: 24 },
  emptyEmoji:   { fontSize: 48 },
  emptyTitle:   { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
  emptyText:    { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  retryBtn:     { backgroundColor: '#22c55e', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText:    { color: '#000', fontWeight: '800', fontSize: 13 },
});

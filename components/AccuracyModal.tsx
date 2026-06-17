import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Animated, Pressable,
} from 'react-native';
import { getAccuracyStats, seedHistoricalData, AccuracyStats } from '../services/predictionTracker';
import { colors } from '../constants/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// ─── Animated count-up number ─────────────────────────────────────────────────
function CountUp({ target, duration = 1200, suffix = '' }: { target: number; duration?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    const steps = 40;
    const step = duration / steps;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplay(Math.round((target * i) / steps));
      if (i >= steps) clearInterval(timer);
    }, step);
    return () => clearInterval(timer);
  }, [target]);
  return <Text>{display}{suffix}</Text>;
}

// ─── Animated horizontal bar ─────────────────────────────────────────────────
function AnimBar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 900,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct]);
  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });
  return (
    <View style={ab.bg}>
      <Animated.View style={[ab.fill, { width, backgroundColor: color }]} />
      <Text style={ab.label}>{pct}%</Text>
    </View>
  );
}
const ab = StyleSheet.create({
  bg: { flex: 1, height: 22, backgroundColor: '#1f2937', borderRadius: 11, overflow: 'hidden', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 11 },
  label: { fontSize: 11, fontWeight: '800', color: '#fff', textAlign: 'center', zIndex: 1 },
});

// ─── Pulsing ring around the big % ────────────────────────────────────────────
function PulsingRing({ pct }: { pct: number }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const ringColor = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <Animated.View style={[s.bigCircle, { borderColor: ringColor, transform: [{ scale: pulse }] }]}>
      <Text style={[s.bigPct, { color: ringColor }]}>{pct}%</Text>
      <Text style={s.bigLabel}>ACIERTOS</Text>
    </Animated.View>
  );
}

export default function AccuracyModal({ visible, onClose }: Props) {
  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = async () => {
    setLoading(true);
    fadeAnim.setValue(0);
    let data = await getAccuracyStats();

    // Auto-sembrar partidos históricos si la BD está vacía
    if (!data || data.total === 0) {
      setSeeding(true);
      await seedHistoricalData();
      setSeeding(false);
      data = await getAccuracyStats();
    }

    setStats(data);
    setLoading(false);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  useEffect(() => {
    if (visible) load();
  }, [visible]);

  const rows: { label: string; key: keyof Pick<AccuracyStats, 'victorias' | 'empates' | 'visitante'>; emoji: string; color: string; delay: number }[] = [
    { label: '1 · Victoria local',   key: 'victorias', emoji: '🏠', color: '#22c55e', delay: 300 },
    { label: 'X · Empate',           key: 'empates',   emoji: '🤝', color: '#f59e0b', delay: 500 },
    { label: '2 · Victoria visitante',key: 'visitante', emoji: '✈️', color: '#60a5fa', delay: 700 },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>

          {/* Handle bar */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>🎯 Precisión de la IA</Text>
            <TouchableOpacity onPress={load} style={s.refreshBtn} disabled={loading}>
              <Text style={[s.refreshText, loading && { opacity: 0.4 }]}>🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.headerSub}>
            Todas las competiciones · Victorias, empates y derrotas · Tiempo real global
          </Text>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={colors.accent.green} />
              <Text style={s.loadingText}>
                {seeding ? '⚡ Cargando partidos del Mundial 2026...' : 'Cargando estadísticas globales...'}
              </Text>
              {seeding && (
                <Text style={s.seedingSubText}>Generando predicciones de IA para los primeros 20 partidos</Text>
              )}
            </View>
          ) : stats && stats.total > 0 ? (
            <Animated.View style={{ opacity: fadeAnim }}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

                {/* Big circle */}
                <View style={s.circleWrap}>
                  <PulsingRing pct={stats.overallPct} />
                  <Text style={s.circleCount}>
                    <CountUp target={stats.correct} />{' '}de{' '}<CountUp target={stats.total} />{' '}partidos
                  </Text>
                </View>

                {/* V/X/D breakdown */}
                <View style={s.tableWrap}>
                  <View style={s.tableHeader}>
                    <Text style={[s.th, { flex: 1.8 }]}>Mercado</Text>
                    <Text style={s.th}>Pred.</Text>
                    <Text style={s.th}>Aciert.</Text>
                    <Text style={[s.th, { flex: 2 }]}>Precisión</Text>
                  </View>

                  {rows.map(r => {
                    const d = stats[r.key];
                    return (
                      <View key={r.key} style={s.tableRow}>
                        <View style={[s.emojiBox, { backgroundColor: r.color + '20' }]}>
                          <Text style={s.rowEmoji}>{r.emoji}</Text>
                        </View>
                        <View style={{ flex: 1.4 }}>
                          <Text style={s.rowLabel}>{r.label}</Text>
                        </View>
                        <Text style={s.rowStat}>{d.predicted}</Text>
                        <Text style={[s.rowStat, { color: r.color }]}>{d.correct}</Text>
                        <View style={{ flex: 2, paddingLeft: 6 }}>
                          <AnimBar pct={d.pct} color={r.color} delay={r.delay} />
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* How it works */}
                <View style={s.howBox}>
                  <Text style={s.howTitle}>¿Cómo funciona?</Text>
                  <View style={s.howRow}>
                    <Text style={s.howIcon}>🤖</Text>
                    <Text style={s.howText}>
                      Cada vez que cualquier usuario analiza un partido, la IA registra su pronóstico (V/X/D). Cuando el partido termina, se compara con el resultado real.
                    </Text>
                  </View>
                  <View style={s.howRow}>
                    <Text style={s.howIcon}>🌍</Text>
                    <Text style={s.howText}>
                      Las estadísticas son <Text style={s.howBold}>compartidas entre todos los usuarios</Text> en tiempo real. Todos veis exactamente el mismo porcentaje.
                    </Text>
                  </View>
                  <View style={s.howRow}>
                    <Text style={s.howIcon}>📅</Text>
                    <Text style={s.howText}>
                      Empezamos a contar desde el <Text style={s.howBold}>día 1 del Mundial 2026</Text>. Se acumula de forma permanente con cada nueva temporada y competición.
                    </Text>
                  </View>
                  <View style={s.howRow}>
                    <Text style={s.howIcon}>🏆</Text>
                    <Text style={s.howText}>
                      Incluye <Text style={s.howBold}>todas las competiciones</Text>: Mundial, LaLiga, Premier League, Bundesliga, Serie A, Ligue 1, Champions League, y las que se añadan en el futuro.
                    </Text>
                  </View>
                </View>

                {/* Footer meta */}
                <View style={s.metaBox}>
                  {stats.lastUpdated && (
                    <View style={s.metaRow}>
                      <Text style={s.metaIcon}>⏱️</Text>
                      <Text style={s.metaText}>
                        Actualizado: {stats.lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </Text>
                    </View>
                  )}
                  <View style={s.metaRow}>
                    <Text style={s.metaIcon}>📊</Text>
                    <Text style={s.metaText}>
                      Total analizado: {stats.total} partidos · {stats.correct} aciertos
                    </Text>
                  </View>
                </View>

                <Text style={s.disclaimer}>
                  * Contabiliza únicamente el pronóstico del resultado final (1X2). La IA puede acertar el resultado sin acertar el marcador exacto.
                </Text>
              </ScrollView>
            </Animated.View>
          ) : (
            <View style={s.center}>
              <Text style={s.emptyEmoji}>🎯</Text>
              <Text style={s.emptyTitle}>Aún no hay datos suficientes</Text>
              <Text style={s.emptyText}>
                Abre análisis de partidos para que la IA empiece a registrar sus predicciones. Los datos se comparten en tiempo real entre todos los usuarios.
              </Text>
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
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f172a', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 34, maxHeight: '88%',
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
  headerSub: { fontSize: 11, color: '#6b7280', paddingHorizontal: 20, marginBottom: 16 },
  refreshBtn: { padding: 6, marginRight: 4 },
  refreshText: { fontSize: 18 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#1f2937',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#9ca3af', fontSize: 13, fontWeight: '700' },

  content: { paddingHorizontal: 20, paddingBottom: 20 },

  // Big circle
  circleWrap: { alignItems: 'center', marginBottom: 28 },
  bigCircle: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 4, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#111827', marginBottom: 12,
    shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 12,
  },
  bigPct: { fontSize: 38, fontWeight: '900', lineHeight: 44 },
  bigLabel: { fontSize: 10, fontWeight: '800', color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase' },
  circleCount: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },

  // Table
  tableWrap: {
    backgroundColor: '#111827', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#1e293b', marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 8, backgroundColor: '#0f172a', gap: 4,
  },
  th: { fontSize: 9, fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: 0.5, width: 44, textAlign: 'center' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1e293b', gap: 4,
  },
  emojiBox: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 4,
  },
  rowEmoji: { fontSize: 14 },
  rowLabel: { fontSize: 11, fontWeight: '700', color: '#d1d5db' },
  rowStat: { width: 44, fontSize: 12, fontWeight: '800', color: '#9ca3af', textAlign: 'center' },

  // Meta box
  metaBox: {
    backgroundColor: '#111827', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#1e293b', marginBottom: 16, gap: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaIcon: { fontSize: 14, width: 22 },
  metaText: { flex: 1, fontSize: 11, color: '#6b7280', lineHeight: 16 },

  // How it works
  howBox: {
    backgroundColor: '#0d1f0d', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#1a3a1a', marginBottom: 16, gap: 12,
  },
  howTitle: { fontSize: 12, fontWeight: '800', color: '#22c55e', letterSpacing: 0.3, marginBottom: 4 },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  howIcon: { fontSize: 16, width: 22 },
  howText: { flex: 1, fontSize: 12, color: '#9ca3af', lineHeight: 17 },
  howBold: { color: '#e5e7eb', fontWeight: '700' },

  disclaimer: { fontSize: 10, color: '#374151', fontStyle: 'italic', lineHeight: 14 },

  // Empty/loading states
  center: { padding: 40, alignItems: 'center', gap: 12 },
  loadingText: { color: '#9ca3af', fontSize: 13, textAlign: 'center' },
  seedingSubText: { color: '#6b7280', fontSize: 11, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
  emptyText: { fontSize: 12, color: '#6b7280', textAlign: 'center', lineHeight: 18 },
  retryBtn: { backgroundColor: '#22c55e', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  retryText: { color: '#000', fontWeight: '800', fontSize: 13 },
});

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { colors } from '@/constants/colors';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { FREE_LIMITS } from '@/services/supabase';
import { espnMatchService } from '@/services/espnMatchService';
import { sportsDbService } from '@/services/sportsDbService';

// Build a real-time snapshot of live / today's matches to feed the chat IA.
async function buildLiveSnapshot(): Promise<string> {
  try {
    const matches = await espnMatchService.getMatches('FIFA.WORLD');
    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    const live = matches.filter(m => m.status === 'live');
    const finishedToday = matches.filter(m => m.status === 'finished' && (m.date || '').slice(0, 10) === todayStr);
    const upcomingToday = matches.filter(m => m.status === 'upcoming' && (m.date || '').slice(0, 10) === todayStr);

    const lines: string[] = [];

    // Live matches: enrich with minute + scorers
    for (const m of live.slice(0, 6)) {
      let extra = '';
      try {
        const ld = await sportsDbService.getLiveMatchScore(m.id);
        const evs = await sportsDbService.getMatchEvents(m.id, m.homeTeam, m.awayTeam);
        const goals = evs.filter(e => e.type === 'goal' || e.type === 'penalty')
          .map(e => `${e.player} ${e.minute}'`).join(', ');
        const min = ld?.minute != null ? ` (min ${ld.minute}')` : '';
        extra = `${min}${goals ? ` — goles: ${goals}` : ''}`;
      } catch {}
      lines.push(`🔴 EN VIVO: ${m.homeTeam} ${m.homeScore ?? 0}-${m.awayScore ?? 0} ${m.awayTeam}${extra}`);
    }
    for (const m of finishedToday.slice(0, 8)) {
      lines.push(`✅ FINAL hoy: ${m.homeTeam} ${m.homeScore ?? 0}-${m.awayScore ?? 0} ${m.awayTeam}`);
    }
    for (const m of upcomingToday.slice(0, 8)) {
      const t = new Date(m.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      lines.push(`🕐 HOY ${t}: ${m.homeTeam} vs ${m.awayTeam}`);
    }
    void now;
    return lines.join('\n');
  } catch {
    return '';
  }
}

// ─── Renderizador de mensajes IA ──────────────────────────────────────────────
function MessageRenderer({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <View style={{ gap: 1 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Línea vacía → pequeño espacio
        if (!trimmed) {
          return <View key={i} style={{ height: 6 }} />;
        }

        // Separador visual ──────
        if (/^─{3,}/.test(trimmed) || /^-{3,}/.test(trimmed) || /^={3,}/.test(trimmed)) {
          return (
            <View key={i} style={msgStyles.divider} />
          );
        }

        // Sección en MAYÚSCULAS con emoji al inicio (ej: "⚽ GOLES ESPERADOS:")
        const isSectionHeader =
          /^[🎯⚽🏆💰📊🔴✅❌🟨🚩⚠️🎽♟️🔥📅🤖💬🏴🇦🇷🇪🇸🇩🇪🇫🇷🇧🇷🇵🇹]/.test(trimmed) &&
          trimmed === trimmed.toUpperCase().replace(/[^A-ZÁÉÍÓÚÜÑ0-9\s:·|%+\-,.()🎯⚽🏆💰📊🔴✅❌🟨🚩⚠️🎽♟️🔥📅🤖💬🏴🇦🇷🇪🇸🇩🇪🇫🇷🇧🇷🇵🇹]/g, '');

        // Título de sección: línea que termina en ":" y empieza con emoji o mayúsculas
        const isTitleLine =
          (trimmed.endsWith(':') && trimmed.length < 60) ||
          (/^[🎯⚽🏆💰📊🔴✅❌🟨🚩⚠️🎽♟️🔥📅🇦🇷🇪🇸🇩🇪🇫🇷🇧🇷🇵🇹🇲🇽🇦🇩🇬🇧🇵🇴🇧🇪🇸🇪🇦🇺🇺🇾🏴]/.test(trimmed) &&
            /[A-ZÁÉÍÓÚ]{3,}/.test(trimmed) &&
            trimmed.length < 70);

        if (isTitleLine) {
          return (
            <View key={i} style={msgStyles.sectionTitleWrap}>
              <Text style={msgStyles.sectionTitle}>{trimmed}</Text>
            </View>
          );
        }

        // Tabla/datos: líneas con múltiples espacios o separadores |
        if (trimmed.includes('   ') || (trimmed.includes('|') && trimmed.includes('%'))) {
          return (
            <View key={i} style={msgStyles.tableRow}>
              <Text style={msgStyles.tableText}>{trimmed}</Text>
            </View>
          );
        }

        // Bullet •  →  ─
        if (/^[•→\-✅❌]/.test(trimmed)) {
          const isBold = trimmed.includes('MEJOR APUESTA') || trimmed.includes('valor') || trimmed.includes('Valor');
          return (
            <View key={i} style={msgStyles.bulletRow}>
              <Text style={msgStyles.bulletText}>{trimmed}</Text>
            </View>
          );
        }

        // Línea con cuota/dato numérico clave (ej: "Cuota: 1.85  |  Prob: 58%")
        if (trimmed.includes('@') && trimmed.match(/\d+\.\d+/)) {
          return (
            <View key={i} style={msgStyles.dataRow}>
              <Text style={msgStyles.dataText}>{trimmed}</Text>
            </View>
          );
        }

        // Texto normal
        return (
          <Text key={i} style={msgStyles.normalText} selectable>
            {trimmed}
          </Text>
        );
      })}
    </View>
  );
}

const msgStyles = StyleSheet.create({
  divider: {
    height: 1,
    backgroundColor: colors.border.subtle,
    marginVertical: 6,
    borderRadius: 1,
  },
  sectionTitleWrap: {
    marginTop: 8,
    marginBottom: 2,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: colors.accent.green + '40',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent.green,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  tableRow: {
    backgroundColor: colors.bg.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginVertical: 1,
  },
  tableText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: colors.text.primary,
  },
  bulletRow: {
    paddingLeft: 4,
    marginVertical: 1,
  },
  bulletText: {
    fontSize: 12,
    color: colors.text.primary,
    lineHeight: 18,
  },
  dataRow: {
    backgroundColor: colors.accent.gold + '18',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 2,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.gold,
  },
  dataText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.primary,
  },
  normalText: {
    fontSize: 13,
    color: colors.text.primary,
    lineHeight: 19,
  },
});

function PulsingDot({ delay = 0 }: { delay?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])).start();
    }, delay);
  }, []);
  return <Animated.View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#22c55e', opacity }} />;
}

export default function IAScreen() {
  const { messages, loading, sendMessage, clearMessages, generateDynamicSuggestions } = useChat();
  const { user, isAuthenticated, isPremium, dailyUsage, trackChat, setShowLoginModal } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const liveSnapshotRef = useRef<string>('');
  const headerBg = useRef(new Animated.Value(0)).current;

  const chatLeft = (isPremium || !user) ? Infinity : Math.max(0, FREE_LIMITS.chat_messages - dailyUsage.chat_messages);

  // Genera sugerencias dinámicas al cargar + animación del header
  useEffect(() => {
    setLoadingSuggestions(true);
    buildLiveSnapshot()
      .then(snap => { liveSnapshotRef.current = snap; return generateDynamicSuggestions(snap); })
      .then(s => setSuggestions(s))
      .finally(() => setLoadingSuggestions(false));
    Animated.loop(Animated.sequence([
      Animated.timing(headerBg, { toValue: 1, duration: 3000, useNativeDriver: false }),
      Animated.timing(headerBg, { toValue: 0, duration: 3000, useNativeDriver: false }),
    ])).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages, loading]);

  // ─── Real-time live snapshot for the chat (refreshes every 45s) ─────────────
  useEffect(() => {
    let alive = true;
    const refresh = () => buildLiveSnapshot().then(s => { if (alive) liveSnapshotRef.current = s; }).catch(() => {});
    refresh();
    const id = setInterval(refresh, 45 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || loading) return;
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    const ok = await trackChat();
    if (!ok) return;
    setInputText('');
    // Refresh the snapshot right before sending so scores are current
    try { liveSnapshotRef.current = await buildLiveSnapshot(); } catch {}
    await sendMessage(text, liveSnapshotRef.current);
  };

  const handleSuggestion = async (q: string) => {
    if (loading) return;
    if (!isAuthenticated) { setShowLoginModal(true); return; }
    const ok = await trackChat();
    if (!ok) return;
    setInputText('');
    try { liveSnapshotRef.current = await buildLiveSnapshot(); } catch {}
    await sendMessage(q, liveSnapshotRef.current);
  };

  return (
    <SafeAreaView style={styles.root}>
      <Animated.View style={[styles.header, {
        backgroundColor: headerBg.interpolate({ inputRange: [0, 1], outputRange: ['#0a1628', '#0d1f10'] }),
      }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              {[0, 1, 2].map(i => <PulsingDot key={i} delay={i * 300} />)}
            </View>
            <Text style={styles.subtitle}>Analista IA · jugadores · equipos · partidos</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />
            <Text style={{ fontSize: 9, color: '#22c55e', fontWeight: '700', letterSpacing: 1 }}>IA ACTIVA</Text>
          </View>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearMessages} disabled={loading} style={styles.clearBtnWrap}>
            <Text style={styles.clearText}>🗑 Limpiar</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesScroll}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {messages.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🤖</Text>
              <Text style={styles.emptyTitle}>WikiBet IA</Text>
              <Text style={styles.emptySubtitle}>
                Analista experto con datos en tiempo real del Mundial 2026 y ligas europeas
              </Text>

              {/* Badge live mundial */}
              <View style={styles.latestResultBadge}>
                <Text style={styles.latestResultText}>
                  🤖 IA activa · Pregunta lo que quieras
                </Text>
              </View>

              <Text style={styles.suggestLabel}>
                {loadingSuggestions ? '🤖 Generando preguntas del día...' : '💬 Preguntas de hoy:'}
              </Text>

              {loadingSuggestions ? (
                <View style={styles.loadingSugg}>
                  <ActivityIndicator size="small" color={colors.accent.green} />
                  <Text style={styles.loadingSuggText}>La IA está eligiendo las mejores preguntas para hoy...</Text>
                </View>
              ) : (
                suggestions.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggBtn}
                    onPress={() => handleSuggestion(q)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggText}>{q}</Text>
                    <Text style={styles.suggArrow}>→</Text>
                  </TouchableOpacity>
                ))
              )}

              <TouchableOpacity
                style={styles.refreshSuggBtn}
                onPress={() => {
                  setLoadingSuggestions(true);
                  generateDynamicSuggestions()
                    .then(s => setSuggestions(s))
                    .finally(() => setLoadingSuggestions(false));
                }}
                disabled={loadingSuggestions}
              >
                <Text style={styles.refreshSuggText}>🔄 Nuevas preguntas</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {messages.map((msg, i) => (
                <View
                  key={i}
                  style={[
                    styles.msgRow,
                    msg.role === 'user' ? styles.msgRowUser : styles.msgRowAI,
                  ]}
                >
                  {msg.role === 'assistant' && <Text style={styles.msgAvatar}>🤖</Text>}
                  <View
                    style={[
                      styles.bubble,
                      msg.role === 'user' ? styles.bubbleUser : styles.bubbleAI,
                    ]}
                  >
                    {msg.role === 'user' ? (
                      <Text style={[styles.bubbleText, styles.bubbleTextUser]} selectable>
                        {msg.content}
                      </Text>
                    ) : (
                      <MessageRenderer text={msg.content} />
                    )}
                  </View>
                </View>
              ))}
              {loading && (
                <View style={[styles.msgRow, styles.msgRowAI]}>
                  <Text style={styles.msgAvatar}>🤖</Text>
                  <View style={[styles.bubble, styles.bubbleAI, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <ActivityIndicator size="small" color={colors.accent.green} />
                    <Text style={[styles.bubbleText, styles.bubbleTextAI, { color: colors.text.muted }]}>
                      Analizando...
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Usage bar */}
        {user && !isPremium && (
          <View style={styles.usageBar}>
            <Text style={[styles.usageBarText, chatLeft === 0 && { color: colors.accent.red }]}>
              {chatLeft === 0
                ? '🔒 Límite semanal alcanzado · Actualiza a Premium+'
                : `💬 ${chatLeft} mensaje${chatLeft === 1 ? '' : 's'} restante${chatLeft === 1 ? '' : 's'} hoy`}
            </Text>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Pregunta por un partido, equipo o apuesta..."
            placeholderTextColor={colors.text.muted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            editable={!loading}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (loading || !inputText.trim()) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={loading || !inputText.trim()}
          >
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.primary },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1a2f1a',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text.primary },
  subtitle: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
  clearText: { fontSize: 12, color: colors.accent.red, fontWeight: '600' },
  clearBtnWrap: { paddingLeft: 8 },
  messagesScroll: { flex: 1 },
  messagesContent: { padding: 12, paddingBottom: 16 },
  emptyBox: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text.primary, marginBottom: 6 },
  emptySubtitle: {
    fontSize: 13, color: colors.text.muted, textAlign: 'center',
    marginBottom: 16, lineHeight: 18,
  },
  latestResultBadge: {
    backgroundColor: colors.accent.green + '20', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 8, marginBottom: 20,
    borderWidth: 1, borderColor: colors.accent.green + '40',
  },
  latestResultText: { fontSize: 12, fontWeight: '700', color: colors.accent.green, textAlign: 'center' },
  suggestLabel: {
    fontSize: 12, color: colors.text.muted, fontWeight: '700',
    alignSelf: 'flex-start', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  loadingSugg: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  loadingSuggText: { fontSize: 12, color: colors.text.muted, textAlign: 'center', fontStyle: 'italic' },
  suggBtn: {
    backgroundColor: colors.bg.card, borderRadius: 10, padding: 12,
    marginVertical: 4, borderWidth: 1, borderColor: colors.border.subtle, width: '100%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
  },
  suggText: { color: colors.text.primary, fontSize: 13, flex: 1, lineHeight: 18 },
  suggArrow: { color: colors.accent.green, fontSize: 16, fontWeight: 'bold' },
  refreshSuggBtn: {
    marginTop: 14, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: colors.border.subtle,
    backgroundColor: colors.bg.card,
  },
  refreshSuggText: { fontSize: 12, color: colors.text.muted, fontWeight: '600' },
  msgRow: { flexDirection: 'row', marginVertical: 5, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAI: { justifyContent: 'flex-start' },
  msgAvatar: { fontSize: 18, marginRight: 6, marginBottom: 2 },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 10 },
  bubbleUser: { backgroundColor: colors.accent.green, borderBottomRightRadius: 4 },
  bubbleAI: {
    backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.medium,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 13, lineHeight: 20 },
  bubbleTextUser: { color: colors.bg.primary, fontWeight: '500' },
  bubbleTextAI: { color: colors.text.primary },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.bg.card, borderTopWidth: 1, borderTopColor: colors.border.subtle,
  },
  input: {
    flex: 1, backgroundColor: colors.bg.primary, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: colors.text.primary,
    borderWidth: 1, borderColor: colors.border.subtle,
    maxHeight: 120, minHeight: 44, fontSize: 13,
  },
  sendBtn: {
    backgroundColor: colors.accent.green, width: 44, height: 44,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: colors.bg.primary, fontWeight: 'bold', fontSize: 20 },
  usageBar: {
    backgroundColor: colors.bg.card, paddingHorizontal: 16, paddingVertical: 6,
    borderTopWidth: 1, borderTopColor: colors.border.subtle,
  },
  usageBarText: { fontSize: 12, color: colors.text.muted, textAlign: 'center', fontWeight: '600' },
});

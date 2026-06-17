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
} from 'react-native';
import { colors } from '@/constants/colors';
import { useChat } from '@/hooks/useChat';

export default function IAScreen() {
  const { messages, loading, sendMessage, clearMessages, generateDynamicSuggestions } = useChat();
  const scrollRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  // Genera sugerencias dinámicas al cargar
  useEffect(() => {
    setLoadingSuggestions(true);
    generateDynamicSuggestions()
      .then(s => setSuggestions(s))
      .finally(() => setLoadingSuggestions(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || loading) return;
    setInputText('');
    await sendMessage(text);
  };

  const handleSuggestion = async (q: string) => {
    if (loading) return;
    setInputText('');
    await sendMessage(q);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🤖 Chat IA</Text>
          <Text style={styles.subtitle}>Analista deportivo · Mundial 2026 · Apuestas</Text>
        </View>
        {messages.length > 0 && (
          <TouchableOpacity onPress={clearMessages} disabled={loading}>
            <Text style={styles.clearText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

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

              {/* Badge resultado del día */}
              <View style={styles.latestResultBadge}>
                <Text style={styles.latestResultText}>
                  🔥 Último: 🇦🇷 Argentina 3-0 🇩🇿 Argelia — Messi HAT-TRICK
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
                    <Text
                      style={[
                        styles.bubbleText,
                        msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAI,
                      ]}
                      selectable
                    >
                      {msg.content}
                    </Text>
                  </View>
                </View>
              ))}
              {loading && (
                <View style={[styles.msgRow, styles.msgRowAI]}>
                  <Text style={styles.msgAvatar}>🤖</Text>
                  <View style={[styles.bubble, styles.bubbleAI, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                    <ActivityIndicator size="small" color={colors.accent.green} />
                    <Text style={[styles.bubbleText, styles.bubbleTextAI, { color: colors.text.muted }]}>
                      Analizando con datos del Mundial 2026...
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

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
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text.primary },
  subtitle: { fontSize: 11, color: colors.text.muted, marginTop: 2 },
  clearText: { fontSize: 12, color: colors.accent.red, fontWeight: '600' },
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
});

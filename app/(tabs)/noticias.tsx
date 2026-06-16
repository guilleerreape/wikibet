import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { colors } from '@/constants/colors';
import { realNewsService, RealNews } from '@/services/realNewsService';
import { NewsCard } from '@/components/NewsCard';

const CLAUDE_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
const CLAUDE_URL = 'https://api.anthropic.com/v1/messages';

type FilterType = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface AINewsAnalysis {
  resumen: string;
  comentarios: Array<{ noticia: string; analisis: string; impactoApuesta: string }>;
  conclusion: string;
}

async function analyzeNewsWithAI(news: RealNews[]): Promise<AINewsAnalysis | null> {
  if (!CLAUDE_API_KEY) return null;

  const topNews = news.filter(n => n.impact === 'HIGH').slice(0, 3);
  if (topNews.length === 0) return null;

  const newsText = topNews
    .map((n, i) => `Noticia ${i + 1}: "${n.title}" — ${n.description}`)
    .join('\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    const res = await fetch(CLAUDE_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `Eres un analista de apuestas deportivas experto. Analiza estas noticias del Mundial 2026 en ESPAÑOL y explica su impacto en las apuestas. Responde en JSON estricto con esta estructura exacta:
{
  "resumen": "Resumen general en 1-2 frases",
  "comentarios": [
    {"noticia": "título corto", "analisis": "análisis en 2 frases", "impactoApuesta": "qué apuestas se ven afectadas"}
  ],
  "conclusion": "Conclusión con la apuesta más recomendada basada en estas noticias"
}

NOTICIAS:
${newsText}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.`,
        }],
      }),
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]) as AINewsAnalysis;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

function getLocalAIAnalysis(news: RealNews[]): AINewsAnalysis {
  const topNews = news.filter(n => n.impact === 'HIGH').slice(0, 3);
  return {
    resumen: 'Análisis basado en las noticias de mayor impacto del Mundial 2026. Varias lesiones y novedades tácticas pueden alterar los pronósticos.',
    comentarios: topNews.map(n => ({
      noticia: n.title,
      analisis: `${n.bettingImpact} Esta novedad puede cambiar las probabilidades del partido relacionado.`,
      impactoApuesta: n.category === 'injury' ? 'Cuotas de victoria y Over/Under afectadas' :
        n.category === 'suspension' ? 'Mercado de resultados alterado por baja clave' :
          'Mercado de goles puede verse afectado',
    })),
    conclusion: 'Revisa las cuotas en tiempo real antes de apostar. Las lesiones de últimas horas son el factor de mayor impacto esta jornada.',
  };
}

export default function NoticiasScreen() {
  const [allNews, setAllNews] = useState<RealNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AINewsAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchNews = useCallback(async () => {
    realNewsService.invalidateCache();
    const data = await realNewsService.getNews();
    setAllNews(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNews();
    // Auto-refresh cada 60 segundos
    const interval = setInterval(fetchNews, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  const filteredNews = useMemo(() => {
    if (selectedFilter === 'ALL') return allNews;
    return allNews.filter(n => n.impact === selectedFilter);
  }, [selectedFilter, allNews]);

  const impactCounts = useMemo(() => ({
    HIGH: allNews.filter(n => n.impact === 'HIGH').length,
    MEDIUM: allNews.filter(n => n.impact === 'MEDIUM').length,
    LOW: allNews.filter(n => n.impact === 'LOW').length,
  }), [allNews]);

  const openAIOverlay = async () => {
    setAiModalVisible(true);
    if (aiAnalysis) return;
    setAiLoading(true);
    const result = await analyzeNewsWithAI(allNews);
    setAiAnalysis(result || getLocalAIAnalysis(allNews));
    setAiLoading(false);
  };

  const FilterButton = ({ label, value, count }: { label: string; value: FilterType; count: number }) => (
    <TouchableOpacity
      style={[styles.filterBtn, selectedFilter === value && styles.filterBtnActive]}
      onPress={() => setSelectedFilter(value)}
    >
      <Text style={[styles.filterText, selectedFilter === value && styles.filterTextActive]}>
        {label} ({count})
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Noticias Mundial 2026</Text>
        <Text style={styles.subtitle}>Impacto en apuestas · Lesiones · Suspensiones</Text>
      </View>

      <View style={styles.filterRow}>
        <FilterButton label="Todas" value="ALL" count={allNews.length} />
        <FilterButton label="🔴 Alta" value="HIGH" count={impactCounts.HIGH} />
        <FilterButton label="🟡 Media" value="MEDIUM" count={impactCounts.MEDIUM} />
        <FilterButton label="🔵 Baja" value="LOW" count={impactCounts.LOW} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.green} />
          <Text style={styles.loadingText}>Cargando noticias...</Text>
        </View>
      ) : filteredNews.length > 0 ? (
        <FlatList
          data={filteredNews}
          renderItem={({ item }) => <NewsCard news={item} containerStyle={styles.card} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay noticias en esta categoría</Text>
        </View>
      )}

      {/* Botón IA flotante */}
      {!loading && (
        <TouchableOpacity style={styles.aiFab} onPress={openAIOverlay} activeOpacity={0.85}>
          <Text style={styles.aiFabText}>🤖 Análisis IA</Text>
        </TouchableOpacity>
      )}

      {/* Modal análisis IA */}
      <Modal visible={aiModalVisible} transparent animationType="slide">
        <SafeAreaView style={styles.aiModalBg}>
          <View style={styles.aiModalHeader}>
            <Pressable onPress={() => setAiModalVisible(false)}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
            <Text style={styles.aiModalTitle}>🤖 Análisis IA de Noticias</Text>
            <View style={{ width: 30 }} />
          </View>

          {aiLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.accent.green} />
              <Text style={styles.loadingText}>Claude está analizando las noticias...</Text>
              <Text style={[styles.loadingText, { fontSize: 11, marginTop: 4 }]}>
                Evaluando impacto en pronósticos y apuestas
              </Text>
            </View>
          ) : aiAnalysis ? (
            <ScrollView style={styles.aiScroll}>
              {/* Resumen */}
              <View style={styles.aiSection}>
                <Text style={styles.aiSectionTitle}>📋 Resumen Ejecutivo</Text>
                <Text style={styles.aiBodyText}>{aiAnalysis.resumen}</Text>
              </View>

              {/* Comentarios por noticia */}
              {aiAnalysis.comentarios.map((c, i) => (
                <View key={i} style={styles.aiCard}>
                  <Text style={styles.aiCardTitle}>{c.noticia}</Text>
                  <Text style={styles.aiCardAnalysis}>{c.analisis}</Text>
                  <View style={styles.aiImpactBadge}>
                    <Text style={styles.aiImpactText}>💰 {c.impactoApuesta}</Text>
                  </View>
                </View>
              ))}

              {/* Conclusión */}
              <View style={[styles.aiSection, { borderLeftWidth: 4, borderLeftColor: colors.accent.green, paddingLeft: 12 }]}>
                <Text style={styles.aiSectionTitle}>✅ Conclusión IA</Text>
                <Text style={styles.aiBodyText}>{aiAnalysis.conclusion}</Text>
              </View>

              <Text style={styles.disclaimer}>
                * Análisis generado por IA con fines informativos. Apuesta con responsabilidad.
              </Text>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle, alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text.primary },
  subtitle: { fontSize: 12, color: colors.text.muted, marginTop: 4, textAlign: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 10, gap: 6 },
  filterBtn: {
    flex: 1, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6,
    backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.subtle,
  },
  filterBtnActive: { backgroundColor: colors.accent.green, borderColor: colors.accent.green },
  filterText: { color: colors.text.primary, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  filterTextActive: { color: colors.bg.primary, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { color: colors.text.muted, fontSize: 13, textAlign: 'center' },
  emptyText: { color: colors.text.muted, fontSize: 14 },
  list: { paddingHorizontal: 8, paddingVertical: 8, paddingBottom: 90 },
  card: { marginHorizontal: 4 },
  // FAB
  aiFab: {
    position: 'absolute', bottom: 24, right: 16,
    backgroundColor: colors.accent.green, borderRadius: 28,
    paddingHorizontal: 18, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 8,
  },
  aiFabText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  // AI Modal
  aiModalBg: { flex: 1, backgroundColor: colors.bg.primary },
  aiModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  closeBtn: { fontSize: 22, color: colors.text.primary, fontWeight: 'bold' },
  aiModalTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 'bold', color: colors.text.primary },
  aiScroll: { padding: 14 },
  aiSection: { marginBottom: 16 },
  aiSectionTitle: {
    fontSize: 13, fontWeight: '800', color: colors.text.primary,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  aiBodyText: { fontSize: 13, color: colors.text.primary, lineHeight: 19 },
  aiCard: {
    backgroundColor: colors.bg.card, borderRadius: 10, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border.subtle,
  },
  aiCardTitle: { fontSize: 13, fontWeight: 'bold', color: colors.text.primary, marginBottom: 6 },
  aiCardAnalysis: { fontSize: 12, color: colors.text.primary, lineHeight: 17, marginBottom: 8 },
  aiImpactBadge: {
    backgroundColor: colors.accent.gold + '20', borderRadius: 6,
    padding: 8, borderWidth: 1, borderColor: colors.accent.gold + '40',
  },
  aiImpactText: { fontSize: 11, color: colors.accent.gold, fontWeight: '600' },
  disclaimer: { fontSize: 10, color: colors.text.muted, marginTop: 16, marginBottom: 24, fontStyle: 'italic' },
});

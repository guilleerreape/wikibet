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

async function analyzeNewsWithAI(news: RealNews[], todayMatches?: string): Promise<AINewsAnalysis | null> {
  if (!CLAUDE_API_KEY) return null;

  const topNews = news.filter(n => n.impact === 'HIGH').slice(0, 4);
  if (topNews.length === 0) return null;

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const newsText = topNews
    .map((n, i) => `[${i + 1}] "${n.title}"\n${n.description}\nEquipos: ${n.teams.join(', ') || 'varios'}\nImpacto apuestas: ${n.bettingImpact}`)
    .join('\n\n---\n\n');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 16000);

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Eres el analista de apuestas deportivas más preciso del mundo. Hoy es ${today}, Mundial 2026 en plena fase de grupos.

Analiza ESTAS NOTICIAS ESPECÍFICAS con datos concretos y dame recomendaciones de apuesta PRECISAS (no genéricas).

Para cada noticia debes:
1. Identificar el partido o partidos afectados y CUÁNDO se juegan
2. Decir exactamente qué baja o novedad táctica impacta
3. Dar UNA apuesta concreta con cuota estimada (p.ej: "Victoria Francia @1.65", "Over 2.5 goles @1.90")
4. Explicar por qué esa cuota tiene valor ahora mismo

En la conclusión: da LA MEJOR APUESTA del día con cuota aproximada, porcentaje de confianza y razonamiento de 2 líneas.

Responde SOLO con JSON:
{
  "resumen": "2 frases MUY CONCRETAS sobre el panorama de hoy: qué equipos tienen ventaja/desventaja por estas noticias",
  "comentarios": [
    {
      "noticia": "título de la noticia",
      "analisis": "análisis específico: qué partido afecta, cuándo, qué jugador/cambio, qué probabilidades cambian",
      "impactoApuesta": "apuesta CONCRETA con cuota y razonamiento. Ej: Over 2.5 Francia-Senegal @1.85 — sin Mané Senegal pierde su referencia atacante"
    }
  ],
  "conclusion": "APUESTA TOP: [selección] @ [cuota estimada] — Confianza X% — [razonamiento de 2 líneas con datos específicos]"
}

NOTICIAS ESPECÍFICAS DE HOY (${today}):
${newsText}
${todayMatches ? `\n\nFIXTURES DE HOY Y PRÓXIMOS DÍAS (usa estos datos para hacer análisis CONCRETOS):\n${todayMatches}` : ''}

IMPORTANTE: Responde SOLO con JSON. Sé CONCRETO con nombres, cuotas y partidos reales. NADA GENÉRICO.`,
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
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  return {
    resumen: `Análisis prospectivo para ${today}: Las noticias de hoy apuntan a varios factores que moverán las cuotas en los próximos partidos. Lesiones y cambios tácticos de última hora son los elementos clave a vigilar.`,
    comentarios: topNews.map(n => ({
      noticia: n.title,
      analisis: `${n.bettingImpact} Esto puede cambiar significativamente las probabilidades de los próximos encuentros de estos equipos.`,
      impactoApuesta: n.category === 'injury'
        ? 'Cuotas de victoria y Over/Under afectadas — valor en el rival si la baja es titular'
        : n.category === 'suspension'
        ? 'Mercado 1X2 alterado — busca valor en el equipo con el once completo'
        : n.category === 'tactical'
        ? 'Atención al mercado de goles — formaciones ofensivas inflan el Over'
        : 'Mercado de goles y resultado directo pueden tener valor',
    })),
    conclusion: 'APUESTA DEL DÍA: Revisa las cuotas en tiempo real antes de cada partido. Las bajas confirmadas en las últimas 2 horas antes del partido son el mayor movedor de mercado. Busca Over/Under y handicap asiático cuando haya bajas de delanteros clave.',
  };
}

export default function NoticiasScreen() {
  const [allNews, setAllNews] = useState<RealNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('ALL');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AINewsAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = useCallback(async () => {
    realNewsService.invalidateCache();
    const data = await realNewsService.getNews();
    setAllNews(data);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNews();
    // Auto-refresh cada 5 minutos
    const interval = setInterval(fetchNews, 5 * 60 * 1000);
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

    // Get today's matches for context
    let todayMatchesStr = '';
    try {
      const { espnMatchService } = await import('@/services/espnMatchService');
      const allMatches = await espnMatchService.getMatches('FIFA.WORLD');
      const now = new Date();
      const soon = allMatches
        .filter(m => {
          const d = new Date(m.date);
          const diff = (d.getTime() - now.getTime()) / 3600000;
          return diff > -24 && diff < 72 && m.status !== 'finished';
        })
        .slice(0, 8);
      const recent = allMatches
        .filter(m => m.status === 'finished')
        .slice(-6);
      const all = [...recent, ...soon];
      todayMatchesStr = all.map(m => {
        const d = new Date(m.date);
        const dateStr = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        const score = m.homeScore !== null ? `${m.homeScore}-${m.awayScore}` : 'Por jugar';
        return `• ${m.homeTeam} vs ${m.awayTeam} [${m.league}] — ${dateStr} — ${score}`;
      }).join('\n');
    } catch {}

    const result = await analyzeNewsWithAI(allNews, todayMatchesStr);
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
      <View style={{
        paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8,
        borderBottomWidth: 1, borderBottomColor: '#1f2937',
        backgroundColor: '#0a1628',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Text style={{ fontSize: 11, color: '#4b5563', fontWeight: '600' }}>
          {allNews.length} noticias · Mundial 2026
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {lastUpdated && (
            <Text style={{ fontSize: 9, color: '#6b7280' }}>
              🔄 {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' }} />
            <Text style={{ fontSize: 9, color: '#22c55e', fontWeight: '700' }}>EN VIVO</Text>
          </View>
          {allNews.filter(n => n.impact === 'HIGH').length > 0 && (
            <View style={{ backgroundColor: '#7f1d1d', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: '#fca5a5', fontWeight: '700' }}>
                🔴 {allNews.filter(n => n.impact === 'HIGH').length} URG.
              </Text>
            </View>
          )}
        </View>
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
  subHeader: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle, alignItems: 'center',
  },
  subtitle: { fontSize: 12, color: colors.text.muted, textAlign: 'center' },
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

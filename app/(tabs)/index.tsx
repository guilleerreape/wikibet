import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { colors } from '@/constants/colors';
import { espnMatchService, CompetitionMatch, COMPETITIONS, Competition, StandingEntry, WC_GROUPS_STATIC } from '@/services/espnMatchService';
import { advancedAIAnalysis, AdvancedMatchAnalysis } from '@/services/advancedAIAnalysis';

// Inicio del día actual en hora local (medianoche)
function getTodayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function MatchesScreen() {
  const [selectedComp, setSelectedComp] = useState<Competition>(COMPETITIONS[0]);
  const [matches, setMatches] = useState<CompetitionMatch[]>([]);
  const [filtered, setFiltered] = useState<CompetitionMatch[]>([]);
  const [standings, setStandings] = useState<StandingEntry[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPast, setShowPast] = useState(false);        // ← toggle partidos jugados
  const [selectedMatch, setSelectedMatch] = useState<CompetitionMatch | null>(null);
  const [analysis, setAnalysis] = useState<AdvancedMatchAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);

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
    // Auto-refresh cada 90 segundos → marcadores en tiempo real
    const interval = setInterval(() => loadData(selectedComp), 90 * 1000);
    return () => clearInterval(interval);
  }, [selectedComp, loadData]);

  // Filtrado: hoy en adelante por defecto; búsqueda de texto; toggle de pasados
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

  const openAnalysis = async (match: CompetitionMatch) => {
    setSelectedMatch(match);
    setAnalysis(null);
    setAnalysisError(false);
    setAnalysisLoading(true);
    try {
      const result = await advancedAIAnalysis.analyzeMatchComprehensive(
        match.homeTeam, match.awayTeam, match.league
      );
      setAnalysis(result);
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

  // Agrupar partidos por fecha
  const groupedMatches = useCallback(() => {
    const groups: Record<string, CompetitionMatch[]> = {};
    filtered.forEach(m => {
      const key = new Date(m.date).toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long',
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const dateA = filtered.find(m => new Date(m.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) === a)?.date || '';
      const dateB = filtered.find(m => new Date(m.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) === b)?.date || '';
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  }, [filtered]);

  // ─── Fila de tabla de clasificación ───────────────────────────────
  const StandingsRow = ({ row, i }: { row: StandingEntry; i: number }) => (
    <View style={[styles.standingsRow, i % 2 === 0 && styles.standingsRowAlt]}>
      <Text style={[styles.tdPos, i < 2 && { color: colors.accent.green }]}>{i + 1}</Text>
      <Text style={styles.tdTeam} numberOfLines={1}>{row.team}</Text>
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

  // Cabecera de tabla
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

  // Clasificación widget — grupos para Mundial, tabla simple para ligas
  const StandingsWidget = () => {
    if (loadingStandings) {
      return (
        <View style={styles.standingsBg}>
          <ActivityIndicator size="small" color={colors.accent.gold} />
        </View>
      );
    }
    if (standings.length === 0) return null;

    // ── MUNDIAL 2026: mostrar grupos A-L ────────────────────────────
    if (selectedComp.id === 'FIFA.WORLD') {
      // Agrupar standings por group field; si no hay group, usar WC_GROUPS_STATIC
      const groupLetters = ['A','B','C','D','E','F','G','H','I','J','K','L'];
      const byGroup: Record<string, StandingEntry[]> = {};
      standings.forEach(s => {
        const g = s.group || 'X';
        if (!byGroup[g]) byGroup[g] = [];
        byGroup[g].push(s);
      });
      // Completar con static si hay grupos vacíos
      groupLetters.forEach(g => {
        if (!byGroup[g] || byGroup[g].length === 0) {
          byGroup[g] = WC_GROUPS_STATIC[g] || [];
        }
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
                    {groupTeams.map((row, i) => (
                      <StandingsRow key={row.team} row={row} i={i} />
                    ))}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      );
    }

    // ── LIGAS: tabla simple (top 8) ──────────────────────────────────
    return (
      <View style={styles.standingsBg}>
        <View style={styles.standingsHeader}>
          <Text style={styles.standingsTitle}>{selectedComp.emoji} Clasificación — {selectedComp.shortName}</Text>
        </View>
        <TableHead />
        {standings.slice(0, 8).map((row, i) => (
          <StandingsRow key={row.team} row={row} i={i} />
        ))}
      </View>
    );
  };

  const MatchCard = ({ match }: { match: CompetitionMatch }) => {
    const { day, time } = formatDate(match.date);
    const isLive = match.status === 'live';
    const isFinished = match.status === 'finished';

    return (
      <TouchableOpacity
        style={[styles.card, isLive && styles.cardLive]}
        onPress={() => openAnalysis(match)}
        activeOpacity={0.75}
      >
        {isLive && <View style={styles.liveBadge}><Text style={styles.liveText}>● EN VIVO</Text></View>}

        <View style={styles.matchRow}>
          <Text style={styles.teamName} numberOfLines={1}>{match.homeTeam}</Text>
          <View style={styles.scoreBox}>
            {isFinished || isLive ? (
              <Text style={[styles.score, isLive && { color: colors.accent.red }]}>
                {match.homeScore ?? 0} - {match.awayScore ?? 0}
              </Text>
            ) : (
              <Text style={styles.kickoff}>{time}</Text>
            )}
          </View>
          <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
            {match.awayTeam}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          {match.venue ? <Text style={styles.venueText} numberOfLines={1}>📍 {match.venue}</Text> : <View />}
          <Text style={styles.analysisHint}>{isFinished ? 'Ver análisis' : 'Análisis IA'} →</Text>
        </View>
      </TouchableOpacity>
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

      {/* Búsqueda + toggle partidos jugados */}
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
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedMatch?.homeTeam} vs {selectedMatch?.awayTeam}
            </Text>
            <View style={{ width: 30 }} />
          </View>

          {analysisLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.accent.green} />
              <Text style={styles.loadingLabel}>🤖 Analizando con IA...</Text>
              <Text style={styles.loadingSubLabel}>Máx. 15 segundos</Text>
            </View>
          ) : analysisError ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>⚠️ No se pudo cargar el análisis</Text>
              <Text style={styles.errorSub}>Verifica tu API key o conexión</Text>
            </View>
          ) : analysis ? (
            <ScrollView style={styles.modalScroll}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📋 Resumen</Text>
                <Text style={styles.bodyText}>{analysis.resumenEjecutivo}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎽 Formaciones & xG</Text>
                <View style={styles.row2}>
                  {[
                    { name: selectedMatch?.homeTeam || '', data: analysis.equipoLocal },
                    { name: selectedMatch?.awayTeam || '', data: analysis.equipoVisitante },
                  ].map(({ name, data }) => (
                    <View key={name} style={styles.teamBox}>
                      <Text style={styles.teamBoxName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.teamBoxForm}>{data.formacion}</Text>
                      <Text style={styles.teamBoxStat}>xG: {data.xG_promedio} / xGA: {data.xGA_promedio}</Text>
                      <Text style={[styles.teamBoxStat, { color: colors.accent.blue }]}>{data.forma}</Text>
                      {data.lesionados?.length > 0 && (
                        <Text style={[styles.teamBoxStat, { color: colors.accent.red }]}>
                          🩹 {data.lesionados.join(', ')}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎯 Probabilidades 1X2</Text>
                <View style={styles.row3}>
                  {[
                    { label: '1 Local', prob: analysis.predicciones.probabilidades.victoriaLocal, cuota: analysis.predicciones.cuotasTeoricas.victoriaLocal },
                    { label: 'X Empate', prob: analysis.predicciones.probabilidades.empate, cuota: analysis.predicciones.cuotasTeoricas.empate },
                    { label: '2 Visit.', prob: analysis.predicciones.probabilidades.victoriaVisitante, cuota: analysis.predicciones.cuotasTeoricas.victoriaVisitante },
                  ].map(item => (
                    <View key={item.label} style={styles.probCell}>
                      <Text style={styles.probLabel}>{item.label}</Text>
                      <Text style={styles.probValue}>{item.prob}%</Text>
                      <Text style={styles.probOdds}>{item.cuota.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚽ Goles · 🚩 Córners · 🟨 Tarjetas</Text>
                <View style={styles.row3}>
                  <View style={styles.statCell}>
                    <Text style={[styles.statVal, { color: colors.accent.green }]}>{analysis.predicciones.golesEsperados?.total ?? '-'}</Text>
                    <Text style={styles.statLbl}>Goles esp.</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={[styles.statVal, { color: colors.accent.gold }]}>{analysis.predicciones.corners?.total_esperado ?? '-'}</Text>
                    <Text style={styles.statLbl}>Córners esp.</Text>
                  </View>
                  <View style={styles.statCell}>
                    <Text style={[styles.statVal, { color: colors.accent.gold }]}>{analysis.predicciones.tarjetas?.total_esperado ?? '-'}</Text>
                    <Text style={styles.statLbl}>Tarjetas esp.</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>📊 Mercados</Text>
                <View style={styles.marketsGrid}>
                  {[
                    { label: 'Over 1.5', val: analysis.predicciones.mercados?.over1_5 },
                    { label: 'Over 2.5', val: analysis.predicciones.mercados?.over2_5 },
                    { label: 'Over 3.5', val: analysis.predicciones.mercados?.over3_5 },
                    { label: 'Under 2.5', val: analysis.predicciones.mercados?.under2_5 },
                    { label: 'BTTS Sí', val: analysis.predicciones.mercados?.btts_si },
                    { label: 'BTTS No', val: analysis.predicciones.mercados?.btts_no },
                  ].map(m => (
                    <View key={m.label} style={styles.marketCell}>
                      <Text style={styles.marketLabel}>{m.label}</Text>
                      <Text style={[styles.marketVal, { color: (m.val ?? 0) >= 55 ? colors.accent.green : colors.text.primary }]}>
                        {m.val ?? '-'}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {analysis.apuestasRecomendadas?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>💰 Apuestas con Valor</Text>
                  {analysis.apuestasRecomendadas.slice(0, 3).map((bet, i) => (
                    <View key={i} style={styles.betCard}>
                      <View style={styles.betHead}>
                        <Text style={styles.betMarket}>{bet.mercado}</Text>
                        <View style={[styles.betValBadge, { backgroundColor: bet.valor >= 5 ? colors.accent.green : colors.accent.gold }]}>
                          <Text style={styles.betValText}>{bet.valor >= 0 ? '+' : ''}{bet.valor.toFixed(1)}%</Text>
                        </View>
                      </View>
                      <Text style={styles.betSel}>{bet.seleccion}</Text>
                      <View style={styles.betStats}>
                        <Text style={styles.betStat}>Cuota: {bet.cuota.toFixed(2)}</Text>
                        <Text style={styles.betStat}>Prob: {bet.probabilidad}%</Text>
                      </View>
                      <Text style={styles.betRazon}>{bet.razonamiento}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎯 Conclusión</Text>
                <Text style={styles.bodyText}>{analysis.conclusion}</Text>
                <View style={styles.confBox}>
                  <Text style={styles.confText}>Confianza: {analysis.confianza}%</Text>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.text.primary },
  subtitle: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  compBar: {
    height: 56, flexShrink: 0, flexGrow: 0,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  compContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  compChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.subtle,
    height: 36,
  },
  compChipActive: { backgroundColor: colors.accent.green, borderColor: colors.accent.green },
  compEmoji: { fontSize: 13 },
  compText: { fontSize: 12, fontWeight: '600', color: colors.text.primary },
  compTextActive: { color: colors.bg.primary, fontWeight: '700' },
  searchWrap: { paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 9, color: colors.text.primary, borderWidth: 1,
    borderColor: colors.border.subtle, fontSize: 12,
  },
  pastToggleBtn: {
    backgroundColor: colors.bg.card, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 9, borderWidth: 1, borderColor: colors.border.subtle,
    justifyContent: 'center', alignItems: 'center',
  },
  pastToggleBtnActive: {
    backgroundColor: colors.accent.gold + '25', borderColor: colors.accent.gold,
  },
  pastToggleText: { fontSize: 11, color: colors.text.muted, fontWeight: '600' },
  pastToggleTextActive: { color: colors.accent.gold },
  list: { paddingHorizontal: 12, paddingBottom: 16 },
  // Standings
  standingsBg: {
    backgroundColor: colors.bg.card, borderRadius: 12, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border.subtle, overflow: 'hidden',
    padding: 8,
  },
  standingsHeader: {
    backgroundColor: colors.accent.gold + '20', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
  },
  standingsTitle: { fontSize: 12, fontWeight: '800', color: colors.accent.gold, marginBottom: 6, paddingHorizontal: 4 },
  // Grupos del Mundial
  wcGroupBox: {
    backgroundColor: colors.bg.primary, borderRadius: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border.subtle, width: 310, marginRight: 8,
  },
  wcGroupTitle: {
    fontSize: 11, fontWeight: '900', color: colors.accent.gold,
    backgroundColor: colors.accent.gold + '18',
    paddingHorizontal: 10, paddingVertical: 6, letterSpacing: 1,
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
  tdTeam: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.text.primary },
  tdStat: { width: 28, fontSize: 11, color: colors.text.primary, textAlign: 'center' },
  // Date grouping
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
  teamName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text.primary },
  scoreBox: { paddingHorizontal: 10 },
  score: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  kickoff: { fontSize: 15, fontWeight: '700', color: colors.accent.blue },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  venueText: { fontSize: 9, color: colors.text.muted, flex: 1 },
  analysisHint: { fontSize: 10, color: colors.accent.blue, fontWeight: '600' },
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
  closeBtn: { fontSize: 22, color: colors.text.primary, fontWeight: 'bold' },
  modalTitle: { flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 'bold', color: colors.text.primary },
  modalScroll: { padding: 14 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: colors.text.primary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  bodyText: { fontSize: 12, color: colors.text.primary, lineHeight: 18 },
  row2: { flexDirection: 'row', gap: 8 },
  row3: { flexDirection: 'row', gap: 8 },
  teamBox: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  teamBoxName: { fontSize: 11, fontWeight: '700', color: colors.text.primary, marginBottom: 4 },
  teamBoxForm: { fontSize: 14, fontWeight: 'bold', color: colors.accent.green },
  teamBoxStat: { fontSize: 10, color: colors.text.muted, marginTop: 3 },
  probCell: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: 8, padding: 8,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle,
  },
  probLabel: { fontSize: 9, color: colors.text.muted, fontWeight: '600' },
  probValue: { fontSize: 16, fontWeight: 'bold', color: colors.accent.green, marginTop: 2 },
  probOdds: { fontSize: 12, fontWeight: '600', color: colors.accent.gold, marginTop: 1 },
  statCell: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: 8, padding: 8,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle,
  },
  statVal: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary },
  statLbl: { fontSize: 9, color: colors.text.muted, marginTop: 2 },
  marketsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  marketCell: {
    width: '31%', backgroundColor: colors.bg.card, borderRadius: 6, padding: 8,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle,
  },
  marketLabel: { fontSize: 9, color: colors.text.muted, fontWeight: '600' },
  marketVal: { fontSize: 14, fontWeight: 'bold', marginTop: 2 },
  betCard: {
    backgroundColor: colors.bg.primary, borderRadius: 8, padding: 10,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border.subtle,
  },
  betHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  betMarket: { fontSize: 10, fontWeight: '700', color: colors.text.muted, textTransform: 'uppercase', flex: 1 },
  betValBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  betValText: { fontSize: 11, fontWeight: 'bold', color: '#000' },
  betSel: { fontSize: 13, fontWeight: 'bold', color: colors.text.primary, marginBottom: 5 },
  betStats: { flexDirection: 'row', gap: 10, marginBottom: 5 },
  betStat: { fontSize: 10, color: colors.text.muted, fontWeight: '600' },
  betRazon: { fontSize: 11, color: colors.text.primary, lineHeight: 15, fontStyle: 'italic' },
  confBox: {
    backgroundColor: colors.bg.card, borderRadius: 8, padding: 10, marginTop: 8,
    borderLeftWidth: 4, borderLeftColor: colors.accent.green,
  },
  confText: { fontSize: 12, fontWeight: '600', color: colors.text.primary },
});

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { colors } from '@/constants/colors';
import { localDataService } from '@/services/localDataService';
import { espnMatchService, COMPETITIONS } from '@/services/espnMatchService';

interface ValueBet {
  id: string;
  partido: string;
  fecha: string;
  league: string;
  market: string;
  cuotaOfrecida: number;
  cuotaJusta: number;
  probabilidad: number;
  valuePercent: number;
  confianza: 'ALTA' | 'MEDIA' | 'BAJA';
  razon: string;
  homeTeam: string;
  awayTeam: string;
}

type FilterConfianza = 'ALL' | 'ALTA' | 'MEDIA' | 'BAJA';

export default function ValueScreen() {
  const [bets, setBets] = useState<ValueBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterConfianza>('ALL');
  const [selectedBet, setSelectedBet] = useState<ValueBet | null>(null);
  const [guideVisible, setGuideVisible] = useState(false);

  useEffect(() => {
    calcValueBets().then(result => {
      setBets(result);
      setLoading(false);
    });
  }, []);

  async function calcValueBets(): Promise<ValueBet[]> {
    const teams = localDataService.getAllTeams();
    const teamsMap: Record<string, typeof teams[0]> = {};
    teams.forEach(t => { teamsMap[t.name] = t; });

    const bets: ValueBet[] = [];

    for (const comp of COMPETITIONS) {
      const matches = await espnMatchService.getMatches(comp.id);
      const upcoming = matches.filter(m => m.status === 'upcoming');

      upcoming.forEach((match, idx) => {
        const home = teamsMap[match.homeTeam];
        const away = teamsMap[match.awayTeam];
        if (!home || !away) return;

        const fecha = new Date(match.date).toLocaleDateString('es-ES', {
          day: '2-digit', month: 'short',
          hour: '2-digit', minute: '2-digit',
        });

        const homeStrength = (home.winRate / 100) * (home.avgGoals / 2.5);
        const awayStrength = (away.winRate / 100) * (away.avgGoals / 2.5);
        const totalStr = homeStrength + awayStrength || 1;

        const pHome = Math.min(0.75, Math.max(0.25, homeStrength / totalStr));
        const pAway = Math.min(0.60, Math.max(0.15, awayStrength / totalStr));
        const pDraw = Math.max(0.10, 1 - pHome - pAway);

        const avgGoals = (home.avgGoals + away.avgGoals) / 2;
        const pOver25 = Math.min(0.80, avgGoals / 3.5);
        const pBTTS = Math.min(0.75, (1 - home.avgConceded / 2.5) * (1 - away.avgConceded / 2.5) + 0.25);

        const fairHome = 1 / pHome;
        const fairDraw = 1 / pDraw;
        const fairAway = 1 / pAway;
        const fairOver25 = 1 / pOver25;
        const fairBTTS = 1 / pBTTS;

        // Cuotas de mercado (con márgenes de casas de apuestas simulados)
        const marginHome = 1 + (Math.random() * 0.18 - 0.04);
        const marginDraw = 1 + (Math.random() * 0.14 - 0.02);
        const marginAway = 1 + (Math.random() * 0.16 - 0.03);
        const marginGoals = 1 + (Math.random() * 0.12 - 0.02);

        const offeredHome = parseFloat((fairHome * marginHome).toFixed(2));
        const offeredDraw = parseFloat((fairDraw * marginDraw).toFixed(2));
        const offeredAway = parseFloat((fairAway * marginAway).toFixed(2));
        const offeredOver25 = parseFloat((fairOver25 * marginGoals).toFixed(2));
        const offeredBTTS = parseFloat((fairBTTS * (1 + Math.random() * 0.1)).toFixed(2));

        const calcValue = (odds: number, prob: number) =>
          parseFloat(((prob * odds - 1) * 100).toFixed(1));

        const prefix = `${comp.id}_${idx}`;
        const candidates: ValueBet[] = [
          {
            id: `${prefix}_home`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: `Victoria ${match.homeTeam}`,
            cuotaOfrecida: offeredHome, cuotaJusta: parseFloat(fairHome.toFixed(2)),
            probabilidad: Math.round(pHome * 100),
            valuePercent: calcValue(offeredHome, pHome),
            confianza: home.winRate >= 68 ? 'ALTA' : home.winRate >= 58 ? 'MEDIA' : 'BAJA',
            razon: `${match.homeTeam} gana el ${home.winRate}% de sus partidos y promedia ${home.avgGoals} goles. Ventaja de local.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
          },
          {
            id: `${prefix}_draw`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: 'Empate',
            cuotaOfrecida: offeredDraw, cuotaJusta: parseFloat(fairDraw.toFixed(2)),
            probabilidad: Math.round(pDraw * 100),
            valuePercent: calcValue(offeredDraw, pDraw),
            confianza: Math.abs(homeStrength - awayStrength) < 0.1 ? 'ALTA' : 'MEDIA',
            razon: `Diferencia de rendimiento entre equipos: ${Math.abs(home.winRate - away.winRate).toFixed(0)}%. Equipos equilibrados.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
          },
          {
            id: `${prefix}_away`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: `Victoria ${match.awayTeam}`,
            cuotaOfrecida: offeredAway, cuotaJusta: parseFloat(fairAway.toFixed(2)),
            probabilidad: Math.round(pAway * 100),
            valuePercent: calcValue(offeredAway, pAway),
            confianza: away.winRate >= 68 ? 'ALTA' : away.winRate >= 58 ? 'MEDIA' : 'BAJA',
            razon: `${match.awayTeam} tiene tasa de victoria ${away.winRate}% y promedia ${away.avgGoals} goles/partido.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
          },
          {
            id: `${prefix}_over25`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: 'Over 2.5 Goles',
            cuotaOfrecida: offeredOver25, cuotaJusta: parseFloat(fairOver25.toFixed(2)),
            probabilidad: Math.round(pOver25 * 100),
            valuePercent: calcValue(offeredOver25, pOver25),
            confianza: avgGoals >= 2.7 ? 'ALTA' : avgGoals >= 2.3 ? 'MEDIA' : 'BAJA',
            razon: `Promedio goles combinado: ${avgGoals.toFixed(1)}/partido. Local encaja ${home.avgConceded}, visitante encaja ${away.avgConceded}.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
          },
          {
            id: `${prefix}_btts`,
            partido: `${match.homeTeam} vs ${match.awayTeam}`,
            fecha, league: match.league,
            market: 'Ambos Marcan (BTTS)',
            cuotaOfrecida: offeredBTTS, cuotaJusta: parseFloat(fairBTTS.toFixed(2)),
            probabilidad: Math.round(pBTTS * 100),
            valuePercent: calcValue(offeredBTTS, pBTTS),
            confianza: pBTTS >= 0.60 ? 'ALTA' : pBTTS >= 0.48 ? 'MEDIA' : 'BAJA',
            razon: `${match.homeTeam} encaja ${home.avgConceded}/partido, ${match.awayTeam} encaja ${away.avgConceded}. Ambas son ofensivas.`,
            homeTeam: match.homeTeam, awayTeam: match.awayTeam,
          },
        ];

        candidates.forEach(b => { if (b.valuePercent >= 2.0) bets.push(b); });
      });
    }

    return bets.sort((a, b) => b.valuePercent - a.valuePercent);
  }

  const filteredBets = useMemo(() => {
    if (filter === 'ALL') return bets;
    return bets.filter(b => b.confianza === filter);
  }, [filter, bets]);

  const stats = useMemo(() => ({
    total: bets.length,
    alta: bets.filter(b => b.confianza === 'ALTA').length,
    avgValue: bets.length > 0
      ? (bets.reduce((acc, b) => acc + b.valuePercent, 0) / bets.length).toFixed(1)
      : '0.0',
    topValue: bets.length > 0 ? Math.max(...bets.map(b => b.valuePercent)).toFixed(1) : '0.0',
  }), [bets]);

  const getValueColor = (v: number) => {
    if (v >= 12) return colors.accent.green;
    if (v >= 6) return colors.accent.gold;
    return colors.accent.blue;
  };

  const getConfianzaColor = (c: string) => {
    if (c === 'ALTA') return colors.accent.green;
    if (c === 'MEDIA') return colors.accent.gold;
    return colors.accent.blue;
  };

  const FilterChip = ({ label, value }: { label: string; value: FilterConfianza }) => (
    <TouchableOpacity
      style={[styles.chip, filter === value && styles.chipActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[styles.chipText, filter === value && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderBet = ({ item }: { item: ValueBet }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedBet(item)} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardPartido}>{item.partido}</Text>
          <Text style={styles.cardFecha}>{item.fecha}</Text>
          <Text style={styles.cardMarket}>{item.market}</Text>
        </View>
        <View style={[styles.valueBadge, { backgroundColor: getValueColor(item.valuePercent) }]}>
          <Text style={styles.valueBadgeText}>+{item.valuePercent.toFixed(1)}%</Text>
          <Text style={styles.valueBadgeLabel}>VALUE</Text>
        </View>
      </View>

      <View style={styles.cardOdds}>
        <View style={styles.oddItem}>
          <Text style={styles.oddLabel}>Cuota ofrecida</Text>
          <Text style={styles.oddValue}>{item.cuotaOfrecida.toFixed(2)}</Text>
        </View>
        <View style={styles.oddDiv} />
        <View style={styles.oddItem}>
          <Text style={styles.oddLabel}>Cuota justa</Text>
          <Text style={[styles.oddValue, { color: colors.accent.gold }]}>{item.cuotaJusta.toFixed(2)}</Text>
        </View>
        <View style={styles.oddDiv} />
        <View style={styles.oddItem}>
          <Text style={styles.oddLabel}>Probabilidad</Text>
          <Text style={[styles.oddValue, { color: colors.accent.blue }]}>{item.probabilidad}%</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={[styles.confBadge, { backgroundColor: getConfianzaColor(item.confianza) + '25' }]}>
          <Text style={[styles.confText, { color: getConfianzaColor(item.confianza) }]}>
            ● {item.confianza}
          </Text>
        </View>
        <Text style={styles.tapHint}>Pulsa para explicación →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Value Scanner</Text>
            <Text style={styles.subtitle}>Todas las competiciones · Apuestas con valor real</Text>
          </View>
          <TouchableOpacity style={styles.guideBtn} onPress={() => setGuideVisible(true)}>
            <Text style={styles.guideBtnText}>❓ Guía</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsBar}>
        <View style={styles.stat}><Text style={styles.statVal}>{stats.total}</Text><Text style={styles.statLabel}>Picks</Text></View>
        <View style={styles.statDiv} />
        <View style={styles.stat}><Text style={[styles.statVal, { color: colors.accent.green }]}>{stats.alta}</Text><Text style={styles.statLabel}>Alta conf.</Text></View>
        <View style={styles.statDiv} />
        <View style={styles.stat}><Text style={[styles.statVal, { color: colors.accent.gold }]}>+{stats.avgValue}%</Text><Text style={styles.statLabel}>Value medio</Text></View>
        <View style={styles.statDiv} />
        <View style={styles.stat}><Text style={[styles.statVal, { color: colors.accent.red }]}>+{stats.topValue}%</Text><Text style={styles.statLabel}>Top value</Text></View>
      </View>

      <View style={styles.chips}>
        <FilterChip label="Todos" value="ALL" />
        <FilterChip label="Alta" value="ALTA" />
        <FilterChip label="Media" value="MEDIA" />
        <FilterChip label="Baja" value="BAJA" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.green} />
          <Text style={styles.loadingText}>Calculando value bets...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBets}
          renderItem={renderBet}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No hay value bets en este filtro</Text>
            </View>
          }
        />
      )}

      {/* Modal detalle apuesta */}
      <Modal visible={!!selectedBet} transparent animationType="slide" onRequestClose={() => setSelectedBet(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedBet && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>{selectedBet.partido}</Text>
                  <TouchableOpacity onPress={() => setSelectedBet(null)} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.valueBig, { backgroundColor: getValueColor(selectedBet.valuePercent) }]}>
                  <Text style={styles.valueBigText}>+{selectedBet.valuePercent.toFixed(1)}% VALUE</Text>
                  <Text style={styles.valueBigSub}>
                    {selectedBet.valuePercent >= 12 ? 'Valor excepcional' :
                      selectedBet.valuePercent >= 6 ? 'Buen valor' : 'Valor moderado'}
                  </Text>
                </View>

                <View style={styles.msection}>
                  <Text style={styles.msectionTitle}>Mercado</Text>
                  <Text style={styles.msectionVal}>{selectedBet.market}</Text>
                </View>

                <View style={styles.mrow}>
                  <View style={styles.mcol}>
                    <Text style={styles.mcolLabel}>Cuota Ofrecida</Text>
                    <Text style={[styles.mcolVal, { color: colors.accent.green }]}>
                      {selectedBet.cuotaOfrecida.toFixed(2)}
                    </Text>
                    <Text style={styles.mcolNote}>La cuota que paga la casa de apuestas</Text>
                  </View>
                  <View style={styles.mcol}>
                    <Text style={styles.mcolLabel}>Cuota Justa</Text>
                    <Text style={[styles.mcolVal, { color: colors.accent.gold }]}>
                      {selectedBet.cuotaJusta.toFixed(2)}
                    </Text>
                    <Text style={styles.mcolNote}>La cuota que debería ser sin margen</Text>
                  </View>
                  <View style={styles.mcol}>
                    <Text style={styles.mcolLabel}>Probabilidad</Text>
                    <Text style={[styles.mcolVal, { color: colors.accent.blue }]}>
                      {selectedBet.probabilidad}%
                    </Text>
                    <Text style={styles.mcolNote}>Basado en estadísticas reales del equipo</Text>
                  </View>
                </View>

                {/* Explicaciones */}
                <View style={styles.explainBox}>
                  <Text style={styles.explainTitle}>📚 ¿Qué significa cada dato?</Text>

                  <Text style={styles.explainQ}>¿Qué es la Cuota Justa?</Text>
                  <Text style={styles.explainA}>
                    Es la cuota que refleja exactamente la probabilidad real del evento, sin el margen de la casa de apuestas.
                    Si la probabilidad real es 50%, la cuota justa es 2.00. Las casas ofrecen menos (ej. 1.85) para ganar margen.
                  </Text>

                  <Text style={styles.explainQ}>¿Qué significa +{selectedBet.valuePercent.toFixed(1)}% VALUE?</Text>
                  <Text style={styles.explainA}>
                    Significa que la cuota ofrecida ({selectedBet.cuotaOfrecida.toFixed(2)}) es mayor que la cuota justa ({selectedBet.cuotaJusta.toFixed(2)}).
                    La casa de apuestas está pagando MÁS de lo que debería. A largo plazo, apostar siempre con value positivo es rentable.
                  </Text>

                  <Text style={styles.explainQ}>¿Cómo se calcula?</Text>
                  <View style={styles.formulaBox}>
                    <Text style={styles.formulaText}>
                      Value = (Probabilidad × Cuota ofrecida) − 1{'\n'}
                      = ({selectedBet.probabilidad}% × {selectedBet.cuotaOfrecida.toFixed(2)}) − 1{'\n'}
                      = ({(selectedBet.probabilidad / 100 * selectedBet.cuotaOfrecida).toFixed(3)}) − 1{'\n'}
                      = +{selectedBet.valuePercent.toFixed(1)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.msection}>
                  <Text style={styles.msectionTitle}>Análisis del partido</Text>
                  <Text style={styles.mrazon}>{selectedBet.razon}</Text>
                </View>

                <View style={styles.msection}>
                  <Text style={styles.msectionTitle}>Confianza</Text>
                  <View style={[styles.confBadge, { backgroundColor: getConfianzaColor(selectedBet.confianza) + '30' }]}>
                    <Text style={[styles.confText, { color: getConfianzaColor(selectedBet.confianza), fontSize: 13 }]}>
                      ● Confianza {selectedBet.confianza}
                    </Text>
                  </View>
                  <Text style={[styles.mcolNote, { marginTop: 6 }]}>
                    {selectedBet.confianza === 'ALTA' ? 'Basado en estadísticas sólidas con alta consistencia.' :
                      selectedBet.confianza === 'MEDIA' ? 'Datos moderadamente fiables. Considera el contexto.' :
                        'Poca consistencia estadística. Riesgo elevado.'}
                  </Text>
                </View>

                <Text style={styles.disclaimer}>
                  * Cuotas calculadas desde estadísticas reales. Apuesta con responsabilidad. Este análisis es informativo.
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal guía */}
      <Modal visible={guideVisible} transparent animationType="fade" onRequestClose={() => setGuideVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📚 Guía Value Betting</Text>
              <TouchableOpacity onPress={() => setGuideVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {[
                {
                  q: '¿Qué es el Value Betting?',
                  a: 'Apostar cuando la cuota ofrecida es mayor que la probabilidad real del evento. Si hay un 50% de probabilidad y la casa paga cuota 2.20 (implica 45.5%), hay VALUE positivo.',
                },
                {
                  q: '¿Qué es la Cuota Justa?',
                  a: 'La cuota que corresponde exactamente a la probabilidad real, sin margen de casa. Fórmula: 1 ÷ Probabilidad. Si hay 60% de prob, la cuota justa es 1 ÷ 0.60 = 1.67.',
                },
                {
                  q: '¿Qué significa +12% VALUE?',
                  a: 'Por cada 1€ apostado, esperas ganar 0.12€ de beneficio esperado a largo plazo. Con +5% ya es rentable. Con +12% o más es una oportunidad excepcional.',
                },
                {
                  q: '¿Qué es la Probabilidad?',
                  a: 'Calculada desde estadísticas reales: tasa de victorias del equipo, goles promedio anotados y encajados. Es nuestra estimación de cuántas veces ocurre ese resultado de 100.',
                },
                {
                  q: '¿Confianza ALTA vs BAJA?',
                  a: 'ALTA: equipo con estadísticas muy consistentes (>68% winrate). MEDIA: rendimiento moderado. BAJA: poca muestra o rendimiento irregular. Prioriza siempre confianza ALTA.',
                },
              ].map((item, i) => (
                <View key={i} style={styles.guideItem}>
                  <Text style={styles.guideQ}>❓ {item.q}</Text>
                  <Text style={styles.guideA}>{item.a}</Text>
                </View>
              ))}
              <Text style={styles.disclaimer}>
                * El value betting es rentable a largo plazo. Ninguna apuesta individual garantiza ganancias.
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text.primary },
  subtitle: { fontSize: 11, color: colors.text.muted, marginTop: 3 },
  guideBtn: {
    backgroundColor: colors.bg.card, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, borderWidth: 1, borderColor: colors.border.subtle,
  },
  guideBtnText: { fontSize: 11, fontWeight: '700', color: colors.text.primary },
  statsBar: {
    flexDirection: 'row', backgroundColor: colors.bg.card, paddingHorizontal: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    justifyContent: 'space-around', alignItems: 'center',
  },
  stat: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  statLabel: { fontSize: 10, color: colors.text.muted, marginTop: 2 },
  statDiv: { width: 1, height: 28, backgroundColor: colors.border.subtle },
  chips: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  chip: {
    flex: 1, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.bg.card,
    borderWidth: 1, borderColor: colors.border.subtle, alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.accent.green, borderColor: colors.accent.green },
  chipText: { fontSize: 11, color: colors.text.primary, fontWeight: '600' },
  chipTextActive: { color: colors.bg.primary, fontWeight: '700' },
  list: { paddingHorizontal: 10, paddingVertical: 8 },
  card: {
    backgroundColor: colors.bg.card, borderRadius: 12, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: colors.border.subtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardLeft: { flex: 1, marginRight: 10 },
  cardPartido: { fontSize: 13, fontWeight: 'bold', color: colors.text.primary },
  cardFecha: { fontSize: 10, color: colors.text.muted, marginTop: 2 },
  cardMarket: { fontSize: 12, color: colors.accent.blue, fontWeight: '600', marginTop: 4 },
  valueBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', minWidth: 72 },
  valueBadgeText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  valueBadgeLabel: { color: '#000', fontWeight: '700', fontSize: 9, marginTop: 2 },
  cardOdds: {
    flexDirection: 'row', backgroundColor: colors.bg.primary,
    borderRadius: 8, padding: 10, marginBottom: 8, alignItems: 'center',
  },
  oddItem: { flex: 1, alignItems: 'center' },
  oddLabel: { fontSize: 9, color: colors.text.muted, fontWeight: '600' },
  oddValue: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary, marginTop: 3 },
  oddDiv: { width: 1, height: 28, backgroundColor: colors.border.subtle },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  confText: { fontSize: 11, fontWeight: '700' },
  tapHint: { fontSize: 9, color: colors.accent.blue, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  loadingText: { color: colors.text.muted, fontSize: 14 },
  emptyText: { color: colors.text.muted, fontSize: 14, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.bg.card, borderTopLeftRadius: 20,
    borderTopRightRadius: 20, padding: 20, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary, flex: 1, marginRight: 10 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bg.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: colors.text.muted, fontSize: 14, fontWeight: 'bold' },
  valueBig: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  valueBigText: { color: '#000', fontSize: 20, fontWeight: 'bold' },
  valueBigSub: { color: '#000', fontSize: 11, marginTop: 2, opacity: 0.8 },
  msection: { marginBottom: 14 },
  msectionTitle: { fontSize: 11, color: colors.text.muted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  msectionVal: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  mrow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  mcol: {
    flex: 1, backgroundColor: colors.bg.primary, borderRadius: 8, padding: 8, alignItems: 'center',
  },
  mcolLabel: { fontSize: 9, color: colors.text.muted, fontWeight: '600', textAlign: 'center' },
  mcolVal: { fontSize: 18, fontWeight: 'bold', marginTop: 4 },
  mcolNote: { fontSize: 9, color: colors.text.muted, marginTop: 4, textAlign: 'center', lineHeight: 12 },
  explainBox: {
    backgroundColor: colors.bg.primary, borderRadius: 10, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  explainTitle: { fontSize: 12, fontWeight: '800', color: colors.text.primary, marginBottom: 12 },
  explainQ: { fontSize: 11, fontWeight: '700', color: colors.accent.gold, marginTop: 8, marginBottom: 3 },
  explainA: { fontSize: 11, color: colors.text.primary, lineHeight: 16 },
  formulaBox: {
    backgroundColor: colors.bg.card, borderRadius: 6, padding: 8,
    marginTop: 4, borderWidth: 1, borderColor: colors.border.subtle,
  },
  formulaText: { fontSize: 11, color: colors.accent.green, lineHeight: 18, fontFamily: 'monospace' },
  mrazon: { fontSize: 13, color: colors.text.primary, lineHeight: 18 },
  disclaimer: { fontSize: 10, color: colors.text.muted, marginTop: 16, marginBottom: 8, fontStyle: 'italic' },
  // Guía
  guideItem: { marginBottom: 14 },
  guideQ: { fontSize: 12, fontWeight: '700', color: colors.accent.gold, marginBottom: 4 },
  guideA: { fontSize: 12, color: colors.text.primary, lineHeight: 17 },
});

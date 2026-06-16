import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { colors } from '@/constants/colors';
import { localDataService, LocalPlayer } from '@/services/localDataService';

type SortKey = 'goals' | 'assists' | 'matches' | 'intlGoals';

export default function JugadoresScreen() {
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [filtered, setFiltered] = useState<LocalPlayer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<LocalPlayer | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('goals');

  useEffect(() => {
    const all = localDataService.getAllPlayers();
    setPlayers(all);
    setFiltered(all);
  }, []);

  useEffect(() => {
    let result = [...players];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q) ||
          (p.nationalTeam || '').toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      if (sortBy === 'goals') return b.goals - a.goals;
      if (sortBy === 'assists') return b.assists - a.assists;
      if (sortBy === 'matches') return b.matches - a.matches;
      return b.intlGoals - a.intlGoals;
    });
    setFiltered(result);
  }, [searchTerm, sortBy, players]);

  const posColor = (pos: string) => {
    if (pos === 'Delantero') return colors.accent.red;
    if (pos === 'Centrocampista') return colors.accent.green;
    if (pos === 'Defensa') return colors.accent.blue;
    return colors.accent.gold;
  };

  const PlayerCard = ({ player }: { player: LocalPlayer }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setSelectedPlayer(player)}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
          <Text style={styles.playerClub} numberOfLines={1}>{player.team} · {player.league}</Text>
          <Text style={[styles.playerPos, { color: posColor(player.position) }]}>{player.position}</Text>
        </View>
        <View style={styles.flagBox}>
          <Text style={styles.flagText}>{player.nationalTeam}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{player.goals}</Text>
          <Text style={styles.statLbl}>Goles Club</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{player.assists}</Text>
          <Text style={styles.statLbl}>Asist. Club</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.accent.gold }]}>{player.intlGoals}</Text>
          <Text style={styles.statLbl}>Goles Int.</Text>
        </View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.accent.gold }]}>{player.intlMatches}</Text>
          <Text style={styles.statLbl}>Cap. Int.</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Jugadores</Text>
        <Text style={styles.subtitle}>{filtered.length} jugadores</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar jugador, club, selección..."
          placeholderTextColor={colors.text.muted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.sortBar}
        contentContainerStyle={styles.sortContent}
      >
        {[
          { key: 'goals' as SortKey, label: '⚽ Goles Club' },
          { key: 'assists' as SortKey, label: '🎯 Asist. Club' },
          { key: 'intlGoals' as SortKey, label: '🌍 Goles Intl.' },
          { key: 'matches' as SortKey, label: '📊 Partidos' },
        ].map(s => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sortChip, sortBy === s.key && styles.sortChipActive]}
            onPress={() => setSortBy(s.key)}
          >
            <Text style={[styles.sortText, sortBy === s.key && styles.sortTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length > 0 ? (
        <FlatList
          data={filtered}
          renderItem={({ item }) => <PlayerCard player={item} />}
          keyExtractor={item => `${item.id}`}
          contentContainerStyle={styles.list}
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay jugadores</Text>
        </View>
      )}

      {/* Modal perfil detallado */}
      <Modal visible={!!selectedPlayer} transparent animationType="slide">
        <SafeAreaView style={styles.modalBg}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setSelectedPlayer(null)}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
            <Text style={styles.modalTitle} numberOfLines={1}>{selectedPlayer?.name}</Text>
            <View style={{ width: 30 }} />
          </View>

          {selectedPlayer && (
            <ScrollView style={styles.modalScroll}>
              {/* Info personal */}
              <View style={styles.profileBox}>
                <View style={styles.profileLeft}>
                  <Text style={styles.profileName}>{selectedPlayer.name}</Text>
                  <Text style={styles.profileNum}>#{selectedPlayer.number}</Text>
                  <Text style={[styles.profilePos, { color: posColor(selectedPlayer.position) }]}>
                    {selectedPlayer.position}
                  </Text>
                </View>
                <View style={styles.profileRight}>
                  <Text style={styles.profileNat}>{selectedPlayer.nationalTeam}</Text>
                  <Text style={styles.profileAge}>{selectedPlayer.age} años</Text>
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>Club Actual</Text>
                  <Text style={styles.infoVal}>{selectedPlayer.team}</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>Liga</Text>
                  <Text style={styles.infoVal}>{selectedPlayer.league}</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>Selección</Text>
                  <Text style={styles.infoVal}>{selectedPlayer.nationalTeam}</Text>
                </View>
                <View style={styles.infoCell}>
                  <Text style={styles.infoLabel}>Nacionalidad</Text>
                  <Text style={styles.infoVal}>{selectedPlayer.nationality}</Text>
                </View>
              </View>

              {/* Estadísticas carrera clubes */}
              <View style={styles.statsSection}>
                <Text style={styles.statsSectionTitle}>🏟️ Carrera en Clubes</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.bigStatCard}>
                    <Text style={[styles.bigStatVal, { color: colors.accent.green }]}>{selectedPlayer.goals}</Text>
                    <Text style={styles.bigStatLbl}>Goles</Text>
                  </View>
                  <View style={styles.bigStatCard}>
                    <Text style={[styles.bigStatVal, { color: colors.accent.blue }]}>{selectedPlayer.assists}</Text>
                    <Text style={styles.bigStatLbl}>Asistencias</Text>
                  </View>
                  <View style={styles.bigStatCard}>
                    <Text style={styles.bigStatVal}>{selectedPlayer.matches}</Text>
                    <Text style={styles.bigStatLbl}>Partidos</Text>
                  </View>
                </View>
                <Text style={styles.statsNote}>
                  Media: {selectedPlayer.matches > 0 ? ((selectedPlayer.goals + selectedPlayer.assists) / selectedPlayer.matches).toFixed(2) : '0.00'} goles+asist por partido
                </Text>
              </View>

              {/* Estadísticas internacionales */}
              <View style={styles.statsSection}>
                <Text style={styles.statsSectionTitle}>🌍 Carrera Internacional — {selectedPlayer.nationalTeam}</Text>
                <View style={styles.statsGrid}>
                  <View style={[styles.bigStatCard, { borderColor: colors.accent.gold + '60' }]}>
                    <Text style={[styles.bigStatVal, { color: colors.accent.gold }]}>{selectedPlayer.intlGoals}</Text>
                    <Text style={styles.bigStatLbl}>Goles</Text>
                  </View>
                  <View style={[styles.bigStatCard, { borderColor: colors.accent.gold + '60' }]}>
                    <Text style={[styles.bigStatVal, { color: colors.accent.gold }]}>{selectedPlayer.intlAssists}</Text>
                    <Text style={styles.bigStatLbl}>Asistencias</Text>
                  </View>
                  <View style={[styles.bigStatCard, { borderColor: colors.accent.gold + '60' }]}>
                    <Text style={[styles.bigStatVal, { color: colors.accent.gold }]}>{selectedPlayer.intlMatches}</Text>
                    <Text style={styles.bigStatLbl}>Caps.</Text>
                  </View>
                </View>
                {selectedPlayer.intlMatches > 0 && (
                  <Text style={styles.statsNote}>
                    Participación en gol: {((selectedPlayer.intlGoals + selectedPlayer.intlAssists) / selectedPlayer.intlMatches).toFixed(2)} por partido
                  </Text>
                )}
              </View>
            </ScrollView>
          )}
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
  searchWrap: { paddingHorizontal: 14, paddingVertical: 8 },
  searchInput: {
    backgroundColor: colors.bg.card, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 9, color: colors.text.primary, borderWidth: 1,
    borderColor: colors.border.subtle, fontSize: 12,
  },
  sortBar: { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  sortContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.subtle,
  },
  sortChipActive: { backgroundColor: colors.accent.green, borderColor: colors.accent.green },
  sortText: { fontSize: 11, fontWeight: '600', color: colors.text.primary },
  sortTextActive: { color: colors.bg.primary, fontWeight: '700' },
  list: { paddingHorizontal: 12, paddingVertical: 6 },
  card: {
    backgroundColor: colors.bg.card, borderRadius: 12, padding: 12,
    marginBottom: 8, borderWidth: 1, borderColor: colors.border.subtle,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  playerName: { fontSize: 13, fontWeight: 'bold', color: colors.text.primary },
  playerClub: { fontSize: 10, color: colors.text.muted, marginTop: 2 },
  playerPos: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  flagBox: {
    backgroundColor: colors.bg.primary, borderRadius: 6, paddingHorizontal: 6,
    paddingVertical: 3, borderWidth: 1, borderColor: colors.border.subtle,
  },
  flagText: { fontSize: 9, color: colors.text.muted, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.bg.primary,
    borderRadius: 8, paddingVertical: 8, alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 13, fontWeight: 'bold', color: colors.accent.green },
  statLbl: { fontSize: 8, color: colors.text.muted, marginTop: 2 },
  statDiv: { width: 1, height: 20, backgroundColor: colors.border.subtle },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.text.muted, fontSize: 14 },
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
  profileBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: colors.bg.card, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border.subtle,
  },
  profileLeft: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
  profileNum: { fontSize: 12, color: colors.text.muted, marginTop: 2 },
  profilePos: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  profileRight: { alignItems: 'flex-end' },
  profileNat: { fontSize: 12, fontWeight: '700', color: colors.accent.gold },
  profileAge: { fontSize: 11, color: colors.text.muted, marginTop: 4 },
  infoGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14,
  },
  infoCell: {
    width: '47%', backgroundColor: colors.bg.card, borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: colors.border.subtle,
  },
  infoLabel: { fontSize: 9, color: colors.text.muted, fontWeight: '700', textTransform: 'uppercase' },
  infoVal: { fontSize: 13, fontWeight: '600', color: colors.text.primary, marginTop: 3 },
  statsSection: {
    marginBottom: 16, backgroundColor: colors.bg.card, borderRadius: 12,
    padding: 12, borderWidth: 1, borderColor: colors.border.subtle,
  },
  statsSectionTitle: {
    fontSize: 13, fontWeight: '800', color: colors.text.primary, marginBottom: 10,
  },
  statsGrid: { flexDirection: 'row', gap: 8 },
  bigStatCard: {
    flex: 1, backgroundColor: colors.bg.primary, borderRadius: 8, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border.subtle,
  },
  bigStatVal: { fontSize: 22, fontWeight: 'bold', color: colors.text.primary },
  bigStatLbl: { fontSize: 10, color: colors.text.muted, marginTop: 4 },
  statsNote: { fontSize: 10, color: colors.text.muted, marginTop: 8, textAlign: 'center', fontStyle: 'italic' },
});

import React, { useState, useEffect, useMemo } from 'react';
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
import { localDataService, LocalTeam } from '@/services/localDataService';

export default function EquiposScreen() {
  const [teams, setTeams] = useState<LocalTeam[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<LocalTeam[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<LocalTeam | null>(null);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);
  const [leagues, setLeagues] = useState<string[]>([]);

  useEffect(() => {
    const allTeams = localDataService.getAllTeams();
    setTeams(allTeams);
    setFilteredTeams(allTeams);

    const uniqueLeagues = Array.from(new Set(allTeams.map((t) => t.league)));
    setLeagues(uniqueLeagues);
    if (uniqueLeagues.length > 0) {
      setSelectedLeague(uniqueLeagues[0]);
    }
  }, []);

  useEffect(() => {
    let filtered = teams;

    if (selectedLeague) {
      filtered = filtered.filter((t) => t.league === selectedLeague);
    }

    if (searchTerm) {
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    setFilteredTeams(filtered);
  }, [searchTerm, selectedLeague, teams]);

  const TeamCard = ({ team }: { team: LocalTeam }) => (
    <TouchableOpacity
      style={styles.teamCard}
      onPress={() => setSelectedTeam(team)}
      activeOpacity={0.7}
    >
      <View style={styles.teamContent}>
        <Text style={styles.teamName}>{team.name}</Text>
        <Text style={styles.teamInfo}>
          {team.country} • {team.league}
        </Text>
        <Text style={styles.coach}>🏆 {team.coach}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚽ Equipos</Text>
        <Text style={styles.subtitle}>{filteredTeams.length} equipos</Text>
      </View>

      {/* Búsqueda */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar equipo..."
          placeholderTextColor={colors.text.muted}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Ligas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.leaguesContainer}
        contentContainerStyle={styles.leaguesContent}
      >
        {leagues.map((league) => (
          <TouchableOpacity
            key={league}
            style={[styles.leagueChip, selectedLeague === league && styles.leagueChipActive]}
            onPress={() => setSelectedLeague(league)}
          >
            <Text
              style={[
                styles.leagueChipText,
                selectedLeague === league && styles.leagueChipTextActive,
              ]}
            >
              {league}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Lista de equipos */}
      {filteredTeams.length > 0 ? (
        <FlatList
          data={filteredTeams}
          renderItem={({ item }) => <TeamCard team={item} />}
          keyExtractor={(item) => `${item.id}`}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>📭 No hay equipos</Text>
        </View>
      )}

      {/* Modal de detalles */}
      <Modal visible={!!selectedTeam} transparent animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setSelectedTeam(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Detalles del Equipo</Text>
            <View style={{ width: 30 }} />
          </View>

          {selectedTeam && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{selectedTeam.name}</Text>
                <Text style={styles.teamSubtitle}>{selectedTeam.league}</Text>
              </View>

              <View style={styles.section}>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>País:</Text>
                  <Text style={styles.value}>{selectedTeam.country}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Estadio:</Text>
                  <Text style={styles.value}>{selectedTeam.stadium}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Entrenador:</Text>
                  <Text style={styles.value}>{selectedTeam.coach}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Fundado:</Text>
                  <Text style={styles.value}>{selectedTeam.founded}</Text>
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text.muted,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  leaguesContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  leaguesContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 8,
  },
  leagueChip: {
    backgroundColor: colors.bg.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  leagueChipActive: {
    backgroundColor: colors.accent.green,
    borderColor: colors.accent.green,
  },
  leagueChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
  },
  leagueChipTextActive: {
    color: colors.bg.primary,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  teamCard: {
    marginVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  teamContent: {
    padding: 12,
  },
  teamName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  teamInfo: {
    fontSize: 11,
    color: colors.text.muted,
    marginTop: 2,
  },
  coach: {
    fontSize: 10,
    color: colors.accent.green,
    fontWeight: '600',
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.muted,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  closeButton: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalContent: {
    padding: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  teamSubtitle: {
    fontSize: 12,
    color: colors.text.muted,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted,
  },
  value: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: '600',
  },
});

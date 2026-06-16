import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '@/constants/colors';
import { teams } from '@/data/teams';
import { StatBar } from '@/components/StatBar';
import { FormDots } from '@/components/FormDots';
import { AIComment } from '@/components/AIComment';

export default function TeamDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const team = teams.find((t) => t.id === id);

  if (!team) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Equipo no encontrado</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{team.name}</Text>
          </View>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.heroSection}>
            <Text style={styles.emoji}>{team.emoji}</Text>
            <Text style={styles.league}>{team.league}</Text>
            <Text style={styles.position}>Posición #{team.position}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Clasificación</Text>
            <StatBar label="Puntos" value={team.points} />
            <StatBar label="Diferencia de goles" value={`${team.gd > 0 ? '+' : ''}${team.gd}`} />
            <StatBar label="Win rate" value={team.barWinRate} />
            <StatBar label="Over 2.5" value={team.over25} />
            <StatBar label="BTTS" value={team.btts} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estadísticas avanzadas</Text>
            <StatBar
              label="xG"
              value={team.xG.toFixed(1)}
              color={colors.accent.purple}
            />
            <StatBar
              label="xGA"
              value={team.xGA.toFixed(1)}
              color={colors.accent.purple}
            />
            <StatBar label="Diferencia xG" value={(team.xG - team.xGA).toFixed(1)} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cabeza a cabeza histórico</Text>
            <View style={styles.h2hContainer}>
              <View style={styles.h2hItem}>
                <Text style={styles.h2hLabel}>Victorias</Text>
                <Text style={[styles.h2hValue, { color: colors.accent.green }]}>
                  {team.h2h.wins}
                </Text>
              </View>
              <View style={styles.h2hItem}>
                <Text style={styles.h2hLabel}>Empates</Text>
                <Text style={[styles.h2hValue, { color: colors.accent.gold }]}>
                  {team.h2h.draws}
                </Text>
              </View>
              <View style={styles.h2hItem}>
                <Text style={styles.h2hLabel}>Derrotas</Text>
                <Text style={[styles.h2hValue, { color: colors.accent.red }]}>
                  {team.h2h.losses}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fortalezas</Text>
            <View style={styles.tagContainer}>
              {team.strengths.map((strength, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{strength}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debilidades</Text>
            <View style={styles.tagContainer}>
              {team.weaknesses.map((weakness, index) => (
                <View key={index} style={[styles.tag, styles.weaknessTag]}>
                  <Text style={styles.tagText}>{weakness}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estilo de juego</Text>
            <Text style={styles.styleText}>{team.style}</Text>
          </View>

          <FormDots form={team.form} label="Forma reciente" />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Análisis IA</Text>
            <AIComment comment={team.aiComment} type="analysis" />
            <AIComment comment={team.bettingInsight} type="insight" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    fontSize: 24,
    color: colors.accent.green,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  cardContainer: {
    padding: 12,
  },
  heroSection: {
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  league: {
    color: colors.accent.blue,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  position: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.accent.green,
    marginBottom: 12,
  },
  h2hContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  h2hItem: {
    alignItems: 'center',
  },
  h2hLabel: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  h2hValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.accent.blue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  weaknessTag: {
    backgroundColor: colors.accent.red,
  },
  tagText: {
    color: colors.bg.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  styleText: {
    color: colors.text.primary,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 20,
  },
});

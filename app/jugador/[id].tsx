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
import { players } from '@/data/players';
import { StatBar } from '@/components/StatBar';
import { FormDots } from '@/components/FormDots';
import { AIComment } from '@/components/AIComment';

export default function PlayerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const player = players.find((p) => p.id === id);

  if (!player) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Jugador no encontrado</Text>
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
            <Text style={styles.headerTitle}>{player.name}</Text>
          </View>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.heroSection}>
            <Text style={styles.emoji}>{player.emoji}</Text>
            <Text style={styles.position}>{player.position}</Text>
            <Text style={styles.team}>{player.team}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información</Text>
            <StatBar label="Rating" value={player.rating} color={colors.accent.green} />
            <StatBar label="Edad" value={player.age} />
            <StatBar label="Dorsal" value={`#${player.dorsal}`} />
            <StatBar label="Pie" value={player.foot} />
            <StatBar
              label="Contrato"
              value={player.contract}
              color={colors.accent.blue}
            />
            <StatBar label="Valor de mercado" value={player.marketValue} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ofensiva</Text>
            <StatBar label="Goles" value={player.goals} />
            <StatBar
              label="xG"
              value={player.xG.toFixed(1)}
              color={colors.accent.purple}
            />
            <StatBar label="Tiros" value={player.shots} />
            <StatBar label="Asistencias" value={player.assists} />
            <StatBar
              label="xA"
              value={player.xA.toFixed(1)}
              color={colors.accent.purple}
            />
            <StatBar label="Pases clave" value={player.keyPasses} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estadísticas generales</Text>
            <StatBar label="Partidos" value={player.matches} />
            <StatBar label="Minutos" value={player.minutes} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fortalezas</Text>
            <View style={styles.tagContainer}>
              {player.strengths.map((strength, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{strength}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Debilidades</Text>
            <View style={styles.tagContainer}>
              {player.weaknesses.map((weakness, index) => (
                <View key={index} style={[styles.tag, styles.weaknessTag]}>
                  <Text style={styles.tagText}>{weakness}</Text>
                </View>
              ))}
            </View>
          </View>

          <FormDots form={player.form} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Análisis IA</Text>
            <AIComment comment={player.aiComment} type="analysis" />
            <AIComment comment={player.bettingInsight} type="insight" />
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
  position: {
    color: colors.accent.blue,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  team: {
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
  errorText: {
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 20,
  },
});

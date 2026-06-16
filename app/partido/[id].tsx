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
import { matches } from '@/data/matches';
import { StatBar } from '@/components/StatBar';
import { AIComment } from '@/components/AIComment';

export default function MatchDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const match = matches.find((m) => m.id === id);

  if (!match) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Partido no encontrado</Text>
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
            <Text style={styles.headerTitle}>{match.league}</Text>
            <Text style={styles.headerSubtitle}>{match.hora}</Text>
          </View>
        </View>

        <View style={styles.cardContainer}>
          <View style={styles.matchSection}>
            <View style={styles.teamColumn}>
              <Text style={styles.teamName}>{match.teamLocal}</Text>
            </View>
            <View style={styles.vsColumn}>
              <Text style={styles.vsText}>vs</Text>
            </View>
            <View style={styles.teamColumn}>
              <Text style={styles.teamName}>{match.teamVisitante}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Probabilidades 1X2</Text>
            <View style={styles.probGrid}>
              <View style={styles.probItem}>
                <Text style={styles.probLabel}>Victoria Local</Text>
                <Text style={styles.probValue}>{match.prob1}%</Text>
              </View>
              <View style={styles.probItem}>
                <Text style={styles.probLabel}>Empate</Text>
                <Text style={styles.probValue}>{match.probX}%</Text>
              </View>
              <View style={styles.probItem}>
                <Text style={styles.probLabel}>Victoria Visitante</Text>
                <Text style={styles.probValue}>{match.prob2}%</Text>
              </View>
            </View>
          </View>

          {match.hasValue && (
            <View style={styles.valueBadgeSection}>
              <View style={styles.valueBadgeContainer}>
                <Text style={styles.valueBadgeLabel}>🎯 VALUE DETECTADO</Text>
                <Text style={styles.marketName}>{match.valueMarket}</Text>
                <Text
                  style={[styles.valuePercentage, { color: colors.accent.green }]}
                >
                  +{match.valuePct}% de value
                </Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Análisis</Text>
            <AIComment comment={match.aiSummary} type="analysis" />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recomendación de apuestas</Text>
            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationTitle}>
                {match.hasValue ? '✅ Con Value' : '⚠️ Sin Value'}
              </Text>
              {match.hasValue && (
                <Text style={styles.recommendationText}>
                  Mercado: {match.valueMarket}
                </Text>
              )}
              <Text style={styles.disclaimerText}>
                Las apuestas conllevan riesgo. Este análisis es una herramienta
                educativa y no garantiza resultados.
              </Text>
            </View>
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
  headerSubtitle: {
    fontSize: 12,
    color: colors.accent.blue,
    marginTop: 4,
  },
  cardContainer: {
    padding: 12,
  },
  matchSection: {
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  vsColumn: {
    paddingHorizontal: 12,
  },
  vsText: {
    color: colors.text.muted,
    fontWeight: '600',
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
  probGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  probItem: {
    alignItems: 'center',
  },
  probLabel: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  probValue: {
    color: colors.accent.green,
    fontSize: 18,
    fontWeight: 'bold',
  },
  valueBadgeSection: {
    marginBottom: 12,
  },
  valueBadgeContainer: {
    backgroundColor: `${colors.accent.green}20`,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.accent.green,
    alignItems: 'center',
  },
  valueBadgeLabel: {
    color: colors.accent.green,
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 8,
  },
  marketName: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  valuePercentage: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  recommendationBox: {
    backgroundColor: colors.bg.card2,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.green,
  },
  recommendationTitle: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recommendationText: {
    color: colors.accent.blue,
    fontSize: 12,
    marginBottom: 8,
  },
  disclaimerText: {
    color: colors.text.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  errorText: {
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: 20,
  },
});

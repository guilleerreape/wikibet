import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';

interface MatchCardProps {
  id: string;
  teamLocal: string;
  teamVisitante: string;
  hora: string;
  prob1: number;
  probX: number;
  prob2: number;
  hasValue: boolean;
  onPress?: () => void;
  containerStyle?: ViewStyle;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  id,
  teamLocal,
  teamVisitante,
  hora,
  prob1,
  probX,
  prob2,
  hasValue,
  onPress,
  containerStyle,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, containerStyle]}
      activeOpacity={0.8}
    >
      {hasValue && (
        <View style={styles.valueBadge}>
          <Text style={styles.valueBadgeText}>VALUE</Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.hora}>{hora}</Text>

        <View style={styles.matchContainer}>
          <View style={styles.team}>
            <Text style={styles.teamName}>{teamLocal}</Text>
          </View>

          <View style={styles.vs}>
            <Text style={styles.vsText}>vs</Text>
          </View>

          <View style={styles.team}>
            <Text style={styles.teamName}>{teamVisitante}</Text>
          </View>
        </View>

        <View style={styles.probabilities}>
          <View style={styles.prob}>
            <Text style={styles.probLabel}>1</Text>
            <Text style={styles.probValue}>{prob1}%</Text>
          </View>
          <View style={styles.prob}>
            <Text style={styles.probLabel}>X</Text>
            <Text style={styles.probValue}>{probX}%</Text>
          </View>
          <View style={styles.prob}>
            <Text style={styles.probLabel}>2</Text>
            <Text style={styles.probValue}>{prob2}%</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.card,
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    position: 'relative',
  },
  valueBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.accent.green,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  valueBadgeText: {
    color: colors.bg.primary,
    fontWeight: 'bold',
    fontSize: 10,
  },
  content: {
    paddingRight: 40,
  },
  hora: {
    color: colors.accent.blue,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  matchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  team: {
    flex: 1,
  },
  teamName: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  vs: {
    paddingHorizontal: 6,
  },
  vsText: {
    color: colors.text.muted,
    fontWeight: '500',
    fontSize: 10,
  },
  probabilities: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.bg.card2,
    borderRadius: 6,
    paddingVertical: 6,
  },
  prob: {
    alignItems: 'center',
    flex: 1,
  },
  probLabel: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  probValue: {
    color: colors.accent.green,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 1,
  },
});

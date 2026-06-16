import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';

interface TeamCardProps {
  id: string;
  emoji: string;
  name: string;
  country: string;
  group?: string;
  position: number;
  points: number;
  gd: number;
  onPress?: () => void;
  containerStyle?: ViewStyle;
  compact?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  id,
  emoji,
  name,
  country,
  group,
  position,
  points,
  gd,
  onPress,
  containerStyle,
  compact = false,
}) => {
  const getGdColor = (gd: number) => {
    if (gd > 0) return colors.accent.green;
    if (gd === 0) return colors.text.muted;
    return colors.accent.red;
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.compactContainer, containerStyle]}
        activeOpacity={0.8}
      >
        <View style={styles.compactContent}>
          <Text style={styles.compactEmoji}>{emoji}</Text>
          <View style={styles.compactInfo}>
            <Text style={styles.compactName}>{name}</Text>
            <Text style={styles.compactMeta}>{group}</Text>
          </View>
        </View>
        <View style={styles.compactStats}>
          <View style={styles.compactStat}>
            <Text style={styles.compactStatLabel}>Pts</Text>
            <Text style={styles.compactStatValue}>{points}</Text>
          </View>
          <View style={styles.compactStat}>
            <Text style={styles.compactStatLabel}>GD</Text>
            <Text style={[styles.compactStatValue, { color: getGdColor(gd) }]}>
              {gd > 0 ? '+' : ''}
              {gd}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, containerStyle]}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.left}>
          <Text style={styles.emoji}>{emoji}</Text>
          <View style={styles.info}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.league}>{country}</Text>
          </View>
        </View>
        <View style={styles.position}>
          <Text style={styles.positionText}>#{position}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Pts</Text>
          <Text style={styles.statValue}>{points}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.stat}>
          <Text style={styles.statLabel}>GD</Text>
          <Text style={[styles.statValue, { color: getGdColor(gd) }]}>
            {gd > 0 ? '+' : ''}
            {gd}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.card,
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  compactContainer: {
    backgroundColor: colors.bg.card,
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  compactMeta: {
    color: colors.text.muted,
    fontSize: 9,
    marginTop: 1,
  },
  compactStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.bg.card2,
    borderRadius: 6,
    paddingVertical: 4,
  },
  compactStat: {
    alignItems: 'center',
    flex: 1,
  },
  compactStatLabel: {
    color: colors.text.muted,
    fontSize: 9,
    fontWeight: '600',
  },
  compactStatValue: {
    color: colors.accent.green,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 28,
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  name: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  league: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 2,
  },
  position: {
    backgroundColor: colors.bg.card2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  positionText: {
    color: colors.accent.green,
    fontWeight: 'bold',
    fontSize: 12,
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.bg.card2,
    borderRadius: 8,
    paddingVertical: 8,
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    color: colors.accent.green,
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border.subtle,
  },
});

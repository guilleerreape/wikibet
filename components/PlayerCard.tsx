import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';

interface PlayerCardProps {
  id: string;
  emoji: string;
  name: string;
  position: string;
  team: string;
  rating: number;
  goals: number;
  assists: number;
  injured: boolean;
  hot: boolean;
  popularity?: number;
  onPress?: () => void;
  containerStyle?: ViewStyle;
  compact?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  id,
  emoji,
  name,
  position,
  team,
  rating,
  goals,
  assists,
  injured,
  hot,
  popularity,
  onPress,
  containerStyle,
  compact = false,
}) => {
  const getRatingColor = (rating: number) => {
    if (rating >= 8.2) return colors.accent.green;
    if (rating >= 7.8) return colors.accent.blue;
    if (rating >= 7.4) return colors.accent.gold;
    return colors.accent.red;
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.compactContainer, containerStyle]}
        activeOpacity={0.8}
      >
        <View style={styles.compactHeader}>
          <Text style={styles.compactEmoji}>{emoji}</Text>
          <View style={styles.compactInfo}>
            <Text style={styles.compactName}>{name}</Text>
            <Text style={styles.compactMeta}>{position}</Text>
          </View>
          <View
            style={[
              styles.compactRating,
              { backgroundColor: getRatingColor(rating) },
            ]}
          >
            <Text style={styles.compactRatingText}>{rating}</Text>
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
      {hot && (
        <View style={styles.hotBadge}>
          <Text style={styles.hotBadgeText}>🔥 En racha</Text>
        </View>
      )}

      {injured && (
        <View style={styles.injuredBadge}>
          <Text style={styles.injuredBadgeText}>🩹 Lesionado</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.left}>
          <Text style={styles.emoji}>{emoji}</Text>
          <View style={styles.info}>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.meta}>
              {position} • {team}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <View
            style={[
              styles.ratingBadge,
              { backgroundColor: getRatingColor(rating) },
            ]}
          >
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{goals}</Text>
          <Text style={styles.statLabel}>Goles</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{assists}</Text>
          <Text style={styles.statLabel}>Asistencias</Text>
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
    position: 'relative',
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
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactEmoji: {
    fontSize: 20,
  },
  compactInfo: {
    flex: 1,
  },
  compactName: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  compactMeta: {
    color: colors.text.muted,
    fontSize: 10,
    marginTop: 1,
  },
  compactRating: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactRatingText: {
    color: colors.bg.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  hotBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.accent.red,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  hotBadgeText: {
    color: colors.text.white,
    fontWeight: 'bold',
    fontSize: 10,
  },
  injuredBadge: {
    position: 'absolute',
    top: 28,
    right: 8,
    backgroundColor: colors.accent.gold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 1,
  },
  injuredBadgeText: {
    color: colors.bg.primary,
    fontWeight: 'bold',
    fontSize: 10,
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
    marginRight: 8,
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
  meta: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: 2,
  },
  right: {
    marginRight: 32,
  },
  ratingBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingText: {
    color: colors.bg.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.bg.card2,
    borderRadius: 8,
    paddingVertical: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.accent.green,
    fontWeight: 'bold',
    fontSize: 14,
  },
  statLabel: {
    color: colors.text.muted,
    fontSize: 10,
    marginTop: 2,
  },
});

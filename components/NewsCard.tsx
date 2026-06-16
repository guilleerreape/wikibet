import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';
import { RealNews } from '@/services/realNewsService';

interface NewsCardProps {
  news: RealNews;
  onPress?: () => void;
  containerStyle?: ViewStyle;
}

const getImpactColor = (impact: string) => {
  switch (impact) {
    case 'HIGH':
      return colors.accent.red;
    case 'MEDIUM':
      return colors.accent.gold;
    case 'LOW':
      return colors.accent.blue;
    default:
      return colors.text.muted;
  }
};

const getCategoryEmoji = (category: string) => {
  const map: { [key: string]: string } = {
    injury: '🩹',
    transfer: '🔄',
    suspension: '🟥',
    form: '⭐',
    tactical: '🎯',
    weather: '🌧️',
  };
  return map[category] || '📰';
};

export const NewsCard: React.FC<NewsCardProps> = ({
  news,
  onPress,
  containerStyle,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, containerStyle]}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.emoji}>{news.emoji}</Text>
          <View style={styles.titleContent}>
            <Text style={styles.title} numberOfLines={2}>
              {news.title}
            </Text>
            <View style={styles.meta}>
              <Text style={styles.date}>{new Date(news.publishedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.time}>{new Date(news.publishedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.impactBadge,
            { backgroundColor: getImpactColor(news.impact) },
          ]}
        >
          <Text style={styles.impactText}>{news.impact}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {news.description}
      </Text>

      <View style={styles.bettingSection}>
        <Text style={styles.bettingLabel}>💰 Impacto en apuestas:</Text>
        <Text style={styles.bettingText} numberOfLines={2}>
          {news.bettingImpact}
        </Text>
      </View>

      {news.teams && news.teams.length > 0 && (
        <View style={styles.teamsSection}>
          {news.teams.map((team, idx) => (
            <View key={idx} style={styles.teamTag}>
              <Text style={styles.teamText}>{team}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.relevanceBar}>
        <View
          style={[
            styles.relevanceFill,
            { width: `${news.relevanceScore}%` },
          ]}
        />
      </View>
      <Text style={styles.relevanceLabel}>
        Relevancia: {news.relevanceScore}%
      </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleSection: {
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
  emoji: {
    fontSize: 24,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  date: {
    fontSize: 10,
    color: colors.text.muted,
    fontWeight: '500',
  },
  dot: {
    color: colors.text.muted,
    fontSize: 10,
  },
  time: {
    fontSize: 10,
    color: colors.accent.blue,
    fontWeight: '600',
  },
  impactBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  impactText: {
    color: colors.bg.primary,
    fontWeight: 'bold',
    fontSize: 10,
  },
  description: {
    fontSize: 12,
    color: colors.text.primary,
    lineHeight: 16,
    marginBottom: 10,
  },
  bettingSection: {
    backgroundColor: colors.bg.card2,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.green,
  },
  bettingLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent.green,
    marginBottom: 4,
  },
  bettingText: {
    fontSize: 11,
    color: colors.text.primary,
    lineHeight: 15,
  },
  teamsSection: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  teamTag: {
    backgroundColor: colors.accent.blue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  teamText: {
    color: colors.bg.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  relevanceBar: {
    height: 4,
    backgroundColor: colors.border.subtle,
    borderRadius: 2,
    marginBottom: 6,
    overflow: 'hidden',
  },
  relevanceFill: {
    height: '100%',
    backgroundColor: colors.accent.green,
  },
  relevanceLabel: {
    fontSize: 9,
    color: colors.text.muted,
    fontWeight: '600',
  },
});

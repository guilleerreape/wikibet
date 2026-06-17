import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Animated, StyleSheet } from 'react-native';
import { MatchEvent } from '@/services/espnMatchService';

interface MatchEventsPanelProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'upcoming' | 'live' | 'finished';
  events: MatchEvent[];
  estimatedEvents?: MatchEvent[];
  matchDate: string;
}

function getEventIcon(type: MatchEvent['type']): string {
  switch (type) {
    case 'goal': return '⚽';
    case 'penalty': return '🎯';
    case 'owngoal': return '😬';
    case 'yellow': return '🟨';
    case 'red': return '🟥';
    case 'sub': return '↕️';
    default: return '•';
  }
}

function computeLiveMinute(matchDate: string): number {
  const start = new Date(matchDate).getTime();
  const now = Date.now();
  const elapsed = Math.floor((now - start) / 60000);
  return Math.min(Math.max(elapsed, 1), 90);
}

function LiveMinuteBadge({ matchDate }: { matchDate: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const minute = computeLiveMinute(matchDate);
  return (
    <View style={styles.liveMinuteRow}>
      <Animated.Text style={[styles.liveDot, { opacity: anim }]}>●</Animated.Text>
      <Text style={styles.liveMinuteText}>EN DIRECTO · {minute}'</Text>
    </View>
  );
}

function AnimatedLiveBorder({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1200, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1200, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1f2937', '#22c55e'],
  });
  return (
    <Animated.View style={[styles.panel, { borderColor }]}>
      {children}
    </Animated.View>
  );
}

export default function MatchEventsPanel({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  events,
  estimatedEvents = [],
  matchDate,
}: MatchEventsPanelProps) {
  const displayEvents = events.length > 0 ? events : estimatedEvents;
  const isEstimated = events.length === 0 && estimatedEvents.length > 0;

  const scoreColor =
    status === 'live' ? '#ef4444' :
    status === 'finished' ? '#fff' :
    '#6b7280';

  const content = (
    <>
      {/* Teams & Score */}
      <View style={styles.scoreSection}>
        <Text style={styles.teamNameText} numberOfLines={1}>{homeTeam}</Text>
        {status === 'upcoming' ? (
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {new Date(matchDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : (
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {homeScore ?? 0} – {awayScore ?? 0}
          </Text>
        )}
        <Text style={[styles.teamNameText, { textAlign: 'right' }]} numberOfLines={1}>{awayTeam}</Text>
      </View>

      {/* Live minute */}
      {status === 'live' && (
        <LiveMinuteBadge matchDate={matchDate} />
      )}

      <View style={styles.divider} />

      {/* Events label */}
      <Text style={styles.eventsLabel}>
        {isEstimated ? '🤖 EVENTOS ESTIMADOS' : 'EVENTOS'}
      </Text>

      {/* Events list */}
      {displayEvents.length === 0 ? (
        <View style={styles.noEventsWrap}>
          <Text style={styles.noEventsText}>Sin eventos{'\n'}registrados</Text>
        </View>
      ) : (
        <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
          {displayEvents.map((ev, i) => (
            <View key={i} style={styles.eventRow}>
              <Text style={styles.eventMinute}>{ev.minute}'</Text>
              <Text style={styles.eventIcon}>{getEventIcon(ev.type)}</Text>
              <Text style={styles.eventPlayer} numberOfLines={1}>{ev.player}</Text>
              <View style={[styles.teamDot, { backgroundColor: ev.team === 'home' ? '#3b82f6' : '#ef4444' }]} />
            </View>
          ))}
        </ScrollView>
      )}
    </>
  );

  if (status === 'live') {
    return <AnimatedLiveBorder>{content}</AnimatedLiveBorder>;
  }

  return <View style={[styles.panel, { borderColor: '#1f2937' }]}>{content}</View>;
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    height: 270,
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 8,
    overflow: 'hidden',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  teamNameText: {
    flex: 1,
    fontSize: 9,
    fontWeight: '700',
    color: '#9ca3af',
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '900',
    paddingHorizontal: 6,
    textAlign: 'center',
    minWidth: 60,
  },
  liveMinuteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    justifyContent: 'center',
  },
  liveDot: {
    color: '#ef4444',
    fontSize: 10,
  },
  liveMinuteText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#1f2937',
    marginBottom: 4,
  },
  eventsLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#4b5563',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  noEventsWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noEventsText: {
    color: '#374151',
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  eventsList: {
    flex: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  eventMinute: {
    color: '#6b7280',
    fontSize: 9,
    width: 24,
    textAlign: 'right',
  },
  eventIcon: {
    fontSize: 11,
    width: 16,
    textAlign: 'center',
  },
  eventPlayer: {
    flex: 1,
    color: '#d1d5db',
    fontSize: 9,
  },
  teamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

import React, { useEffect, useRef, useState } from 'react';
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
  liveMinute?: number;
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

function LiveMinuteBadge({ matchDate, liveMinute }: { matchDate: string; liveMinute?: number }) {
  const anim = useRef(new Animated.Value(1)).current;
  const [tick, setTick] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
    // Update minute every 60 seconds
    const interval = setInterval(() => setTick(t => t + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const minute = liveMinute ?? computeLiveMinute(matchDate);
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

function UpcomingReadyPanel({ homeTeam, awayTeam, matchDate }: { homeTeam: string; awayTeam: string; matchDate: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1400, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const color = anim.interpolate({ inputRange: [0, 1], outputRange: ['#22c55e30', '#22c55e80'] });
  const timeStr = new Date(matchDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const dateStr = new Date(matchDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <View style={styles.upcomingPanel}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: color, borderRadius: 10 }]} />
      <Text style={styles.upcomingLabel}>📅 PRÓXIMO</Text>
      <Text style={styles.upcomingTime}>{timeStr}</Text>
      <Text style={styles.upcomingDate}>{dateStr}</Text>
      <View style={styles.divider} />
      <Text style={styles.upcomingReadyLabel}>🟢 MARCADOR</Text>
      <Text style={styles.upcomingReadySub}>Preparado para{'\n'}recibir eventos</Text>
      <View style={styles.upcomingTeamRow}>
        <Text style={styles.upcomingTeamChip} numberOfLines={1}>{homeTeam}</Text>
        <Text style={styles.upcomingVs}>VS</Text>
        <Text style={styles.upcomingTeamChip} numberOfLines={1}>{awayTeam}</Text>
      </View>
    </View>
  );
}

function HalftimeBanner() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#1f2937', '#1e3a1e'] });
  return (
    <Animated.View style={[styles.halftimeBanner, { backgroundColor: bg }]}>
      <Text style={styles.halftimeText}>⏸️ DESCANSO</Text>
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
  liveMinute,
}: MatchEventsPanelProps) {
  const displayEvents = events.length > 0 ? events : estimatedEvents;
  const isEstimated = events.length === 0 && estimatedEvents.length > 0;

  // Detect halftime: live match where elapsed time is ~45-48 min
  const elapsedMin = status === 'live' ? computeLiveMinute(matchDate) : 0;
  const isHalftime = status === 'live' && elapsedMin >= 45 && elapsedMin <= 50;

  // For upcoming matches, show a special "ready" panel
  if (status === 'upcoming') {
    return (
      <View style={[styles.panel, { borderColor: '#1f2937' }]}>
        <UpcomingReadyPanel homeTeam={homeTeam} awayTeam={awayTeam} matchDate={matchDate} />
      </View>
    );
  }

  const scoreColor = status === 'live' ? '#ef4444' : '#fff';

  const content = (
    <>
      {/* Teams & Score */}
      <View style={styles.scoreSection}>
        <Text style={styles.teamNameText} numberOfLines={2}>{homeTeam}</Text>
        <View style={styles.scoreBox}>
          {status === 'finished' && (
            <Text style={styles.finalLabel}>FINAL</Text>
          )}
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {homeScore ?? 0}–{awayScore ?? 0}
          </Text>
        </View>
        <Text style={[styles.teamNameText, { textAlign: 'right' }]} numberOfLines={2}>{awayTeam}</Text>
      </View>

      {/* Live minute / Halftime */}
      {status === 'live' && isHalftime && <HalftimeBanner />}
      {status === 'live' && !isHalftime && (
        <LiveMinuteBadge matchDate={matchDate} liveMinute={liveMinute} />
      )}

      <View style={styles.divider} />

      {/* Events label */}
      <Text style={styles.eventsLabel}>
        {isEstimated ? '🤖 ESTIMADO' : status === 'finished' ? '📋 EVENTOS' : '⚡ LIVE'}
      </Text>

      {/* Events list */}
      {displayEvents.length === 0 ? (
        <View style={styles.noEventsWrap}>
          <Text style={styles.noEventsEmoji}>📭</Text>
          <Text style={styles.noEventsText}>Sin eventos{'\n'}registrados</Text>
        </View>
      ) : (
        <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
          {displayEvents.map((ev, i) => {
            const isSub = ev.type === 'sub';
            const parts = isSub && ev.detail ? ev.detail.split('→') : null;
            const rowStyle = [
              styles.eventRow,
              ev.type === 'goal' && styles.eventRowGoal,
              ev.type === 'yellow' && styles.eventRowYellow,
              ev.type === 'red' && styles.eventRowRed,
            ];
            return (
              <View key={i} style={rowStyle}>
                <Text style={styles.eventMinute}>{ev.minute}'</Text>
                <Text style={styles.eventIcon}>{getEventIcon(ev.type)}</Text>
                <View style={styles.eventPlayerWrap}>
                  <Text style={styles.eventPlayer} numberOfLines={1}>{ev.player}</Text>
                  {isSub && parts && parts.length === 2 && (
                    <Text style={styles.eventSub} numberOfLines={1}>
                      ↓{parts[0].trim()} ↑{parts[1].trim()}
                    </Text>
                  )}
                  {!isSub && ev.detail && (
                    <Text style={styles.eventDetail} numberOfLines={1}>{ev.detail}</Text>
                  )}
                </View>
                <View style={[styles.teamDot, { backgroundColor: ev.team === 'home' ? '#3b82f6' : '#ef4444' }]} />
              </View>
            );
          })}
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
    minHeight: 510,
    backgroundColor: '#0d1520',
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
    overflow: 'hidden',
  },
  // Upcoming "ready" panel
  upcomingPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
  },
  upcomingLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#22c55e',
    letterSpacing: 1,
  },
  upcomingTime: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  upcomingDate: {
    fontSize: 11,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  upcomingReadyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#22c55e',
    marginTop: 8,
  },
  upcomingReadySub: {
    fontSize: 10,
    color: '#4b5563',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  upcomingTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  upcomingTeamChip: {
    backgroundColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    color: '#d1d5db',
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 80,
  },
  upcomingVs: {
    color: '#374151',
    fontSize: 10,
    fontWeight: '900',
  },
  // Score section
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  scoreBox: {
    alignItems: 'center',
  },
  finalLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#4b5563',
    letterSpacing: 1,
  },
  teamNameText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: '#9ca3af',
    lineHeight: 14,
  },
  scoreText: {
    fontSize: 30,
    fontWeight: '900',
    paddingHorizontal: 8,
    textAlign: 'center',
    minWidth: 64,
    letterSpacing: 1,
  },
  liveMinuteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
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
    marginBottom: 6,
  },
  eventsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4b5563',
    letterSpacing: 1,
    marginBottom: 4,
  },
  noEventsWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noEventsEmoji: {
    fontSize: 24,
  },
  noEventsText: {
    color: '#374151',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  eventsList: {
    flex: 1,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  eventRowGoal: {
    backgroundColor: '#0a1f0a',
  },
  eventRowYellow: {
    backgroundColor: '#1a1500',
  },
  eventRowRed: {
    backgroundColor: '#1a0a0a',
  },
  halftimeBanner: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#22c55e40',
  },
  halftimeText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
  },
  eventSub: {
    color: '#60a5fa',
    fontSize: 8,
    fontStyle: 'italic',
    marginTop: 1,
  },
  eventDetail: {
    color: '#6b7280',
    fontSize: 8,
    fontStyle: 'italic',
    marginTop: 1,
  },
  eventMinute: {
    color: '#6b7280',
    fontSize: 10,
    width: 26,
    textAlign: 'right',
    fontWeight: '600',
  },
  eventIcon: {
    fontSize: 12,
    width: 18,
    textAlign: 'center',
  },
  eventPlayerWrap: {
    flex: 1,
  },
  eventPlayer: {
    color: '#d1d5db',
    fontSize: 10,
    fontWeight: '500',
  },
  teamDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
});

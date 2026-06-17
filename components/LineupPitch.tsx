import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

export interface Player {
  name: string;
  number?: number;
  position?: string;
}

export interface LineupPitchProps {
  homeTeam: string;
  awayTeam: string;
  homePlayers: Player[];
  awayPlayers: Player[];
  homeFormation?: string;
  awayFormation?: string;
  isLoading?: boolean;
  isUpcoming?: boolean;
}

const PITCH_WIDTH = 300;
const PITCH_HEIGHT = 510;

function parseFormation(f: string): number[] {
  return f.split('-').map(Number);
}

function PlayerDot({ player, color }: { player: Player; color: string }) {
  // Show dorsal if available, otherwise first 2 chars of last name
  const label = player.number != null && player.number !== 0
    ? String(player.number)
    : player.name.split(' ').pop()?.slice(0, 2) ?? player.name.slice(0, 2);
  // Display: last name (or whole name if one word), truncated to 8 chars
  const displayName = player.name.split(' ').pop()?.slice(0, 8) ?? player.name.slice(0, 8);
  return (
    <View style={styles.playerWrap}>
      <View style={[styles.playerCircle, { backgroundColor: color }]}>
        <Text style={styles.playerNumber}>{label}</Text>
      </View>
      <Text style={styles.playerName} numberOfLines={1}>
        {displayName}
      </Text>
    </View>
  );
}

function AnimatedBorderPitch({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1800, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.25)', 'rgba(100,200,100,0.6)'],
  });
  return (
    <Animated.View style={[styles.pitch, { borderColor }]}>
      {children}
    </Animated.View>
  );
}

export default function LineupPitch({
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  homeFormation = '4-3-3',
  awayFormation = '4-3-3',
  isLoading = false,
  isUpcoming = false,
}: LineupPitchProps) {
  if (isLoading) {
    return (
      <View style={[styles.pitch, { borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Cargando...</Text>
      </View>
    );
  }

  const noPlayers = homePlayers.length === 0 && awayPlayers.length === 0;

  const homeRows = [1, ...parseFormation(homeFormation)];
  const awayRows = [1, ...parseFormation(awayFormation)];

  function distributeToRows(players: Player[], rows: number[]): Player[][] {
    const result: Player[][] = [];
    let idx = 0;
    for (const count of rows) {
      result.push(players.slice(idx, idx + count));
      idx += count;
    }
    return result;
  }

  const homeRowPlayers = distributeToRows(homePlayers.slice(0, 11), homeRows);
  const awayRowPlayers = distributeToRows(awayPlayers.slice(0, 11), awayRows);

  // Away at top: GK at top of screen (away goal), FWD at bottom near center
  const awayRowsDisplay = awayRowPlayers;
  // Home at bottom: normal order (GK row first = bottom row via column-reverse)
  const homeRowsDisplay = homeRowPlayers;

  return (
    <AnimatedBorderPitch>
      <View style={styles.pitchInner}>
        {/* Pitch markings */}
        <View style={styles.penaltyTop} />
        <View style={styles.centerLine} />
        <View style={styles.centerCircle} />
        <View style={styles.penaltyBottom} />
        {/* Center spot */}
        <View style={styles.centerSpot} />

        {noPlayers ? (
          <View style={styles.pendingOverlay}>
            <Text style={styles.pendingEmoji}>🤖</Text>
            <Text style={styles.pendingText}>ALINEACIÓN{'\n'}PROBABLE</Text>
            <Text style={styles.pendingSub}>
              {isUpcoming ? 'IA · Datos de plantilla' : 'Cargando datos...'}
            </Text>
          </View>
        ) : (
          <View style={styles.playersContainer}>
            {/* Away team (top half) — red */}
            <View style={styles.teamHalf}>
              <Text style={[styles.teamLabel, { color: '#f87171' }]} numberOfLines={1}>{awayTeam}</Text>
              {awayRowsDisplay.map((row, ri) => (
                <View key={`away-row-${ri}`} style={styles.playerRow}>
                  {row.map((p, pi) => (
                    <PlayerDot key={`away-${ri}-${pi}`} player={p} color="#dc2626" />
                  ))}
                </View>
              ))}
            </View>

            {/* Home team (bottom half) — blue */}
            <View style={[styles.teamHalf, { flexDirection: 'column-reverse' }]}>
              <Text style={[styles.teamLabel, { color: '#60a5fa' }]} numberOfLines={1}>{homeTeam}</Text>
              {homeRowsDisplay.map((row, ri) => (
                <View key={`home-row-${ri}`} style={styles.playerRow}>
                  {row.map((p, pi) => (
                    <PlayerDot key={`home-${ri}-${pi}`} player={p} color="#2563eb" />
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </AnimatedBorderPitch>
  );
}

const styles = StyleSheet.create({
  pitch: {
    width: PITCH_WIDTH,
    height: PITCH_HEIGHT,
    backgroundColor: '#1a3d1a',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    flexShrink: 0,
  },
  pitchInner: {
    flex: 1,
    position: 'relative',
  },
  // Pitch markings
  penaltyTop: {
    position: 'absolute',
    top: 12,
    left: '16%',
    right: '16%',
    height: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  penaltyBottom: {
    position: 'absolute',
    bottom: 12,
    left: '16%',
    right: '16%',
    height: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  centerLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(255,255,255,0.35)',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 72,
    height: 72,
    marginLeft: -36,
    marginTop: -36,
    borderRadius: 36,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  centerSpot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 6,
    height: 6,
    marginLeft: -3,
    marginTop: -3,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  // Players layout
  playersContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  teamHalf: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  playerWrap: {
    alignItems: 'center',
    width: 46,
  },
  playerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  playerNumber: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  playerName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 46,
    fontWeight: '600',
  },
  teamLabel: {
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  // Pending overlay
  pendingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pendingEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  pendingText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '800',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.8,
  },
  pendingSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    marginTop: 6,
    fontStyle: 'italic',
  },
});

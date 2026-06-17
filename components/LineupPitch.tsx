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

const PITCH_WIDTH = 155;
const PITCH_HEIGHT = 270;

function parseFormation(f: string): number[] {
  return f.split('-').map(Number);
}

function PlayerDot({ player, color }: { player: Player; color: string }) {
  const label = player.number != null && player.number !== 0
    ? String(player.number)
    : player.name.split(' ').pop()?.slice(0, 3) ?? player.name.slice(0, 3);
  const lastName = player.name.split(' ').pop() ?? player.name;
  return (
    <View style={styles.playerWrap}>
      <View style={[styles.playerCircle, { backgroundColor: color }]}>
        <Text style={styles.playerNumber}>{label}</Text>
      </View>
      <Text style={styles.playerName} numberOfLines={1}>
        {lastName}
      </Text>
    </View>
  );
}

function AnimatedBorderPitch({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 1500, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.5)'],
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
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Cargando...</Text>
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

  // Away at top: GK at bottom of away half → reverse so attackers are at top
  const awayRowsDisplay = [...awayRowPlayers].reverse();
  // Home at bottom: GK at bottom → normal order (GK row first = bottom row via column-reverse)
  const homeRowsDisplay = homeRowPlayers;

  return (
    <AnimatedBorderPitch>
      <View style={styles.pitchInner}>
        {/* Pitch markings */}
        <View style={styles.penaltyTop} />
        <View style={styles.centerLine} />
        <View style={styles.centerCircle} />
        <View style={styles.penaltyBottom} />

        {noPlayers ? (
          <View style={styles.pendingOverlay}>
            <Text style={styles.pendingText}>
              {isUpcoming ? 'ALINEACIÓN\nPOSIBLE' : 'SIN\nALINEACIÓN'}
            </Text>
          </View>
        ) : (
          <View style={styles.playersContainer}>
            {/* Away team (top half) — red */}
            <View style={styles.teamHalf}>
              <Text style={[styles.teamLabel, { color: '#ef4444' }]} numberOfLines={1}>{awayTeam}</Text>
              {awayRowsDisplay.map((row, ri) => (
                <View key={`away-row-${ri}`} style={styles.playerRow}>
                  {row.map((p, pi) => (
                    <PlayerDot key={`away-${ri}-${pi}`} player={p} color="#ef4444" />
                  ))}
                </View>
              ))}
            </View>

            {/* Home team (bottom half) — blue */}
            <View style={[styles.teamHalf, { flexDirection: 'column-reverse' }]}>
              <Text style={[styles.teamLabel, { color: '#3b82f6' }]} numberOfLines={1}>{homeTeam}</Text>
              {homeRowsDisplay.map((row, ri) => (
                <View key={`home-row-${ri}`} style={styles.playerRow}>
                  {row.map((p, pi) => (
                    <PlayerDot key={`home-${ri}-${pi}`} player={p} color="#3b82f6" />
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
    backgroundColor: '#1a3a1a',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    flexShrink: 0,
  },
  pitchInner: {
    flex: 1,
    position: 'relative',
  },
  // Pitch markings
  penaltyTop: {
    position: 'absolute',
    top: 8,
    left: '18%',
    right: '18%',
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  penaltyBottom: {
    position: 'absolute',
    bottom: 8,
    left: '18%',
    right: '18%',
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  centerLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 44,
    height: 44,
    marginLeft: -22,
    marginTop: -22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  playerWrap: {
    alignItems: 'center',
    width: 28,
  },
  playerCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  playerNumber: {
    color: '#fff',
    fontSize: 6,
    fontWeight: '800',
  },
  playerName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 6,
    marginTop: 1,
    textAlign: 'center',
    maxWidth: 28,
  },
  teamLabel: {
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
    paddingHorizontal: 2,
  },
  // Pending overlay
  pendingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pendingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});

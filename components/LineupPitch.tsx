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
}

function parseFormation(f: string): number[] {
  return f.split('-').map(Number);
}

function PlayerDot({ player, color }: { player: Player; color: string }) {
  const label = player.number
    ? String(player.number)
    : player.name.split(' ').pop()?.slice(0, 5) ?? player.name.slice(0, 5);
  return (
    <View style={styles.playerWrap}>
      <View style={[styles.playerCircle, { backgroundColor: color }]}>
        <Text style={styles.playerNumber}>{label}</Text>
      </View>
      <Text style={styles.playerName} numberOfLines={1}>
        {player.name.split(' ').pop() ?? player.name}
      </Text>
    </View>
  );
}

function SkeletonPulse() {
  const anim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.skeleton, { opacity: anim }]} />
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
}: LineupPitchProps) {
  if (isLoading) {
    return <SkeletonPulse />;
  }

  const noPlayers = homePlayers.length === 0 && awayPlayers.length === 0;

  // Build rows arrays [GK, ...formation rows]
  // For home: GK at bottom row (index 0), attackers at top
  // For away: GK at top (index 0 flipped), attackers lower
  const homeRows = [1, ...parseFormation(homeFormation)];
  const awayRows = [1, ...parseFormation(awayFormation)];

  // Distribute players into rows
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

  // For rendering, away is at top (rows reversed: attackers first, GK last)
  // home is at bottom (rows reversed: attackers first, GK last)
  const awayRowsDisplay = [...awayRowPlayers].reverse(); // GK ends up at bottom of away half
  const homeRowsDisplay = homeRowPlayers; // GK at row 0 = bottom

  return (
    <View style={styles.pitch}>
      {/* Pitch markings */}
      <View style={styles.pitchInner}>
        {/* Top penalty area */}
        <View style={styles.penaltyTop} />
        {/* Center circle */}
        <View style={styles.centerCircle} />
        {/* Center line */}
        <View style={styles.centerLine} />
        {/* Bottom penalty area */}
        <View style={styles.penaltyBottom} />

        {noPlayers ? (
          <View style={styles.pendingOverlay}>
            <Text style={styles.pendingText}>Alineación pendiente</Text>
          </View>
        ) : (
          <View style={styles.playersContainer}>
            {/* Away team (top half) */}
            <View style={styles.teamHalf}>
              {awayRowsDisplay.map((row, ri) => (
                <View key={`away-row-${ri}`} style={styles.playerRow}>
                  {row.map((p, pi) => (
                    <PlayerDot key={`away-${ri}-${pi}`} player={p} color="#ef4444" />
                  ))}
                </View>
              ))}
              <Text style={styles.teamLabel} numberOfLines={1}>{awayTeam}</Text>
            </View>

            {/* Home team (bottom half) */}
            <View style={[styles.teamHalf, { flexDirection: 'column-reverse' }]}>
              {homeRowsDisplay.map((row, ri) => (
                <View key={`home-row-${ri}`} style={styles.playerRow}>
                  {row.map((p, pi) => (
                    <PlayerDot key={`home-${ri}-${pi}`} player={p} color="#3b82f6" />
                  ))}
                </View>
              ))}
              <Text style={[styles.teamLabel, { color: '#3b82f6' }]} numberOfLines={1}>{homeTeam}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pitch: {
    width: '100%',
    height: 280,
    backgroundColor: '#1a3a1a',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  pitchInner: {
    flex: 1,
    position: 'relative',
  },
  // Pitch markings
  penaltyTop: {
    position: 'absolute',
    top: 8,
    left: '20%',
    right: '20%',
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  penaltyBottom: {
    position: 'absolute',
    bottom: 8,
    left: '20%',
    right: '20%',
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
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
    borderRadius: 30,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  playerWrap: {
    alignItems: 'center',
    width: 40,
  },
  playerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  playerNumber: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '800',
  },
  playerName: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 7,
    marginTop: 2,
    textAlign: 'center',
    maxWidth: 40,
  },
  teamLabel: {
    color: '#ef4444',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
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
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  // Skeleton
  skeleton: {
    width: '100%',
    height: 280,
    backgroundColor: '#1f2937',
    borderRadius: 8,
  },
});

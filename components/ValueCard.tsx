import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors } from '@/constants/colors';

interface ValueCardProps {
  id: string;
  partido: string;
  market: string;
  cuotaOfrecida: string;
  cuotaJusta: string;
  percentageValue: number;
  resultado?: string;
  onPress?: () => void;
  containerStyle?: ViewStyle;
}

export const ValueCard: React.FC<ValueCardProps> = ({
  id,
  partido,
  market,
  cuotaOfrecida,
  cuotaJusta,
  percentageValue,
  resultado,
  onPress,
  containerStyle,
}) => {
  const getValueColor = (value: number) => {
    if (value >= 10) return colors.accent.green;
    if (value >= 5) return colors.accent.gold;
    return colors.accent.red;
  };

  const getResultColor = (result?: string) => {
    if (!result) return colors.text.muted;
    if (result === '+') return colors.accent.green;
    if (result === '-') return colors.accent.red;
    return colors.text.muted;
  };

  const getResultText = (result?: string) => {
    if (!result) return '-';
    return result;
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, containerStyle]}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.left}>
          <Text style={styles.partido}>{partido}</Text>
          <Text style={styles.market}>{market}</Text>
        </View>
        {resultado && (
          <View
            style={[
              styles.resultadoBadge,
              {
                backgroundColor:
                  resultado === '+'
                    ? 'rgba(0, 229, 160, 0.1)'
                    : 'rgba(255, 75, 110, 0.1)',
              },
            ]}
          >
            <Text style={{ color: getResultColor(resultado) }}>
              {getResultText(resultado)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.cuotaContainer}>
          <View style={styles.cuotaItem}>
            <Text style={styles.cuotaLabel}>Ofrecida</Text>
            <Text style={styles.cuotaValue}>{cuotaOfrecida}</Text>
          </View>
          <View style={styles.cuotaItem}>
            <Text style={styles.cuotaLabel}>Justa</Text>
            <Text style={styles.cuotaValue}>{cuotaJusta}</Text>
          </View>
        </View>

        <View
          style={[
            styles.valueBadge,
            {
              backgroundColor: getValueColor(percentageValue),
            },
          ]}
        >
          <Text style={styles.valueText}>+{percentageValue.toFixed(1)}%</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  left: {
    flex: 1,
  },
  partido: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  market: {
    color: colors.accent.blue,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  resultadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cuotaContainer: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  cuotaItem: {
    flex: 1,
  },
  cuotaLabel: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: '600',
  },
  cuotaValue: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 2,
  },
  valueBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    color: colors.bg.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
});

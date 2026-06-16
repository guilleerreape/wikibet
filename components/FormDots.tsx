import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface FormDotsProps {
  form: string[];
  label?: string;
}

const getColorForResult = (result: string): string => {
  switch (result) {
    case 'V':
      return colors.accent.green;
    case 'E':
      return colors.accent.gold;
    case 'D':
      return colors.accent.red;
    default:
      return colors.border.subtle;
  }
};

const getTextForResult = (result: string): string => {
  switch (result) {
    case 'V':
      return 'V';
    case 'E':
      return 'E';
    case 'D':
      return 'D';
    default:
      return '?';
  }
};

export const FormDots: React.FC<FormDotsProps> = ({
  form,
  label = 'Forma (últimos 10)',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.dotsContainer}>
        {form.map((result, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: getColorForResult(result) },
            ]}
          >
            <Text style={styles.dotText}>{getTextForResult(result)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  label: {
    fontSize: 13,
    color: colors.text.muted,
    fontWeight: '500',
    marginBottom: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dot: {
    flex: 1,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotText: {
    color: colors.bg.primary,
    fontWeight: 'bold',
    fontSize: 11,
  },
});

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Text,
} from 'react-native';
import { colors } from '@/constants/colors';
import { Competition } from '@/data/competitions';

interface CompetitionSelectorProps {
  competitions: Competition[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export const CompetitionSelector: React.FC<CompetitionSelectorProps> = ({
  competitions,
  selectedId,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Competiciones</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {competitions.map((comp) => (
          <TouchableOpacity
            key={comp.id}
            style={[
              styles.pill,
              selectedId === comp.id && styles.pillActive,
            ]}
            onPress={() => onSelect(comp.id)}
          >
            <Text style={styles.emoji}>{comp.emoji}</Text>
            <Text
              style={[
                styles.name,
                selectedId === comp.id && styles.nameActive,
              ]}
              numberOfLines={1}
            >
              {comp.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.bg.primary,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  scrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 6,
    minHeight: 40,
  },
  pillActive: {
    backgroundColor: colors.accent.green,
    borderColor: colors.accent.green,
  },
  emoji: {
    fontSize: 16,
  },
  name: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.primary,
    maxWidth: 90,
  },
  nameActive: {
    color: colors.bg.primary,
    fontWeight: '700',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface AICommentProps {
  comment: string;
  type?: 'analysis' | 'insight' | 'warning';
}

const getTypeStyles = (type: 'analysis' | 'insight' | 'warning') => {
  switch (type) {
    case 'analysis':
      return {
        backgroundColor: `${colors.accent.blue}20`,
        borderColor: colors.accent.blue,
        iconText: '📊',
      };
    case 'insight':
      return {
        backgroundColor: `${colors.accent.green}20`,
        borderColor: colors.accent.green,
        iconText: '💡',
      };
    case 'warning':
      return {
        backgroundColor: `${colors.accent.red}20`,
        borderColor: colors.accent.red,
        iconText: '⚠️',
      };
  }
};

export const AIComment: React.FC<AICommentProps> = ({
  comment,
  type = 'analysis',
}) => {
  const typeStyles = getTypeStyles(type);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: typeStyles.backgroundColor,
          borderColor: typeStyles.borderColor,
        },
      ]}
    >
      <Text style={styles.icon}>{typeStyles.iconText}</Text>
      <Text style={styles.text}>{comment}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    marginVertical: 8,
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 2,
  },
  text: {
    color: colors.text.primary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});

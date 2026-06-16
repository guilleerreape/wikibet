import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';

interface CenteredContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}

export const CenteredContainer: React.FC<CenteredContainerProps> = ({
  children,
  maxWidth = 600,
  style,
}) => {
  return (
    <View style={[styles.wrapper, { maxWidth }]}>
      <View style={[styles.container, style]}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignSelf: 'center',
  },
  container: {
    flex: 1,
  },
});

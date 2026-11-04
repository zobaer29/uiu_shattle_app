import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export function LiveShuttleMap() {
  return (
    <View style={styles.fallback}>
      <ThemedText style={styles.title}>Live map is available on web</ThemedText>
      <ThemedText style={styles.description}>
        Connect the shuttle GPS service to show live locations here.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#18202C',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    maxWidth: 280,
    marginTop: 8,
    color: '#B9BDC7',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});

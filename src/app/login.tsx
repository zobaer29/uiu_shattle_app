import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Navbar } from '@/components/navbar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  return (
    <ThemedView style={styles.container}>
      <Image
        accessibilityLabel="UIU campus shuttle at night"
        contentFit="cover"
        source={require('@/assets/images/logo/hero.png')}
        style={styles.backgroundImage}
      />
      <View pointerEvents="none" style={styles.backgroundOverlay} />
      <SafeAreaView style={styles.safeArea}>
        <Navbar />
        <View style={styles.content}>
          <View style={styles.formPanel}>
            <View style={styles.form}>
              <ThemedText type="subtitle" style={styles.title}>
                Welcome to UIU Shuttle
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                Your student shuttle dashboard is ready.
              </ThemedText>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue to student dashboard"
                onPress={() => router.replace('/student/dashboard')}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.submitText}>
                  Continue to dashboard
                </ThemedText>
              </Pressable>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <ThemedText type="linkPrimary">Back to home</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0E12',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5, 8, 18, 0.58)',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.five,
  },
  form: {
    width: '100%',
    maxWidth: 420,
  },
  formPanel: {
    width: '100%',
    maxWidth: 500,
    padding: Spacing.four,
    borderRadius: 24,
    backgroundColor: 'rgba(13, 14, 18, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  title: {
    textAlign: 'center',
    color: '#FFFFFF',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: Spacing.one,
    color: '#D5D7DD',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#FF6500',
    borderRadius: 10,
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  backButton: {
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  pressed: {
    opacity: 0.75,
  },
});

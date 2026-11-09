import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { Href, router, useCanGoBack } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Navbar } from '@/components/navbar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function LoginScreen() {
  const canGoBack = useCanGoBack();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function signIn() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://localhost:3001'}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        },
      );
      const result = await response.json() as { access_token?: string; user?: { id: string; role: string }; message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? 'Invalid username or password');
      }
      if (!result.user || !result.access_token) throw new Error('Invalid login response');

      await AsyncStorage.setItem('uiu_shuttle_token', result.access_token);
      await AsyncStorage.setItem('uiu_shuttle_user', JSON.stringify(result.user));

      const destination: Href = result.user.role === 'driver'
        ? ({ pathname: '/driver/dashboard', params: { driverId: result.user.id } } as unknown as Href)
        : ({ pathname: '/student/dashboard', params: { studentId: result.user.id } } as unknown as Href);
      router.replace(destination);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

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

              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Username or email"
                placeholderTextColor="#8D929D"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
              />
              <TextInput
                autoCapitalize="none"
                placeholder="Password"
                placeholderTextColor="#8D929D"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
              {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue to student dashboard"
                onPress={signIn}
                style={({ pressed }) => [
                  styles.submitButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText style={styles.submitText}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => (canGoBack ? router.back() : router.replace('/'))}
                style={styles.backButton}>
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
  input: {
    marginTop: Spacing.two,
    borderWidth: 1,
    borderColor: '#4A4D56',
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  error: {
    marginTop: Spacing.two,
    color: '#FF9A8B',
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

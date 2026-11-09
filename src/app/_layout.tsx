import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppStoreProvider } from '@/store/provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <AppStoreProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Stack screenOptions={{ headerShown: false }} />
      </ThemeProvider>
    </AppStoreProvider>
  );
}

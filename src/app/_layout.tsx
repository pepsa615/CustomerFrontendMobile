import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { useEffect } from 'react';

import { SessionProvider } from '@/providers/session-provider';
import '@/global.css';
import { startTelemetry } from '@/telemetry';

SplashScreen.preventAutoHideAsync();
startTelemetry();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SessionProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(app)" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </SessionProvider>
    </ThemeProvider>
  );
}

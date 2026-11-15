import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { useSession } from '@/providers/session-provider';
import { secureSession } from '@/storage/secure-session';

const MINIMUM_BRAND_SPLASH_MS = 900;

export default function EntryScreen() {
  const { accessToken, user, isRestoring } = useSession();

  useEffect(() => {
    if (isRestoring) return;
    let active = true;
    const startedAt = Date.now();

    void secureSession.readIntroComplete().then(async (introComplete) => {
      const remaining = Math.max(
        0,
        MINIMUM_BRAND_SPLASH_MS - (Date.now() - startedAt),
      );
      await new Promise((resolve) => setTimeout(resolve, remaining));
      if (!active) return;

      await SplashScreen.hideAsync();
      if (accessToken && user) {
        router.replace('/(app)/(tabs)');
      } else {
        router.replace(introComplete ? '/(auth)/login' : '/(auth)/intro');
      }
    });

    return () => {
      active = false;
    };
  }, [accessToken, isRestoring, user]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <StatusBar style="dark" />
      <View className="flex-row items-center gap-2">
        <Image
          source={require('../../assets/images/HDPI.png')}
          className="size-14"
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
        <Text className="text-3xl font-bold text-[#B00008]">Pepsa</Text>
      </View>
    </View>
  );
}

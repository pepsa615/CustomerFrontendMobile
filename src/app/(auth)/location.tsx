import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/controls';
import { apiRequest } from '@/api/client';
import { useSession } from '@/providers/session-provider';
import {
  peekPendingSelfie,
  takePendingSelfie,
} from '@/features/identity/setup-selfie-store';

export default function LocationPermission() {
  const { accessToken } = useSession();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function enable() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Location permission is required to finish setup.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const asset = takePendingSelfie() ?? peekPendingSelfie();
      if (!asset) {
        setError('Take a selfie before enabling location.');
        return;
      }
      const blob = await (await fetch(asset.uri)).blob();
      const body = new FormData();
      body.append('selfie', blob, asset.name);
      body.append('latitude', String(position.coords.latitude));
      body.append('longitude', String(position.coords.longitude));
      body.append('accuracyMeters', String(position.coords.accuracy ?? 1));
      body.append('capturedAt', new Date(position.timestamp).toISOString());
      body.append('consent', 'true');
      await apiRequest('/account/onboarding', accessToken, {
        method: 'POST',
        body,
      });
      router.replace('/(app)/(tabs)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-primary px-6">
      <Text className="text-center text-2xl font-bold text-white">
        Enable location
      </Text>
      <Text className="mt-3 text-center text-base text-white/90">
        We need your location to show potential matches nearby. Please enable
        location services.
      </Text>
      {error ? (
        <View className="mt-4 w-full">
          <Alert tone="danger">{error}</Alert>
        </View>
      ) : null}
      <Button
        disabled={loading}
        onPress={() => void enable()}
        className="mt-10 w-full bg-white"
      >
        Enable Location
      </Button>
    </View>
  );
}
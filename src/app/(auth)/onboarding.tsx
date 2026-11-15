import { useState } from 'react';
import { Image, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/controls';
import { apiRequest } from '@/api/client';
import { useSession } from '@/providers/session-provider';
export default function Onboarding() {
  const { accessToken } = useSession();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [error, setError] = useState('');
  async function camera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission was denied. Choose a photo instead.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled) setAsset(result.assets[0]);
  }
  async function library() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled) setAsset(result.assets[0]);
  }
  async function locate() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      setError('Location permission is required to finish setup.');
      return;
    }
    setLocation(
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
    );
  }
  async function submit() {
    if (!asset || !location || !accessToken) return;
    try {
      const blob = await (await fetch(asset.uri)).blob();
      const body = new FormData();
      body.append('selfie', blob, 'selfie.jpg');
      body.append('latitude', String(location.coords.latitude));
      body.append('longitude', String(location.coords.longitude));
      body.append('accuracyMeters', String(location.coords.accuracy ?? 1));
      body.append('capturedAt', new Date(location.timestamp).toISOString());
      body.append('consent', 'true');
      await apiRequest('/account/onboarding', accessToken, {
        method: 'POST',
        body,
      });
      router.replace('/(app)/(tabs)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Onboarding failed');
    }
  }
  return (
    <Screen
      title="Verify your identity"
      description="A one-time security check is required before your first transfer or bill payment. It takes about two minutes."
    >
      <View className="gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {asset ? (
          <Image
            source={{ uri: asset.uri }}
            className="aspect-square w-full rounded-3xl"
            accessibilityLabel="Selected selfie"
          />
        ) : (
          <View className="aspect-square rounded-3xl bg-surface-light dark:bg-surface-dark" />
        )}
        <Button onPress={camera}>Take selfie</Button>
        <Button variant="secondary" onPress={library}>
          Choose photo
        </Button>
        <Button variant="secondary" onPress={locate}>
          {location ? 'Location captured' : 'Use current location'}
        </Button>
        <Button disabled={!asset || !location} onPress={submit}>
          Complete verification
        </Button>
      </View>
    </Screen>
  );
}

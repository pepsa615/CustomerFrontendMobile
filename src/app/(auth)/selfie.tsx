import { useState } from 'react';
import { Image, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/controls';
import { setPendingSelfie } from '@/features/identity/setup-selfie-store';

export default function SelfieCapture() {
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState('');

  async function camera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      quality: 0.9,
      allowsEditing: true,
    });
    if (!result.canceled) setAsset(result.assets[0]);
  }

  function continueNext() {
    if (!asset) return;
    setPendingSelfie({
      uri: asset.uri,
      name: asset.fileName ?? 'selfie.jpg',
      type: asset.mimeType ?? 'image/jpeg',
    });
    router.push('/(auth)/selfie-review' as never);
  }

  return (
    <Screen title="Take a picture for Identification">
      <View className="items-center gap-6">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {asset ? (
          <Image
            source={{ uri: asset.uri }}
            className="size-56 rounded-full"
            accessibilityLabel="Selfie preview"
          />
        ) : (
          <View className="size-56 rounded-full border-[10px] border-border-light bg-surface-muted" />
        )}
        <Button onPress={() => void camera()}>Open camera</Button>
        <Button disabled={!asset} onPress={continueNext}>
          Continue
        </Button>
      </View>
    </Screen>
  );
}

import { Image, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { peekPendingSelfie } from '@/features/identity/setup-selfie-store';

export default function SelfieReview() {
  const asset = peekPendingSelfie();
  if (!asset) {
    router.replace('/(auth)/selfie' as never);
    return null;
  }

  return (
    <Screen title="Review selfie" description="">
      <View className="items-center gap-8">
        <Image
          source={{ uri: asset.uri }}
          className="h-[70vh] w-full rounded-3xl"
          accessibilityLabel="Selfie preview"
        />
        <Button onPress={() => router.push('/(auth)/location' as never)}>
          Continue
        </Button>
        <Button
          variant="secondary"
          onPress={() => router.replace('/(auth)/selfie' as never)}
        >
          Retake
        </Button>
      </View>
    </Screen>
  );
}

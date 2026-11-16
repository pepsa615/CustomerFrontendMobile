import { useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { PasswordInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/controls';
import { apiRequest } from '@/api/client';
import { useSession, type IdentityUser } from '@/providers/session-provider';
import { secureSession } from '@/storage/secure-session';

export default function SetupPin() {
  const { accessToken, user, acceptSession } = useSession();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    if (!accessToken || !user) return;
    if (pin !== confirm) {
      setError('PINs do not match');
      return;
    }
    try {
      const data = await apiRequest<{ user: IdentityUser }>(
        '/account/transaction-pin',
        accessToken,
        { method: 'POST', body: JSON.stringify({ pin, confirmPin: confirm }) },
      );
      const refreshToken = (await secureSession.readRefreshToken()) ?? '';
      await acceptSession({ accessToken, refreshToken, user: data.user });
      router.replace('/(auth)/selfie' as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save PIN');
    }
  }

  return (
    <Screen
      title="Set your transaction pin"
      description="Create 4 digit transaction pin"
    >
      <View className="gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <PasswordInput
          accessibilityLabel="Transaction Pin"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          value={pin}
          onChangeText={(value) => setPin(value.replace(/\D/g, '').slice(0, 4))}
        />
        <PasswordInput
          accessibilityLabel="Confirm Transaction Pin"
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          value={confirm}
          onChangeText={(value) =>
            setConfirm(value.replace(/\D/g, '').slice(0, 4))
          }
        />
        <Button
          disabled={pin.length !== 4 || confirm.length !== 4}
          onPress={() => void submit()}
        >
          Continue
        </Button>
      </View>
    </Screen>
  );
}

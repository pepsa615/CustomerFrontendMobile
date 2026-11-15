import { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { OtpInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/controls';
import { apiRequest } from '@/api/client';
import { useSession, type IdentityUser } from '@/providers/session-provider';
export default function VerifyEmail() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { acceptSession } = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  async function submit() {
    const submittedCode = code.replace(/\D/g, '').slice(0, 6);
    try {
      const data = await apiRequest<{
        accessToken: string;
        refreshToken: string;
        user: IdentityUser;
      }>('/auth/register/verify-otp', undefined, {
        method: 'POST',
        body: JSON.stringify({
          registrationToken: token,
          code: submittedCode,
          sessionTransport: 'token',
          platform: 'ios',
          deviceName: 'PEPSA mobile app',
        }),
      });
      await acceptSession(data);
      router.replace('/(app)/(tabs)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verification failed');
    }
  }
  return (
    <Screen
      title="Verify your email"
      description="Enter the six-digit code sent to your email."
    >
      <View className="gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <OtpInput value={code} onChangeText={setCode} />
        <Button disabled={code.length !== 6} onPress={submit}>
          Verify and continue
        </Button>
      </View>
    </Screen>
  );
}

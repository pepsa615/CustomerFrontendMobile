import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { OtpInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/controls';
import { apiRequest } from '@/api/client';
import { useSession, type IdentityUser } from '@/providers/session-provider';
import { secureSession } from '@/storage/secure-session';

export default function VerifyPhone() {
  const { accessToken, user, acceptSession } = useSession();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const primed = useRef(false);

  useEffect(() => {
    if (!accessToken || !user || primed.current) return;
    if (user.phoneVerified) {
      router.replace('/(auth)/setup-pin' as never);
      return;
    }
    primed.current = true;
    void apiRequest('/account/phone', accessToken, {
      method: 'POST',
      body: JSON.stringify({ phone: user.phone }),
    }).catch(() => undefined);
  }, [accessToken, user]);

  async function submit() {
    if (!accessToken || !user) return;
    try {
      const data = await apiRequest<{ user: IdentityUser }>(
        '/account/phone/verify-otp',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({ code: code.replace(/\D/g, '').slice(0, 6) }),
        },
      );
      const refreshToken = (await secureSession.readRefreshToken()) ?? '';
      await acceptSession({
        accessToken,
        refreshToken,
        user: data.user,
      });
      router.replace('/(auth)/setup-pin' as never);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Verification failed');
    }
  }

  return (
    <Screen
      title="Verify your phone"
      description="We sent a 6 digit code to your phone number."
    >
      <View className="gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <OtpInput value={code} onChangeText={setCode} />
        <Button disabled={code.length !== 6} onPress={() => void submit()}>
          Continue
        </Button>
      </View>
    </Screen>
  );
}

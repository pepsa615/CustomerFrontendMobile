import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Input, OtpInput, PasswordInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/controls';
import { apiRequest } from '@/api/client';
export default function Recovery() {
  const [step, setStep] = useState(0);
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function next() {
    try {
      if (step === 0) {
        await apiRequest('/auth/password-recovery/request', undefined, {
          method: 'POST',
          body: JSON.stringify({ identifier }),
        });
        setStep(1);
      } else if (step === 1) {
        const data = await apiRequest<{ recoveryToken: string }>(
          '/auth/password-recovery/verify',
          undefined,
          { method: 'POST', body: JSON.stringify({ identifier, code }) },
        );
        setToken(data.recoveryToken);
        setStep(2);
      } else {
        await apiRequest('/auth/password-recovery/reset', undefined, {
          method: 'POST',
          body: JSON.stringify({ recoveryToken: token, password }),
        });
        router.replace('/(auth)/login');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not continue');
    }
  }
  return (
    <Screen
      title={
        step === 0
          ? 'Forgot password'
          : step === 1
            ? 'Check your email'
            : 'New password'
      }
      description="We’ll securely verify your account before changing your password."
    >
      <View className="gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        {step === 0 ? (
          <Input
            accessibilityLabel="Email or phone"
            value={identifier}
            onChangeText={setIdentifier}
          />
        ) : null}
        {step === 1 ? <OtpInput value={code} onChangeText={setCode} /> : null}
        {step === 2 ? (
          <PasswordInput
            accessibilityLabel="New password"
            value={password}
            onChangeText={setPassword}
          />
        ) : null}
        <Button onPress={next}>Continue</Button>
      </View>
    </Screen>
  );
}

import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Input, PasswordInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/controls';
import { useSession } from '@/providers/session-provider';
import { ApiError } from '@/api/client';
export default function LoginScreen() {
  const { login, unlockWithBiometrics } = useSession();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true);
    setError('');
    try {
      const user = await login(identifier, password);
      router.replace(
        user.onboardingStatus === 'COMPLETE'
          ? '/(app)/(tabs)'
          : '/(auth)/onboarding',
      );
    } catch (cause) {
      if (
        cause instanceof ApiError &&
        cause.code === 'EMAIL_VERIFICATION_REQUIRED'
      ) {
        const token = (
          cause.details as { registrationToken?: string } | undefined
        )?.registrationToken;
        router.push({
          pathname: '/(auth)/verify-email',
          params: token ? { token } : {},
        });
      } else setError(cause instanceof Error ? cause.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }
  return (
    <Screen
      title="Welcome Back"
      description="Enter your phone number or email and password to continue."
    >
      <View className="gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Input
          accessibilityLabel="Email or phone"
          autoCapitalize="none"
          autoComplete="username"
          value={identifier}
          onChangeText={setIdentifier}
        />
        <PasswordInput
          accessibilityLabel="Password"
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
        />
        <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
          <Text className="text-right font-medium text-primary-light dark:text-primary-dark">
            Forgot password?
          </Text>
        </Pressable>
        <Button disabled={loading} onPress={submit}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
        <Button
          variant="secondary"
          onPress={() =>
            unlockWithBiometrics().then(
              (ok) => ok && router.replace('/(app)/(tabs)'),
            )
          }
        >
          Unlock with biometrics
        </Button>
        <Pressable onPress={() => router.push('/(auth)/sign-up')}>
          <Text className="text-center text-muted-light dark:text-muted-dark">
            Don’t have an account?{' '}
            <Text className="font-semibold text-primary-light dark:text-primary-dark">
              Sign up
            </Text>
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

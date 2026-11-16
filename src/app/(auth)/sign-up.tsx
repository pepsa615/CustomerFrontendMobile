import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Input, PasswordInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, Radio, Switch } from '@/components/ui/controls';
import { apiRequest } from '@/api/client';
export default function SignUp() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dob: '',
    gender: 'FEMALE',
    password: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [indemnityAccepted, setIndemnityAccepted] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function submit() {
    setError('');
    try {
      const data = await apiRequest<{ registrationToken: string }>(
        '/auth/register',
        undefined,
        {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            termsAccepted,
            privacyAccepted,
            indemnityAccepted,
          }),
        },
      );
      router.push({
        pathname: '/(auth)/verify-email',
        params: { token: data.registrationToken },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Registration failed');
    }
  }
  return (
    <Screen
      title="Create your account"
      description="You must be at least 18 years old."
    >
      <View className="gap-4">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input
              accessibilityLabel="First name"
              value={form.firstName}
              onChangeText={set('firstName')}
            />
          </View>
          <View className="flex-1">
            <Input
              accessibilityLabel="Last name"
              value={form.lastName}
              onChangeText={set('lastName')}
            />
          </View>
        </View>
        <Input
          accessibilityLabel="Phone number"
          keyboardType="phone-pad"
          value={form.phone}
          onChangeText={set('phone')}
        />
        <Input
          accessibilityLabel="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.email}
          onChangeText={set('email')}
        />
        <Input
          accessibilityLabel="Date of birth (YYYY-MM-DD)"
          value={form.dob}
          onChangeText={set('dob')}
        />
        <Text className="font-medium text-foreground-light dark:text-foreground-dark">
          Gender
        </Text>
        <Radio
          selected={form.gender === 'FEMALE'}
          onPress={() => set('gender')('FEMALE')}
          label="Female"
        />
        <Radio
          selected={form.gender === 'MALE'}
          onPress={() => set('gender')('MALE')}
          label="Male"
        />
        <PasswordInput
          accessibilityLabel="Password"
          value={form.password}
          onChangeText={set('password')}
        />
        <Switch value={termsAccepted} onValueChange={setTermsAccepted} label="I accept the Terms and Conditions" />
        <Switch value={privacyAccepted} onValueChange={setPrivacyAccepted} label="I accept the Privacy Policy" />
        <Switch value={indemnityAccepted} onValueChange={setIndemnityAccepted} label="I accept the Indemnity Agreement" />
        <Button disabled={!termsAccepted || !privacyAccepted || !indemnityAccepted} onPress={submit}>
          Create account
        </Button>
      </View>
    </Screen>
  );
}

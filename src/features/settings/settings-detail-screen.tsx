import { useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Alert, Switch } from '@/components/ui/controls';
import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/input';
import { useSession } from '@/providers/session-provider';
import { secureSession } from '@/storage/secure-session';
import { settingsApi, type AccountProfile } from './api';
const config = {
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? 'support@pepsa.co',
  chat: process.env.EXPO_PUBLIC_SUPPORT_CHAT_URL,
  terms: process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://pepsa.co/terms',
  privacy: process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://pepsa.co/privacy',
};
export function SettingsDetailScreen({ section }: { section: string }) {
  const { accessToken, logout, setBiometricsEnabled } = useSession();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [message, setMessage] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [reset, setReset] = useState(false);
  const [bio, setBio] = useState(false);
  const set = (k: string, v: string) => setValues((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    if (accessToken)
      settingsApi
        .profile(accessToken)
        .then(setProfile)
        .catch((e) =>
          setMessage(e instanceof Error ? e.message : 'Could not load profile'),
        );
    secureSession.readBiometricEnabled().then(setBio);
  }, [accessToken]);
  if (!accessToken) return null;
  const token = accessToken;
  const title =
    {
      personal: 'Personal information',
      password: 'Change password',
      payment: 'Payment settings',
      biometrics: 'Biometrics',
      faq: 'FAQ',
      support: 'Customer support',
      about: 'About',
      deactivate: 'Close account',
    }[section] ?? 'Settings';
  async function updateName() {
    try {
      const p = await settingsApi.update(
        token,
        values.name ?? profile?.fullName ?? '',
      );
      setProfile(p);
      setMessage('Personal information updated.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Update failed');
    }
  }
  async function password() {
    if (values.new !== values.confirm)
      return setMessage('Passwords do not match.');
    try {
      await settingsApi.password(token, values.current ?? '', values.new ?? '');
      await logout();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Password change failed');
    }
  }
  async function pin() {
    if (values.newPin !== values.confirmPin)
      return setMessage('PINs do not match.');
    try {
      await settingsApi.pin(
        token,
        values.currentPin ?? '',
        values.newPin ?? '',
      );
      setMessage('Transaction PIN changed.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'PIN change failed');
    }
  }
  async function requestPin() {
    try {
      await settingsApi.requestPin(token);
      setReset(true);
      setMessage('A code was sent to your email.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Request failed');
    }
  }
  async function resetPin() {
    try {
      await settingsApi.resetPin(token, values.code ?? '', values.newPin ?? '');
      setReset(false);
      setMessage('Transaction PIN reset.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'PIN reset failed');
    }
  }
  async function toggleBio(value: boolean) {
    if (value) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) {
        setMessage('Biometrics are not available or enrolled on this device.');
        return;
      }
    }
    await setBiometricsEnabled(value);
    setBio(value);
  }
  async function deactivate() {
    if (!reset) {
      await settingsApi.requestDeactivation(token);
      setReset(true);
      setMessage('A code was sent to your email.');
      return;
    }
    try {
      await settingsApi.deactivate(token, values.code ?? '');
      await secureSession.clearAll();
      await logout();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Deactivation failed');
    }
  }
  return (
    <Screen
      title={title}
      action={
        <Button variant="ghost" onPress={() => router.back()}>
          Back
        </Button>
      }
    >
      {message ? <Alert>{message}</Alert> : null}
      {section === 'personal' ? (
        <Card>
          <Field label="Full name">
            <Input
              value={values.name ?? profile?.fullName ?? ''}
              onChangeText={(v) => set('name', v)}
            />
          </Field>
          <Data label="PEPSA account" value={profile?.accountNumber} />
          <Data label="Mobile number" value={profile?.phone} />
          <Data label="Gender" value={profile?.gender} />
          <Data
            label="Date of birth"
            value={profile ? new Date(profile.dob).toLocaleDateString() : null}
          />
          <Data label="Email" value={profile?.email} />
          <Data label="NIN" value={profile?.maskedNin ?? 'Not provided'} />
          <Button onPress={updateName}>Save name</Button>
        </Card>
      ) : null}
      {section === 'password' ? (
        <Card className="gap-4">
          <Field label="Current password">
            <PasswordInput
              value={values.current ?? ''}
              onChangeText={(v) => set('current', v)}
            />
          </Field>
          <Field label="New password">
            <PasswordInput
              value={values.new ?? ''}
              onChangeText={(v) => set('new', v)}
            />
          </Field>
          <Field label="Confirm new password">
            <PasswordInput
              value={values.confirm ?? ''}
              onChangeText={(v) => set('confirm', v)}
            />
          </Field>
          <Button onPress={password}>Save and sign in again</Button>
        </Card>
      ) : null}
      {section === 'payment' ? (
        <Card className="gap-4">
          {reset ? (
            <>
              <Field label="Six-digit code">
                <Input
                  keyboardType="number-pad"
                  maxLength={6}
                  value={values.code ?? ''}
                  onChangeText={(v) => set('code', v)}
                />
              </Field>
              <Field label="New PIN">
                <PasswordInput
                  keyboardType="number-pad"
                  maxLength={4}
                  value={values.newPin ?? ''}
                  onChangeText={(v) => set('newPin', v)}
                />
              </Field>
              <Button onPress={resetPin}>Reset PIN</Button>
            </>
          ) : (
            <>
              <Field label="Current PIN">
                <PasswordInput
                  keyboardType="number-pad"
                  maxLength={4}
                  value={values.currentPin ?? ''}
                  onChangeText={(v) => set('currentPin', v)}
                />
              </Field>
              <Field label="New PIN">
                <PasswordInput
                  keyboardType="number-pad"
                  maxLength={4}
                  value={values.newPin ?? ''}
                  onChangeText={(v) => set('newPin', v)}
                />
              </Field>
              <Field label="Confirm new PIN">
                <PasswordInput
                  keyboardType="number-pad"
                  maxLength={4}
                  value={values.confirmPin ?? ''}
                  onChangeText={(v) => set('confirmPin', v)}
                />
              </Field>
              <Button onPress={pin}>Save</Button>
              <Button variant="ghost" onPress={requestPin}>
                Forgot transaction PIN?
              </Button>
            </>
          )}
        </Card>
      ) : null}
      {section === 'biometrics' ? (
        <Card>
          <Switch
            label="Use biometrics to unlock PEPSA"
            value={bio}
            onValueChange={toggleBio}
          />
          <Text className="mt-3 text-muted-light dark:text-muted-dark">
            Biometrics never approve payments or transfers.
          </Text>
        </Card>
      ) : null}
      {section === 'faq' ? (
        <Card>
          <Faq
            q="How do I place an order?"
            a="Open Orders, add pickup, delivery and parcel details, then review the server-provided quote."
          />
          <Faq
            q="Can biometrics approve a transfer?"
            a="No. Your transaction PIN remains required."
          />
          <Faq
            q="How do I track a delivery?"
            a="Open the order detail screen for its latest status."
          />
        </Card>
      ) : null}
      {section === 'support' ? (
        <Card className="gap-4">
          <Button
            variant="secondary"
            onPress={() => Linking.openURL(`mailto:${config.supportEmail}`)}
          >
            Email {config.supportEmail}
          </Button>
          {config.chat ? (
            <Button
              variant="secondary"
              onPress={() => Linking.openURL(config.chat!)}
            >
              Open support chat
            </Button>
          ) : null}
        </Card>
      ) : null}
      {section === 'about' ? (
        <Card className="gap-4">
          <Button
            variant="secondary"
            onPress={() => Linking.openURL(config.terms)}
          >
            Terms and conditions
          </Button>
          <Button
            variant="secondary"
            onPress={() => Linking.openURL(config.privacy)}
          >
            Privacy policy
          </Button>
          <Text className="text-muted-light dark:text-muted-dark">
            PEPSA Customer {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </Card>
      ) : null}
      {section === 'deactivate' ? (
        <Card className="gap-4">
          <Alert tone="danger">
            Closing your account immediately disables login and revokes every
            device. Required financial and audit records are retained.
          </Alert>
          {reset ? (
            <Field label="Six-digit code">
              <Input
                keyboardType="number-pad"
                maxLength={6}
                value={values.code ?? ''}
                onChangeText={(v) => set('code', v)}
              />
            </Field>
          ) : null}
          <Button variant="danger" onPress={deactivate}>
            {reset ? 'Deactivate account' : 'Send verification code'}
          </Button>
        </Card>
      ) : null}
    </Screen>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="font-medium text-foreground-light dark:text-foreground-dark">
        {label}
      </Text>
      {children}
    </View>
  );
}
function Data({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="flex-row justify-between gap-3 border-b border-border-light py-3 dark:border-border-dark">
      <Text className="text-muted-light dark:text-muted-dark">{label}</Text>
      <Text className="text-foreground-light dark:text-foreground-dark">
        {value || '—'}
      </Text>
    </View>
  );
}
function Faq({ q, a }: { q: string; a: string }) {
  return (
    <View className="border-b border-border-light py-4 dark:border-border-dark">
      <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
        {q}
      </Text>
      <Text className="mt-2 text-muted-light dark:text-muted-dark">{a}</Text>
    </View>
  );
}

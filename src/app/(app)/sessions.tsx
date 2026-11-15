import { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, Switch } from '@/components/ui/controls';
import { apiRequest } from '@/api/client';
import { useSession } from '@/providers/session-provider';
type DeviceSession = {
  id: string;
  deviceName?: string;
  platform?: string;
  lastUsedAt: string;
};
export default function Sessions() {
  const { accessToken, logout, setBiometricsEnabled } = useSession();
  const [items, setItems] = useState<DeviceSession[]>([]);
  const [error, setError] = useState('');
  const [biometric, setBiometric] = useState(false);
  const load = useCallback(
    () =>
      apiRequest<DeviceSession[]>('/auth/sessions', accessToken ?? undefined)
        .then(setItems)
        .catch((cause) =>
          setError(
            cause instanceof Error ? cause.message : 'Could not load sessions',
          ),
        ),
    [accessToken],
  );
  useEffect(() => {
    load();
  }, [load]);
  async function revoke(id: string) {
    await apiRequest(`/auth/sessions/${id}`, accessToken ?? undefined, {
      method: 'DELETE',
    });
    load();
  }
  async function all() {
    await apiRequest('/auth/sessions/all', accessToken ?? undefined, {
      method: 'DELETE',
    });
    await logout();
    router.replace('/(auth)/login');
  }
  return (
    <Screen
      title="Devices and sessions"
      description="Review and revoke devices signed in to your account."
    >
      <View className="gap-3">
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Card>
          <Switch
            value={biometric}
            onValueChange={(value) => {
              setBiometric(value);
              setBiometricsEnabled(value);
            }}
            label="Use biometrics to unlock PEPSA"
          />
        </Card>
        {items.map((item) => (
          <Card key={item.id}>
            <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
              {item.deviceName || item.platform || 'Unknown device'}
            </Text>
            <Text className="my-2 text-muted-light dark:text-muted-dark">
              Last active {new Date(item.lastUsedAt).toLocaleString()}
            </Text>
            <Button variant="secondary" onPress={() => revoke(item.id)}>
              Revoke
            </Button>
          </Card>
        ))}
        <Button variant="danger" onPress={all}>
          Sign out everywhere
        </Button>
      </View>
    </Screen>
  );
}

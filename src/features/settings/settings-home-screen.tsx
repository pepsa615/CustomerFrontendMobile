import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/providers/session-provider';
const rows = [
  ['personal', 'Personal information'],
  ['password', 'Change password'],
  ['payment', 'Payment settings'],
  ['biometrics', 'Biometrics'],
  ['faq', 'FAQ'],
  ['support', 'Customer support'],
  ['about', 'About'],
  ['deactivate', 'Close account'],
] as const;
export function SettingsHomeScreen() {
  const { user, logout } = useSession();
  return (
    <Screen title="Profile" description={user?.fullName}>
      <Card>
        <View className="mb-4 size-16 items-center justify-center rounded-full bg-primary-light/10">
          <Text className="text-2xl font-bold text-primary-light">
            {user?.fullName?.[0] ?? 'P'}
          </Text>
        </View>
        {rows.map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/(app)/settings/[section]',
                params: { section: key },
              } as unknown as Href)
            }
            className="min-h-14 flex-row items-center border-b border-border-light py-4 dark:border-border-dark"
          >
            <Text className="flex-1 text-foreground-light dark:text-foreground-dark">
              {label}
            </Text>
            <Text accessibilityElementsHidden className="text-muted-light">
              ›
            </Text>
          </Pressable>
        ))}
      </Card>
      <Button variant="ghost" onPress={logout}>
        Log out
      </Button>
    </Screen>
  );
}

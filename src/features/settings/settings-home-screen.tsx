import { Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/providers/session-provider';

const personal = [
  ['personal', 'Personal information'],
  ['address', 'Address'],
  ['preferences', 'Preferences'],
] as const;

const more = [
  ['referrals', 'Referrals'],
  ['security', 'Settings'],
  ['faq', 'FAQs'],
  ['support', 'Customer support'],
  ['about', 'About'],
] as const;

function MenuGroup({
  title,
  rows,
}: {
  title: string;
  rows: readonly (readonly [string, string])[];
}) {
  return (
    <View className="rounded-3xl border border-primary-light/15 bg-primary-light/5 p-3 dark:border-primary-dark/20 dark:bg-primary-dark/10">
      <Text className="mb-2 px-2 text-xs font-bold uppercase text-muted-light dark:text-muted-dark">
        {title}
      </Text>
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
          className="mb-2 min-h-14 flex-row items-center rounded-2xl border border-border-light bg-surface-light px-4 dark:border-border-dark dark:bg-surface-dark"
        >
          <Text className="flex-1 font-semibold text-foreground-light dark:text-foreground-dark">
            {label}
          </Text>
          <Text accessibilityElementsHidden className="text-muted-light">
            ›
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SettingsHomeScreen() {
  const { user, logout } = useSession();
  return (
    <Screen title="Profile" description={user?.fullName}>
      <Card className="items-center">
        <View className="mb-3 size-20 items-center justify-center rounded-full bg-primary-light/10 dark:bg-primary-dark/15">
          <Text className="text-2xl font-bold text-primary-light dark:text-primary-dark">
            {user?.fullName?.[0] ?? 'P'}
          </Text>
        </View>
        <Text className="text-xl font-bold text-foreground-light dark:text-foreground-dark">
          {user?.fullName ?? 'Your profile'}
        </Text>
      </Card>
      <View className="mt-4 gap-4">
        <MenuGroup title="Personal details" rows={personal} />
        <Button
          variant="secondary"
          onPress={() => router.push('/(app)/business')}
        >
          Business profile
        </Button>
        <MenuGroup title="More" rows={more} />
      </View>
      <Button variant="ghost" className="mt-4" onPress={logout}>
        Log out
      </Button>
    </Screen>
  );
}

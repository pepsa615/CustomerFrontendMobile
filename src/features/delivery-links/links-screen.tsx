import { useCallback, useMemo, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/state';
import { useSession } from '@/providers/session-provider';
import { linksApi, money, type Link, type Draft } from './api';

const pickupOptions = [
  { value: 'customer' as const, label: 'Pickup from customer' },
  { value: 'business' as const, label: 'From my business address' },
];

const payerOptions = [
  { value: 'customer' as const, label: 'Payment from customer' },
  { value: 'vendor' as const, label: 'Paying from my Pepsa wallet' },
];

function summaryBody(pickup: 'customer' | 'business', payer: 'customer' | 'vendor') {
  if (pickup === 'customer' && payer === 'customer') {
    return 'Your customer schedules pickup and pays delivery charges.';
  }
  if (pickup === 'customer' && payer === 'vendor') {
    return 'Customer schedules pickup; you pay from your PEPSA wallet.';
  }
  if (pickup === 'business' && payer === 'customer') {
    return 'Pickup from your shop; customer pays delivery.';
  }
  return 'Pickup from your shop; you pay from your PEPSA wallet.';
}

export function LinksScreen() {
  const router = useRouter();
  const { accessToken } = useSession();
  const [links, setLinks] = useState<Link[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pickup, setPickup] = useState<'customer' | 'business'>('customer');
  const [payer, setPayer] = useState<'customer' | 'vendor'>('customer');
  const [profileReady, setProfileReady] = useState(false);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    if (!accessToken) return;
    linksApi
      .business(accessToken)
      .then(() => {
        setProfileReady(true);
      })
      .catch(() => {
        setProfileReady(false);
        setMessage('Set your business profile to enable delivery links.');
      });
    linksApi
      .links(accessToken)
      .then(setLinks)
      .catch(() => undefined);
    linksApi
      .drafts(accessToken)
      .then(setDrafts)
      .catch(() => undefined);
  }, [accessToken]);

  useFocusEffect(load);

  const selected = useMemo(
    () =>
      links.find(
        (link) => link.pickupSource === pickup && link.paymentBy === payer,
      ),
    [links, pickup, payer],
  );

  async function sendOut(id: string) {
    if (!accessToken || pin.length !== 4) {
      setMessage('Enter your four-digit transaction PIN.');
      return;
    }
    try {
      await linksApi.sendOut(accessToken, id, pin);
      setMessage('Draft sent out successfully.');
      setPin('');
      load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Send-out failed');
    }
  }

  const active = Boolean(selected?.active && profileReady);

  return (
    <Screen
      title="Delivery link"
      description="Share a link with your customer by need"
    >
      {message ? <Alert>{message}</Alert> : null}
      {!profileReady ? (
        <Alert>
          Complete your business profile to copy and share links.
          <View className="mt-3">
            <Button onPress={() => router.push('/(app)/business')}>
              Set your profile
            </Button>
          </View>
        </Alert>
      ) : null}
      <Card>
        <Text className="text-sm text-muted-light dark:text-muted-dark">
          Share link with customer by need?
        </Text>
        <Text className="mt-4 font-semibold text-foreground-light dark:text-foreground-dark">
          Pickup source
        </Text>
        <View className="mt-2 gap-2">
          {pickupOptions.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              selected={pickup === option.value}
              onPress={() => setPickup(option.value)}
            />
          ))}
        </View>
        <Text className="mt-4 font-semibold text-foreground-light dark:text-foreground-dark">
          Who is paying for delivery
        </Text>
        <View className="mt-2 gap-2">
          {payerOptions.map((option) => (
            <OptionRow
              key={option.value}
              label={option.label}
              selected={payer === option.value}
              onPress={() => setPayer(option.value)}
            />
          ))}
        </View>
        <View className="my-5 flex-row gap-3 border-b border-border-light pb-5 dark:border-border-dark">
          <View className="rounded-xl bg-primary-light/10 px-3 py-2 dark:bg-primary-dark/20">
            <Text className="text-lg text-primary-light dark:text-primary-dark">⛓</Text>
          </View>
          <View className="flex-1">
            <Text className="font-bold text-foreground-light dark:text-foreground-dark">
              {pickup === 'customer' ? 'Customer sends the item' : 'You send the item'}{' '}
              &amp; {payer === 'customer' ? 'customer pays' : 'you pay'}
            </Text>
            <Text className="mt-1 text-sm text-muted-light dark:text-muted-dark">
              {summaryBody(pickup, payer)}
            </Text>
          </View>
        </View>
        <Button
          disabled={!active}
          onPress={async () => {
            if (!selected) return;
            await Clipboard.setStringAsync(selected.url);
            setMessage('Delivery link copied.');
          }}
        >
          Copy the link
        </Button>
        <Pressable
          className="mt-4 flex-row items-center justify-center gap-2"
          disabled={!active}
          onPress={async () => {
            if (!selected) return;
            try {
              await Share.share({ message: selected.url, title: 'Delivery link' });
            } catch {
              await Clipboard.setStringAsync(selected.url);
              setMessage('Delivery link copied.');
            }
          }}
        >
          <Text className="text-sm font-semibold text-primary-light dark:text-primary-dark">
            Share the link ↗
          </Text>
        </Pressable>
      </Card>
      <Text className="text-xl font-bold text-foreground-light dark:text-foreground-dark">
        Draft orders
      </Text>
      {drafts.length ? (
        <View className="gap-3">
          {drafts.map((draft) => (
            <Card key={draft.id}>
              <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
                Draft #{draft.id}
              </Text>
              <Text className="text-muted-light dark:text-muted-dark">
                {draft.pickup.address} → {draft.delivery.address}
              </Text>
              <Text className="my-2 text-foreground-light dark:text-foreground-dark">
                {draft.paymentStatus} · {money(draft.amount)}
              </Text>
              <Input
                accessibilityLabel="Transaction PIN"
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                value={pin}
                onChangeText={(value) =>
                  setPin(value.replace(/\D/g, '').slice(0, 4))
                }
              />
              <View className="mt-3">
                <Button onPress={() => sendOut(draft.id)}>Send out</Button>
              </View>
            </Card>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No draft orders"
          description="Customer submissions will appear here."
        />
      )}
    </Screen>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`rounded-xl border px-4 py-3 ${
        selected
          ? 'border-primary-light bg-primary-light/10 dark:border-primary-dark dark:bg-primary-dark/15'
          : 'border-border-light dark:border-border-dark'
      }`}
      onPress={onPress}
    >
      <Text className="font-medium text-foreground-light dark:text-foreground-dark">
        {label}
      </Text>
    </Pressable>
  );
}
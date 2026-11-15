import { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, Radio } from '@/components/ui/controls';
import { EmptyState } from '@/components/ui/state';
import { useSession } from '@/providers/session-provider';
import { shareDeliveryLink } from '@/utils/share';
import { linksApi, money, type Link, type Draft } from './api';
export function LinksScreen() {
  const { accessToken } = useSession();
  const [links, setLinks] = useState<Link[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [pickup, setPickup] = useState<'customer' | 'business'>('customer');
  const [payer, setPayer] = useState<'customer' | 'vendor'>('customer');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(() => {
    if (!accessToken) return;
    linksApi
      .links(accessToken)
      .then(setLinks)
      .catch(() => setMessage('Complete your business profile first.'));
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
  return (
    <Screen
      title="Delivery link"
      description="Share a link with your customer by need"
    >
      {message ? <Alert>{message}</Alert> : null}
      <Card>
        <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
          Pickup source
        </Text>
        <Radio
          label="Pickup from customer"
          selected={pickup === 'customer'}
          onPress={() => setPickup('customer')}
        />
        <Radio
          label="From my business address"
          selected={pickup === 'business'}
          onPress={() => setPickup('business')}
        />
        <Text className="mt-4 font-semibold text-foreground-light dark:text-foreground-dark">
          Who is paying for delivery
        </Text>
        <Radio
          label="Payment from customer"
          selected={payer === 'customer'}
          onPress={() => setPayer('customer')}
        />
        <Radio
          label="From my PEPSA wallet"
          selected={payer === 'vendor'}
          onPress={() => setPayer('vendor')}
        />
        <View className="my-4 rounded-2xl border border-primary-light/20 bg-primary-light/5 p-4">
          <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
            {pickup === 'customer'
              ? 'Customer sends the item'
              : 'You send the item'}{' '}
            &amp; {payer === 'customer' ? 'pays the cost' : 'you pay the cost'}
          </Text>
        </View>
        <View className="gap-3">
          <Button
            disabled={!selected?.active}
            onPress={async () => {
              if (!selected) return;
              await Clipboard.setStringAsync(selected.url);
              setMessage('Delivery link copied.');
            }}
          >
            Copy the link
          </Button>
          <Button
            variant="secondary"
            disabled={!selected?.active}
            onPress={() => selected && shareDeliveryLink(selected.url)}
          >
            Share the link
          </Button>
        </View>
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

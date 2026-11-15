import { useCallback, useEffect, useState } from 'react';
import { Linking, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/state';
import { useSession } from '@/providers/session-provider';
import { money, ordersApi, type Order } from '@/features/orders/api';
type Tracking = {
  latitude?: number;
  longitude?: number;
  rider?: {
    name?: string;
    phone?: string;
    vehicle?: string;
    registration?: string;
    rating?: number;
  };
};
export default function OrderDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useSession();
  const [order, setOrder] = useState<Order>();
  const [tracking, setTracking] = useState<Tracking>();
  const [error, setError] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    if (!accessToken) return;
    ordersApi
      .get(accessToken, id)
      .then(setOrder)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Order unavailable'),
      );
    ordersApi
      .tracking(accessToken, id)
      .then(setTracking)
      .catch(() => undefined);
  }, [accessToken, id]);
  useEffect(() => {
    load();
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [load]);
  if (!order && !error)
    return (
      <Screen title="Delivery record">
        <LoadingState label="Loading delivery" />
      </Screen>
    );
  if (error || !order)
    return (
      <Screen title="Delivery record">
        <ErrorState
          title="Order unavailable"
          description={error}
          actionLabel="Try again"
          onAction={load}
        />
      </Screen>
    );
  const cancellable = ['QUOTED', 'PAYMENT_PROCESSING', 'PENDING'].includes(
    order.status,
  );
  async function cancel() {
    if (!accessToken) return;
    setBusy(true);
    try {
      setOrder(await ordersApi.cancel(accessToken, id, 'Plans changed'));
      setMessage('Order cancelled.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Cancellation failed');
    } finally {
      setBusy(false);
    }
  }
  async function report() {
    if (!accessToken) return;
    setBusy(true);
    try {
      const result = await ordersApi.report(
        accessToken,
        id,
        'OTHER',
        description,
      );
      setMessage(`Report submitted: ${result.reference}`);
      setDescription('');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Report failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title="Delivery record" description={`Ref No. #${order.id}`}>
      <View className="gap-4">
        <Card>
          <View className="flex-row justify-between">
            <Text className="font-bold text-foreground-light dark:text-foreground-dark">
              {order.status.replaceAll('_', ' ')}
            </Text>
            <Text className="font-bold text-primary-light dark:text-primary-dark">
              {money(order.amount)}
            </Text>
          </View>
          <View className="mt-5 border-l-2 border-primary-light pl-4">
            <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
              Pickup
            </Text>
            <Text className="text-muted-light dark:text-muted-dark">
              {order.pickup.address}, {order.pickup.city}
            </Text>
            <Text className="mt-5 font-semibold text-foreground-light dark:text-foreground-dark">
              Delivery
            </Text>
            <Text className="text-muted-light dark:text-muted-dark">
              {order.delivery.address}, {order.delivery.city}
            </Text>
          </View>
        </Card>
        <Card>
          <Text className="font-bold text-foreground-light dark:text-foreground-dark">
            Dispatcher details
          </Text>
          {tracking?.rider ? (
            <View className="mt-3 gap-1">
              <Text className="text-lg font-semibold text-foreground-light dark:text-foreground-dark">
                {tracking.rider.name}
              </Text>
              <Text className="text-muted-light dark:text-muted-dark">
                {tracking.rider.vehicle} · {tracking.rider.registration}
              </Text>
              {tracking.rider.phone ? (
                <View className="mt-4 flex-row gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onPress={() =>
                      Linking.openURL(`tel:${tracking.rider!.phone}`)
                    }
                  >
                    Call
                  </Button>
                  <Button
                    className="flex-1"
                    onPress={() =>
                      Linking.openURL(`sms:${tracking.rider!.phone}`)
                    }
                  >
                    Message
                  </Button>
                </View>
              ) : null}
            </View>
          ) : (
            <Text className="mt-2 text-muted-light dark:text-muted-dark">
              Available after pairing.
            </Text>
          )}
          {tracking?.latitude !== undefined ? (
            <Text className="mt-4 rounded-xl bg-muted-light/10 p-3 text-foreground-light dark:text-foreground-dark">
              Live location: {tracking.latitude.toFixed(5)},{' '}
              {tracking.longitude?.toFixed(5)}
            </Text>
          ) : null}
        </Card>
        {cancellable ? (
          <Card>
            <Text className="font-bold text-foreground-light dark:text-foreground-dark">
              Cancel order
            </Text>
            <Button
              className="mt-4"
              variant="danger"
              loading={busy}
              onPress={cancel}
            >
              Cancel order
            </Button>
          </Card>
        ) : null}
        <Card>
          <Text className="font-bold text-foreground-light dark:text-foreground-dark">
            Report an issue
          </Text>
          <TextInput
            multiline
            className="mt-4 min-h-28 rounded-xl border border-border-light p-4 text-foreground-light dark:border-border-dark dark:text-foreground-dark"
            value={description}
            onChangeText={setDescription}
            placeholder="Tell us what happened"
            placeholderTextColor="#777"
          />
          <Button
            className="mt-4"
            disabled={description.trim().length < 10}
            loading={busy}
            onPress={report}
          >
            Submit report
          </Button>
          {message ? (
            <Text
              accessibilityRole="alert"
              className="mt-3 text-foreground-light dark:text-foreground-dark"
            >
              {message}
            </Text>
          ) : null}
        </Card>
      </View>
    </Screen>
  );
}

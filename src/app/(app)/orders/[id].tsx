import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/ui/state';
import { useSession } from '@/providers/session-provider';
import {
  money,
  ordersApi,
  type Order,
  type OrderStatus,
} from '@/features/orders/api';

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
const labels: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  QUOTED: 'Draft',
  PAYMENT_PROCESSING: 'Processing',
  PENDING: 'Pending',
  PAIRED: 'Paired',
  PICKUP: 'Pick-up',
  IN_TRANSIT: 'In transit',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLATION_PROCESSING: 'Cancelling',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
};

export default function OrderDetail() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useSession();
  const [order, setOrder] = useState<Order>();
  const [tracking, setTracking] = useState<Tracking>();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'pay' | 'report' | 'pickup' | null>(null);
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [description, setDescription] = useState('');
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
      <Screen title="Delivery Record">
        <LoadingState label="Loading delivery" />
      </Screen>
    );
  if (error || !order)
    return (
      <Screen title="Delivery Record">
        <ErrorState
          title="Order unavailable"
          description={error}
          actionLabel="Try again"
          onAction={load}
        />
      </Screen>
    );

  const isPayable = order.status === 'QUOTED' && order.orderKind === 'STANDARD';
  const pending = order.status === 'PENDING';
  const dispatcher = ['PAIRED', 'PICKUP', 'IN_TRANSIT'].includes(order.status);
  const showContacts = order.status !== 'COMPLETED';
  const showCodes = ['PAIRED', 'PICKUP', 'IN_TRANSIT', 'DELIVERED'].includes(
    order.status,
  );
  const showReport = ['PAIRED', 'PICKUP', 'IN_TRANSIT', 'DELIVERED'].includes(
    order.status,
  );

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(success);
      setMode(null);
      load();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Delivery Record">
      <Card className="rounded-none p-0">
        <View className="m-4 flex-row items-center justify-between rounded-xl bg-[#f7f8f9] p-4 dark:bg-[#282123]">
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground-light dark:text-foreground-dark">
              <Text className="text-blue-600">● </Text>Ref No. #{order.id}
            </Text>
            <Text className="mt-1 text-muted-light dark:text-muted-dark">
              {new Date(order.createdAt).toLocaleString()}
            </Text>
          </View>
          <Text className="rounded bg-[#fde9ea] px-4 py-2 font-semibold text-foreground-light">
            {labels[order.status]}
          </Text>
        </View>
        <View className="border-t border-border-light bg-[#fcfcfc] p-5 dark:border-border-dark dark:bg-surface-dark">
          <Text className="text-lg font-bold text-foreground-light dark:text-foreground-dark">
            {order.status === 'DRAFT' ? 'Report' : 'Order Detail'}
          </Text>
          <RouteBlock order={order} />
          <MetaGrid order={order} />
          {showContacts ? (
            <View className="mt-4 border-t border-border-light dark:border-border-dark">
              <ContactRow
                title="Pickup Details"
                name={order.pickup.contactName}
                phone={order.pickup.contactPhone}
                showCode={showCodes}
                onCode={() => setMode('pickup')}
              />
              <ContactRow
                title="Delivery Details"
                name={order.delivery.contactName}
                phone={order.delivery.contactPhone}
                showCode={showCodes}
                onCode={async () => {
                  setBusy(true);
                  try {
                    const result = await ordersApi.deliveryCode(
                      accessToken!,
                      id,
                    );
                    setMessage(`Delivery code: ${result.code}`);
                  } catch (cause) {
                    setMessage(
                      cause instanceof Error
                        ? cause.message
                        : 'Delivery code unavailable.',
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </View>
          ) : null}
          {dispatcher ? <Dispatcher tracking={tracking} /> : null}
          {isPayable ? (
            <View className="mt-8">
              <View className="flex-row justify-between">
                <Text className="text-lg font-bold text-foreground-light dark:text-foreground-dark">
                  Delivery Fee
                </Text>
                <Text className="text-xl font-bold text-[#06457c]">
                  {money(order.amount)}
                </Text>
              </View>
              <Text className="mt-8 text-center text-foreground-light dark:text-foreground-dark">
                Order placed by {order.pickup.contactName || 'customer'}. Pay
                for the order
              </Text>
              <View className="mt-8 flex-row justify-between gap-4">
                <Button
                  className="flex-1 bg-[#062f54]"
                  onPress={() =>
                    void run(
                      () => ordersApi.cancel(accessToken!, id, 'Plans changed'),
                      'Order cancelled.',
                    )
                  }
                >
                  Cancel
                </Button>
                <Button className="flex-1" onPress={() => setMode('pay')}>
                  Pay
                </Button>
              </View>
            </View>
          ) : null}
          {pending ? (
            <View className="mt-12 items-center">
              <Text className="text-center text-lg text-foreground-light dark:text-foreground-dark">
                Awaiting to pair order with a Dispatcher
              </Text>
              <Button
                className="mt-8 min-w-44"
                variant="danger"
                loading={busy}
                onPress={() =>
                  void run(
                    () => ordersApi.cancel(accessToken!, id, 'Plans changed'),
                    'Order cancelled.',
                  )
                }
              >
                Cancel Order
              </Button>
            </View>
          ) : null}
          {showReport ? (
            <View className="mt-10 items-center">
              <Button
                className="min-w-44"
                variant="danger"
                onPress={() => setMode('report')}
              >
                Report Order
              </Button>
            </View>
          ) : null}
          {mode === 'pay' ? (
            <View className="mt-6 gap-3 rounded-xl border border-border-light p-4 dark:border-border-dark">
              <Input
                accessibilityLabel="Transaction PIN"
                keyboardType="number-pad"
                secureTextEntry
                maxLength={4}
                value={pin}
                onChangeText={(value) =>
                  setPin(value.replace(/\D/g, '').slice(0, 4))
                }
              />
              <Button
                disabled={pin.length !== 4}
                loading={busy}
                onPress={() =>
                  void run(
                    () => ordersApi.pay(accessToken!, id, pin),
                    'Payment successful.',
                  )
                }
              >
                Pay {money(order.amount)}
              </Button>
            </View>
          ) : null}
          {mode === 'pickup' ? (
            <View className="mt-6 gap-3 rounded-xl border border-border-light p-4 dark:border-border-dark">
              <Input
                accessibilityLabel="Pickup confirmation code"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
              />
              <Button
                disabled={!code.trim()}
                loading={busy}
                onPress={() =>
                  void run(
                    () => ordersApi.confirmPickup(accessToken!, id, code),
                    'Pickup confirmed.',
                  )
                }
              >
                Confirm pickup
              </Button>
            </View>
          ) : null}
          {mode === 'report' ? (
            <View className="mt-6 gap-3">
              <TextInput
                accessibilityLabel="Report description"
                multiline
                value={description}
                onChangeText={setDescription}
                placeholder="Tell us what happened"
                placeholderTextColor="#777"
                className="min-h-28 rounded-xl border border-border-light p-4 text-foreground-light dark:border-border-dark dark:text-foreground-dark"
              />
              <Button
                disabled={description.trim().length < 10}
                loading={busy}
                onPress={() =>
                  void run(
                    () =>
                      ordersApi.report(accessToken!, id, 'OTHER', description),
                    'Report submitted.',
                  )
                }
              >
                Submit report
              </Button>
            </View>
          ) : null}
          {message ? (
            <Text
              accessibilityRole="alert"
              className="mt-5 rounded-xl bg-[#fde9ea] p-3 text-foreground-light dark:text-foreground-dark"
            >
              {message}
            </Text>
          ) : null}
        </View>
      </Card>
    </Screen>
  );
}

function RouteBlock({ order }: { order: Order }) {
  return (
    <View className="mt-4 gap-3 border-l-4 border-dotted border-[#2dbb7f] pl-6">
      <View>
        <Text className="absolute -left-[31px] text-[#e64f6b]">●</Text>
        <Text className="font-bold text-foreground-light dark:text-foreground-dark">
          Pickup Information
        </Text>
        <Text className="mt-1 text-sm text-muted-light dark:text-muted-dark">
          {[order.pickup.address, order.pickup.city, order.pickup.state]
            .filter(Boolean)
            .join(', ')}
        </Text>
      </View>
      <View>
        <Text className="absolute -left-[31px] text-[#2dbb7f]">○</Text>
        <Text className="font-bold text-foreground-light dark:text-foreground-dark">
          Delivery Location
        </Text>
        <Text className="mt-1 text-sm text-muted-light dark:text-muted-dark">
          {[order.delivery.address, order.delivery.city, order.delivery.state]
            .filter(Boolean)
            .join(', ')}
        </Text>
      </View>
    </View>
  );
}

function MetaGrid({ order }: { order: Order }) {
  const service =
    order.orderKind === 'LARGE_COURIER'
      ? 'Large Courier'
      : order.deliveryType === 'INTERSTATE'
        ? 'Interstate Delivery'
        : 'Last-mile Delivery';
  return (
    <View className="mt-5 gap-3">
      <Meta
        left={`▦  ${service}`}
        right={order.mobilityMethod ? `⚲  ${order.mobilityMethod}` : ''}
      />
      <Meta
        left={`⌘  ${order.distanceKm ?? '—'} km`}
        right={`◷  ${order.durationSeconds ? `${Math.ceil(order.durationSeconds / 60)} mins` : '—'}`}
      />
      <Meta left={`◇  ${order.parcel.category}`} right="---" />
    </View>
  );
}
function Meta({ left, right }: { left: string; right: string }) {
  return (
    <View className="flex-row justify-between gap-3">
      <Text className="flex-1 capitalize text-foreground-light dark:text-foreground-dark">
        {left}
      </Text>
      <Text className="flex-1 text-right capitalize text-foreground-light dark:text-foreground-dark">
        {right}
      </Text>
    </View>
  );
}

function ContactRow({
  title,
  name,
  phone,
  showCode,
  onCode,
}: {
  title: string;
  name: string;
  phone: string;
  showCode: boolean;
  onCode: () => void;
}) {
  return (
    <View className="py-5">
      <View className="flex-row justify-between">
        <Text className="font-bold text-foreground-light dark:text-foreground-dark">
          {title}
        </Text>
        <Text className="text-primary-light">➤</Text>
      </View>
      <View className="mt-4 flex-row items-center justify-between border-b border-border-light pb-2 dark:border-border-dark">
        <Text className="pl-3 text-foreground-light dark:text-foreground-dark">
          {name || '—'}
        </Text>
        {phone ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Call ${name}`}
            onPress={() => Linking.openURL(`tel:${phone}`)}
          >
            <Text className="text-xl">♧</Text>
          </Pressable>
        ) : null}
      </View>
      {showCode ? (
        <Pressable accessibilityRole="button" onPress={onCode}>
          <Text className="mt-3 text-right text-primary-light">
            ◉ Enter deliver code
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Dispatcher({ tracking }: { tracking?: Tracking }) {
  const rider = tracking?.rider;
  if (!rider)
    return (
      <Text className="mt-8 text-center text-muted-light dark:text-muted-dark">
        Dispatcher details will appear after pairing.
      </Text>
    );
  return (
    <View className="mt-4">
      <Text className="font-bold text-foreground-light dark:text-foreground-dark">
        Dispatcher Details
      </Text>
      <View className="mt-3 flex-row items-center gap-4">
        <View className="size-20 items-center justify-center rounded border border-border-light bg-[#f7f8f9]">
          <Text className="text-4xl">👤</Text>
        </View>
        <View className="flex-1">
          <Text className="text-lg font-semibold text-foreground-light dark:text-foreground-dark">
            {rider.name}
          </Text>
          <Text className="text-sm text-muted-light dark:text-muted-dark">
            {rider.vehicle}{' '}
            {rider.registration ? `· ${rider.registration}` : ''}
          </Text>
          <Text className="mt-1 text-amber-500">★ {rider.rating ?? '—'}</Text>
        </View>
        {rider.phone ? (
          <View className="flex-row gap-4">
            <Pressable
              accessibilityLabel="Call dispatcher"
              onPress={() => Linking.openURL(`tel:${rider.phone}`)}
            >
              <Text className="text-xl">☎</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Message dispatcher"
              onPress={() => Linking.openURL(`sms:${rider.phone}`)}
            >
              <Text className="text-xl">▤</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {tracking?.latitude != null ? (
        <Pressable
          onPress={() =>
            Linking.openURL(
              `https://maps.google.com/?q=${tracking.latitude},${tracking.longitude}`,
            )
          }
        >
          <Text className="mt-3 text-right text-primary-light">
            ● Track location
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/providers/session-provider';
import {
  money,
  ordersApi,
  type Order,
  type QuoteInput,
} from '@/features/orders/api';
const blank = {
  address: '',
  city: '',
  state: '',
  country: 'Nigeria',
  contact: { name: '', phone: '' },
};
export default function NewOrderScreen() {
  const { accessToken } = useSession();
  const [input, setInput] = useState<QuoteInput>({
    deliveryType: 'last_mile',
    mobilityMethod: 'motorcycle',
    pickup: { ...blank, contact: { ...blank.contact } },
    delivery: { ...blank, contact: { ...blank.contact } },
    parcel: {
      category: 'Mail and Small Parcel',
      description: '',
      weightKg: 1,
      dimensionsCm: { length: 2, width: 3, height: 2 },
      handling: 'GENERAL',
    },
  });
  const [quote, setQuote] = useState<Order>();
  const [step, setStep] = useState(0);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    keyboard: 'default' | 'phone-pad' | 'numeric' = 'default',
  ) => (
    <View className="gap-2">
      <Text className="font-medium text-foreground-light dark:text-foreground-dark">
        {label}
      </Text>
      <TextInput
        className="rounded-xl border border-border-light bg-surface-light px-4 py-4 text-foreground-light dark:border-border-dark dark:bg-surface-dark dark:text-foreground-dark"
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
      />
    </View>
  );
  const address = (kind: 'pickup' | 'delivery', title: string) => (
    <Card>
      <Text className="mb-4 text-lg font-bold text-foreground-light dark:text-foreground-dark">
        {title}
      </Text>
      <View className="gap-4">
        {field('Street address', input[kind].address, (v) =>
          setInput({ ...input, [kind]: { ...input[kind], address: v } }),
        )}
        {field('City', input[kind].city, (v) =>
          setInput({ ...input, [kind]: { ...input[kind], city: v } }),
        )}
        {field('State', input[kind].state, (v) =>
          setInput({ ...input, [kind]: { ...input[kind], state: v } }),
        )}
        {field('Contact name', input[kind].contact.name, (v) =>
          setInput({
            ...input,
            [kind]: {
              ...input[kind],
              contact: { ...input[kind].contact, name: v },
            },
          }),
        )}
        {field(
          'Contact phone',
          input[kind].contact.phone,
          (v) =>
            setInput({
              ...input,
              [kind]: {
                ...input[kind],
                contact: { ...input[kind].contact, phone: v },
              },
            }),
          'phone-pad',
        )}
      </View>
    </Card>
  );
  async function create() {
    if (!accessToken) return;
    setBusy(true);
    setError('');
    try {
      setQuote(await ordersApi.quote(accessToken, input));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Quote failed');
    } finally {
      setBusy(false);
    }
  }
  function canContinue() {
    if (step === 2) return true;
    const place = step === 0 ? input.pickup : input.delivery;
    return Boolean(
      place.address.trim() &&
      place.city.trim() &&
      place.state.trim() &&
      place.contact.name.trim() &&
      place.contact.phone.trim(),
    );
  }
  async function pay() {
    if (!accessToken || !quote) return;
    setBusy(true);
    setError('');
    try {
      const value = await ordersApi.pay(accessToken, quote.id, pin);
      router.replace({
        pathname: '/(app)/orders/[id]',
        params: { id: value.id },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title={quote ? 'Review & pay' : 'New delivery'}
      description={
        quote
          ? 'Confirm the server-priced delivery quote.'
          : 'Enter pickup, delivery and item details.'
      }
    >
      {error ? (
        <Text
          accessibilityRole="alert"
          className="rounded-xl bg-danger/10 p-3 text-danger"
        >
          {error}
        </Text>
      ) : null}
      {quote ? (
        <View className="gap-4">
          <Card>
            <Text className="text-sm text-muted-light dark:text-muted-dark">
              Pickup
            </Text>
            <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
              {quote.pickup.address}
            </Text>
            <Text className="mt-4 text-sm text-muted-light dark:text-muted-dark">
              Delivery
            </Text>
            <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
              {quote.delivery.address}
            </Text>
            <Text className="mt-5 text-2xl font-bold text-primary-light dark:text-primary-dark">
              {money(quote.amount)}
            </Text>
          </Card>
          <Card>
            {field(
              'Transaction PIN',
              pin,
              (v) => setPin(v.replace(/\D/g, '').slice(0, 4)),
              'numeric',
            )}
            <View className="mt-5 flex-row gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                onPress={() => setQuote(undefined)}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={pin.length !== 4}
                loading={busy}
                onPress={pay}
              >
                Pay
              </Button>
            </View>
          </Card>
        </View>
      ) : (
        <View className="gap-4">
          <Card>
            <Text className="text-sm font-semibold text-primary-light dark:text-primary-dark">
              Step {step + 1} of 3
            </Text>
            <Text className="mt-1 text-xl font-bold text-foreground-light dark:text-foreground-dark">
              {['Pickup details', 'Delivery details', 'Parcel details'][step]}
            </Text>
            <View className="mt-4 flex-row gap-2">
              {[0, 1, 2].map((item) => (
                <View
                  key={item}
                  className={`h-2 flex-1 rounded-full ${item <= step ? 'bg-primary-light dark:bg-primary-dark' : 'bg-border-light dark:bg-border-dark'}`}
                />
              ))}
            </View>
          </Card>
          {step === 0 ? address('pickup', 'Where should we pick up?') : null}
          {step === 1 ? address('delivery', 'Where should we deliver?') : null}
          {step === 2 ? (
            <Card>
              <Text className="mb-4 text-lg font-bold text-foreground-light dark:text-foreground-dark">
                Item information
              </Text>
              {field('Description', input.parcel.description ?? '', (v) =>
                setInput({
                  ...input,
                  parcel: { ...input.parcel, description: v },
                }),
              )}
              <View className="mt-5 flex-row gap-3">
                <Button
                  className="flex-1"
                  variant="secondary"
                  onPress={() => setStep(1)}
                >
                  Back
                </Button>
                <Button className="flex-1" loading={busy} onPress={create}>
                  Review quote
                </Button>
              </View>
            </Card>
          ) : null}
          {step < 2 ? (
            <View className="flex-row gap-3">
              <Button
                className="flex-1"
                variant="secondary"
                onPress={() => (step === 0 ? router.back() : setStep(step - 1))}
              >
                {step === 0 ? 'Cancel' : 'Back'}
              </Button>
              <Button
                className="flex-1"
                disabled={!canContinue()}
                onPress={() => setStep(step + 1)}
              >
                Continue
              </Button>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

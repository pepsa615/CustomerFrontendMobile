import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useSession } from '@/providers/session-provider';
import {
  money,
  ordersApi,
  type Order,
  type QuoteInput,
  type QuickQuoteInput,
} from '@/features/orders/api';

type Step = 'route' | 'offer' | 'pickup' | 'delivery' | 'parcel' | 'pay';

export default function NewOrderScreen() {
  const { accessToken } = useSession();
  const [step, setStep] = useState<Step>('route');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order>();
  const [pin, setPin] = useState('');
  const [quick, setQuick] = useState<QuickQuoteInput>({
    deliveryType: 'last_mile',
    mobilityMethod: 'motorcycle',
    pickup: { address: '', city: '', state: '', country: 'Nigeria' },
    delivery: { address: '', city: '', state: '', country: 'Nigeria' },
  });
  const [details, setDetails] = useState<QuoteInput>({
    deliveryType: 'last_mile',
    mobilityMethod: 'motorcycle',
    pickup: {
      address: '',
      city: '',
      state: '',
      country: 'Nigeria',
      contact: { name: '', phone: '' },
    },
    delivery: {
      address: '',
      city: '',
      state: '',
      country: 'Nigeria',
      contact: { name: '', phone: '' },
    },
    parcel: {
      category: 'Mail and small parcel',
      weightKg: 1,
      dimensionsCm: { length: 2, width: 3, height: 2 },
      handling: 'GENERAL',
    },
  });

  const routeReady =
    quick.pickup.address &&
    quick.pickup.city &&
    quick.pickup.state &&
    quick.delivery.address &&
    quick.delivery.city &&
    quick.delivery.state;

  async function quote() {
    if (!accessToken) return;
    setBusy(true);
    setError('');
    try {
      const quoted = await ordersApi.quickQuote(accessToken, quick);
      setOrder(quoted);
      setDetails((d) => ({
        ...d,
        pickup: {
          ...d.pickup,
          address: quick.pickup.address,
          city: quick.pickup.city,
          state: quick.pickup.state,
        },
        delivery: {
          ...d.delivery,
          address: quick.delivery.address,
          city: quick.delivery.city,
          state: quick.delivery.state,
        },
      }));
      setStep('offer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Quote failed');
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!accessToken || !order) return;
    setBusy(true);
    setError('');
    try {
      await ordersApi.updateDetails(accessToken, order.id, details);
      const paid = await ordersApi.pay(accessToken, order.id, pin);
      router.replace({
        pathname: '/(app)/orders/[id]',
        params: { id: paid.id },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Step, string> = {
    route: 'Where are we delivering?',
    offer: 'Your delivery estimate',
    pickup: 'Pickup details',
    delivery: 'Delivery details',
    parcel: 'Item information',
    pay: 'Pay',
  };

  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark"
      contentContainerClassName="gap-4 px-5 pb-10 pt-14"
    >
      <Text className="text-xl font-bold text-foreground-light dark:text-foreground-dark">
        {titles[step]}
      </Text>
      {error ? (
        <Text className="rounded-xl bg-danger/10 p-3 text-danger">{error}</Text>
      ) : null}
      {step === 'route' ? (
        <Card className="gap-3">
          <Text className="text-sm text-muted-light dark:text-muted-dark">
            Get a price from pickup and delivery locations first.
          </Text>
          <Input
            placeholder="Pickup address"
            value={quick.pickup.address}
            onChangeText={(v) =>
              setQuick({ ...quick, pickup: { ...quick.pickup, address: v } })
            }
          />
          <Input
            placeholder="Pickup city"
            value={quick.pickup.city}
            onChangeText={(v) =>
              setQuick({ ...quick, pickup: { ...quick.pickup, city: v } })
            }
          />
          <Input
            placeholder="Pickup state"
            value={quick.pickup.state}
            onChangeText={(v) =>
              setQuick({ ...quick, pickup: { ...quick.pickup, state: v } })
            }
          />
          <Input
            placeholder="Delivery address"
            value={quick.delivery.address}
            onChangeText={(v) =>
              setQuick({ ...quick, delivery: { ...quick.delivery, address: v } })
            }
          />
          <Input
            placeholder="Delivery city"
            value={quick.delivery.city}
            onChangeText={(v) =>
              setQuick({ ...quick, delivery: { ...quick.delivery, city: v } })
            }
          />
          <Input
            placeholder="Delivery state"
            value={quick.delivery.state}
            onChangeText={(v) =>
              setQuick({ ...quick, delivery: { ...quick.delivery, state: v } })
            }
          />
          <Button
            disabled={!routeReady}
            loading={busy}
            onPress={() => void quote()}
          >
            Get quote
          </Button>
        </Card>
      ) : null}
      {step === 'offer' && order ? (
        <Card className="items-center gap-3">
          <Text className="text-4xl font-bold text-primary-light">
            {money(order.amount)}
          </Text>
          <Text className="text-sm text-muted-light">
            {order.distanceKm ?? '—'} km ·{' '}
            {order.durationSeconds
              ? `${Math.ceil(order.durationSeconds / 60)} mins`
              : '—'}
          </Text>
          <Button onPress={() => setStep('pickup')}>Continue</Button>
        </Card>
      ) : null}
      {step === 'pickup' ? (
        <ContactStep
          kind="pickup"
          details={details}
          setDetails={setDetails}
          onNext={() => setStep('delivery')}
          onBack={() => setStep('offer')}
        />
      ) : null}
      {step === 'delivery' ? (
        <ContactStep
          kind="delivery"
          details={details}
          setDetails={setDetails}
          onNext={() => setStep('parcel')}
          onBack={() => setStep('pickup')}
        />
      ) : null}
      {step === 'parcel' ? (
        <Card className="gap-3">
          <Input
            placeholder="Weight kg"
            keyboardType="decimal-pad"
            value={String(details.parcel.weightKg)}
            onChangeText={(v) =>
              setDetails({
                ...details,
                parcel: { ...details.parcel, weightKg: Number(v) || 1 },
              })
            }
          />
          <View className="flex-row gap-3">
            <Button variant="secondary" className="flex-1" onPress={() => setStep('delivery')}>
              Back
            </Button>
            <Button className="flex-1" onPress={() => setStep('pay')}>
              Summary
            </Button>
          </View>
        </Card>
      ) : null}
      {step === 'pay' && order ? (
        <Card className="gap-3">
          <Text className="text-2xl font-bold text-primary-light">
            {money(order.amount)}
          </Text>
          <Input
            placeholder="Transaction PIN"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
          />
          <Button
            loading={busy}
            disabled={pin.length !== 4}
            onPress={() => void pay()}
          >
            Pay
          </Button>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function ContactStep({
  kind,
  details,
  setDetails,
  onNext,
  onBack,
}: {
  kind: 'pickup' | 'delivery';
  details: QuoteInput;
  setDetails: (v: QuoteInput) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const place = details[kind];
  const ready = place.contact.name && place.contact.phone;
  return (
    <Card className="gap-3">
      <Input
        placeholder="Contact name"
        value={place.contact.name}
        onChangeText={(v) =>
          setDetails({
            ...details,
            [kind]: {
              ...place,
              contact: { ...place.contact, name: v },
            },
          })
        }
      />
      <Input
        placeholder="Phone"
        keyboardType="phone-pad"
        value={place.contact.phone}
        onChangeText={(v) =>
          setDetails({
            ...details,
            [kind]: {
              ...place,
              contact: { ...place.contact, phone: v },
            },
          })
        }
      />
      <View className="flex-row gap-3">
        <Button variant="secondary" className="flex-1" onPress={onBack}>
          Back
        </Button>
        <Button className="flex-1" disabled={!ready} onPress={onNext}>
          Continue
        </Button>
      </View>
    </Card>
  );
}
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  launchCameraAsync,
  requestCameraPermissionsAsync,
} from 'expo-image-picker';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, Switch } from '@/components/ui/controls';
import { AddressSearchInput } from '@/components/address-search-input';
import { useSession } from '@/providers/session-provider';
import {
  money,
  ordersApi,
  type Order,
  type QuickQuoteInput,
  type QuoteInput,
} from '@/features/orders/api';

type Step = 'schedule' | 'pickup' | 'delivery' | 'item' | 'summary' | 'pay';
const defaults: {
  categories: string[];
  handlingModes: string[];
  lastMileVehicles: string[];
  vehiclesByCategory?: Record<string, string[]>;
} = {
  categories: [
    'Food and essentials',
    'Pharmaceutical item',
    'Mail and small parcel',
    'Laundry and clothing',
    'Electronics and gadgets',
    'Large item and others',
  ],
  handlingModes: [
    'GENERAL',
    'FRAGILE',
    'PERISHABLE',
    'HAZARDOUS',
    'SENSITIVE',
    'OVERSIZE',
  ],
  lastMileVehicles: [
    'motorcycle',
    'bicycle',
    'tricycle',
    'car',
    'van',
    'truck',
    'large_truck',
  ],
};
const place = { address: '', city: '', state: '', country: 'Nigeria' };

export default function NewOrderScreen() {
  const { accessToken } = useSession();
  const [step, setStep] = useState<Step>('schedule');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<Order>();
  const [options, setOptions] = useState(defaults);
  const [selected, setSelected] = useState({ pickup: false, delivery: false });
  const [terms, setTerms] = useState(false);
  const [returnOrder, setReturnOrder] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [photo, setPhoto] = useState('');
  const [pin, setPin] = useState('');
  const [quick, setQuick] = useState<QuickQuoteInput>({
    mobilityMethod: 'motorcycle',
    pickup: place,
    delivery: place,
    parcel: { category: 'Mail and small parcel' },
    returnOrder: false,
    termsAccepted: true,
  });
  const [details, setDetails] = useState<QuoteInput>({
    deliveryType: 'last_mile',
    mobilityMethod: 'motorcycle',
    pickup: { ...place, contact: { name: '', phone: '' } },
    delivery: { ...place, contact: { name: '', phone: '' } },
    parcel: {
      category: 'Mail and small parcel',
      description: '',
      weightKg: 1,
      dimensionsCm: { length: 2, width: 3, height: 2 },
      handling: 'GENERAL',
      insuranceConsent: false,
    },
  });
  useEffect(() => {
    if (accessToken)
      void ordersApi
        .options(accessToken)
        .then((nextOptions) => {
          setOptions(nextOptions);
          setQuick((current) => {
            const allowed = nextOptions.vehiclesByCategory?.[current.parcel.category];
            return allowed?.length && !allowed.includes(current.mobilityMethod ?? '')
              ? { ...current, mobilityMethod: allowed[0] }
              : current;
          });
        })
        .catch(() => undefined);
  }, [accessToken]);
  const interstate = useMemo(
    () =>
      Boolean(
        quick.pickup.city &&
        quick.delivery.city &&
        quick.pickup.city.trim().toLowerCase() !==
          quick.delivery.city.trim().toLowerCase(),
      ),
    [quick],
  );
  const ready =
    selected.pickup &&
    selected.delivery &&
    terms &&
    (!date || time) &&
    (interstate || quick.mobilityMethod);
  const titles: Record<Step, string> = {
    schedule: 'Delivery Request',
    pickup: 'Pickup Details',
    delivery: 'Delivery Details',
    item: 'Item Information',
    summary: 'Summary',
    pay: 'Pay',
  };
  async function quote() {
    if (!accessToken) return;
    setBusy(true);
    setError('');
    try {
      const payload = {
        ...quick,
        mobilityMethod: interstate ? undefined : quick.mobilityMethod,
        returnOrder,
        termsAccepted: true as const,
        scheduledAt:
          date && time ? new Date(`${date}T${time}`).toISOString() : undefined,
      };
      const result = await ordersApi.quickQuote(accessToken, payload);
      setOrder(result);
      setDetails((d) => ({
        ...d,
        deliveryType: result.deliveryType,
        mobilityMethod: result.mobilityMethod,
        pickup: { ...d.pickup, ...payload.pickup },
        delivery: { ...d.delivery, ...payload.delivery },
        parcel: { ...d.parcel, category: payload.parcel.category },
      }));
      setStep('pickup');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Quote failed');
    } finally {
      setBusy(false);
    }
  }
  async function saveItem() {
    if (!accessToken || !order) return;
    setBusy(true);
    setError('');
    try {
      const updated = await ordersApi.updateDetails(accessToken, order.id, {
        pickup: details.pickup,
        delivery: details.delivery,
        parcel: details.parcel,
        pickupLandmark: details.pickup.landmark,
        deliveryLandmark: details.delivery.landmark,
      });
      setOrder(updated);
      setStep('summary');
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save details',
      );
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    if (!accessToken || !order) return;
    setBusy(true);
    setError('');
    try {
      const paid = await ordersApi.pay(accessToken, order.id, pin);
      router.replace({
        pathname: '/(app)/orders/[id]',
        params: { id: paid.id },
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment failed');
    } finally {
      setBusy(false);
    }
  }
  async function takePhoto() {
    if (!accessToken) return;
    const permission = await requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera permission is required to take a package photo.');
      return;
    }
    const result = await launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    const uri = result.canceled ? undefined : result.assets[0]?.uri;
    if (!uri) return;
    setBusy(true);
    try {
      const media = await ordersApi.uploadMedia(accessToken, uri);
      setPhoto(uri);
      setQuick((current) => ({ ...current, packageImageAssetId: media.id }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Photo upload failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark"
      contentContainerClassName="gap-5 px-5 pb-12 pt-14"
    >
      <View className="items-center">
        <View className="h-1.5 w-16 rounded-full bg-primary-light" />
      </View>
      <Text
        accessibilityRole="header"
        className="text-2xl font-bold text-foreground-light dark:text-foreground-dark"
      >
        {titles[step]}
      </Text>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {step === 'schedule' ? (
        <Card className="gap-5">
          <RouteAddress
            label="Pickup Location"
            value={quick.pickup.address}
            onChange={(address) => {
              setSelected((s) => ({ ...s, pickup: false }));
              setQuick({ ...quick, pickup: { ...quick.pickup, address } });
            }}
            onSelect={(result) => {
              setSelected((s) => ({ ...s, pickup: true }));
              setQuick({
                ...quick,
                pickup: {
                  address: result.formattedAddress,
                  city: result.city,
                  state: result.state,
                  country: result.country,
                },
              });
            }}
          />
          <RouteAddress
            label="Delivery Location"
            value={quick.delivery.address}
            onChange={(address) => {
              setSelected((s) => ({ ...s, delivery: false }));
              setQuick({ ...quick, delivery: { ...quick.delivery, address } });
            }}
            onSelect={(result) => {
              setSelected((s) => ({ ...s, delivery: true }));
              setQuick({
                ...quick,
                delivery: {
                  address: result.formattedAddress,
                  city: result.city,
                  state: result.state,
                  country: result.country,
                },
              });
            }}
          />
          <Choice
            label="Item Details"
            items={options.categories}
            value={quick.parcel.category}
            onChange={(category) => {
              const allowed = options.vehiclesByCategory?.[category];
              setQuick({
                ...quick,
                parcel: { category },
                mobilityMethod:
                  allowed?.length && !allowed.includes(quick.mobilityMethod ?? '')
                    ? allowed[0]
                    : quick.mobilityMethod,
              });
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => void takePhoto()}
            className="min-h-32 items-center justify-center gap-2 rounded-2xl bg-red-50 px-5 dark:bg-red-950/30"
          >
            <Text className="text-3xl text-primary-light">◎</Text>
            <Text className="text-center text-foreground-light dark:text-foreground-dark">
              {photo ? 'Package photo added' : 'Take a picture of the package'}
            </Text>
          </Pressable>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                accessibilityLabel="Date"
                placeholder="YYYY-MM-DD"
                value={date}
                onChangeText={setDate}
              />
            </View>
            <View className="flex-1">
              <Input
                accessibilityLabel="Time"
                placeholder="HH:MM"
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>
          {interstate ? (
            <Alert>
              Interstate delivery detected. Vehicle selection is not required.
            </Alert>
          ) : (
            <VehicleChoice
              items={
                options.vehiclesByCategory?.[quick.parcel.category] ??
                options.lastMileVehicles
              }
              value={quick.mobilityMethod ?? ''}
              onChange={(mobilityMethod) =>
                setQuick({ ...quick, mobilityMethod })
              }
            />
          )}
          <View className="gap-1">
            <Switch
              label="Return order"
              value={returnOrder}
              onValueChange={setReturnOrder}
            />
            <Text className="pl-1 text-xs text-muted-light dark:text-muted-dark">
              Select this when the dispatcher must return to the pickup address
              after delivery. BAS includes the return leg in the quote.
            </Text>
          </View>
          <Switch
            label="I accept the Terms & Conditions and confirm there are no prohibited items."
            value={terms}
            onValueChange={setTerms}
          />
          <Button disabled={!ready} loading={busy} onPress={() => void quote()}>
            Continue
          </Button>
        </Card>
      ) : null}
      {step === 'pickup' ? (
        <Contact
          label="Pickup Details"
          nameLabel="Sender Name"
          value={details.pickup}
          onChange={(pickup) => setDetails({ ...details, pickup })}
          back={() => setStep('schedule')}
          next={() => setStep('delivery')}
        />
      ) : null}
      {step === 'delivery' ? (
        <Contact
          label="Delivery Details"
          nameLabel="Receiver Name"
          value={details.delivery}
          onChange={(delivery) => setDetails({ ...details, delivery })}
          back={() => setStep('pickup')}
          next={() => setStep('item')}
        />
      ) : null}
      {step === 'item' ? (
        <Card className="gap-5">
          <Input
            accessibilityLabel="Name"
            placeholder="Optional"
            value={details.parcel.description}
            onChangeText={(description) =>
              setDetails({
                ...details,
                parcel: { ...details.parcel, description },
              })
            }
          />
          <Input
            accessibilityLabel="Weight (kg)"
            keyboardType="decimal-pad"
            value={String(details.parcel.weightKg)}
            onChangeText={(weight) =>
              setDetails({
                ...details,
                parcel: { ...details.parcel, weightKg: Number(weight) },
              })
            }
          />
          <Input
            accessibilityLabel="Dimension (L × W × H)"
            value={`${details.parcel.dimensionsCm.length} x ${details.parcel.dimensionsCm.width} x ${details.parcel.dimensionsCm.height}`}
          />
          <Choice
            label="Handling"
            items={options.handlingModes}
            value={details.parcel.handling}
            onChange={(handling) =>
              setDetails({
                ...details,
                parcel: { ...details.parcel, handling },
              })
            }
          />
          <Switch
            label="I consent to third-party insurance and accept that extra charges may apply."
            value={Boolean(details.parcel.insuranceConsent)}
            onValueChange={(insuranceConsent) =>
              setDetails({
                ...details,
                parcel: { ...details.parcel, insuranceConsent },
              })
            }
          />
          <Actions
            back={() => setStep('delivery')}
            next={() => void saveItem()}
            loading={busy}
          />
        </Card>
      ) : null}
      {step === 'summary' && order ? (
        <Summary
          order={order}
          details={details}
          back={() => setStep('item')}
          next={() =>
            order.orderKind === 'LARGE_COURIER'
              ? router.replace('/(app)/(tabs)/orders')
              : setStep('pay')
          }
        />
      ) : null}
      {step === 'pay' && order ? (
        <Card className="items-center gap-5">
          <Text className="text-sm text-muted-light">Delivery Fee</Text>
          <Text className="text-4xl font-bold text-primary-light">
            {money(order.amount)}
          </Text>
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
            onPress={() => void pay()}
          >
            Pay
          </Button>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function RouteAddress(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: {
    formattedAddress: string;
    city: string;
    state: string;
    country: string;
  }) => void;
}) {
  return <AddressSearchInput {...props} />;
}
function Choice({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View className="gap-2">
      <Text className="text-lg font-semibold text-foreground-light dark:text-foreground-dark">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {items.map((item) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: item === value }}
            key={item}
            onPress={() => onChange(item)}
            className={`rounded-xl border px-3 py-3 ${item === value ? 'border-primary-light bg-primary-light' : 'border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark'}`}
          >
            <Text
              className={
                item === value
                  ? 'text-white'
                  : 'text-foreground-light dark:text-foreground-dark'
              }
            >
              {item.replaceAll('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function VehicleChoice({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const icons: Record<string, string> = {
    motorcycle: '🏍️',
    bicycle: '🚲',
    tricycle: '🛺',
    car: '🚗',
    van: '🚐',
    truck: '🚚',
    large_truck: '🚛',
  };
  return (
    <View className="gap-2">
      <Text className="text-lg font-semibold text-foreground-light dark:text-foreground-dark">
        Vehicle Type
      </Text>
      <View className="flex-row flex-wrap gap-3">
        {items.map((item) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: item === value }}
            key={item}
            onPress={() => onChange(item)}
            className={`min-h-24 min-w-[30%] flex-1 items-center justify-center rounded-xl border p-3 ${item === value ? 'border-primary-light bg-primary-light' : 'border-red-100 bg-red-50 dark:border-red-900 dark:bg-red-950/30'}`}
          >
            <Text className="text-3xl">{icons[item] ?? '🚚'}</Text>
            <Text
              className={`mt-2 text-center capitalize ${item === value ? 'text-white' : 'text-primary-light dark:text-primary-dark'}`}
            >
              {item.replaceAll('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function Contact({
  label,
  nameLabel,
  value,
  onChange,
  back,
  next,
}: {
  label: string;
  nameLabel: string;
  value: QuoteInput['pickup'];
  onChange: (value: QuoteInput['pickup']) => void;
  back: () => void;
  next: () => void;
}) {
  return (
    <Card className="gap-5">
      <Text className="text-xl font-bold text-foreground-light dark:text-foreground-dark">
        {label}
      </Text>
      <Input
        accessibilityLabel="Full Address"
        value={value.address}
        editable={false}
      />
      <Input
        accessibilityLabel={nameLabel}
        value={value.contact.name}
        onChangeText={(name) =>
          onChange({ ...value, contact: { ...value.contact, name } })
        }
      />
      <Input
        accessibilityLabel="Phone Number"
        keyboardType="phone-pad"
        value={value.contact.phone}
        onChangeText={(phone) =>
          onChange({ ...value, contact: { ...value.contact, phone } })
        }
      />
      <Input
        accessibilityLabel="Landmark/Bus stop"
        value={value.landmark}
        onChangeText={(landmark) => onChange({ ...value, landmark })}
      />
      <Actions
        back={back}
        next={next}
        disabled={!value.contact.name || !value.contact.phone}
      />
    </Card>
  );
}
function Actions({
  back,
  next,
  disabled,
  loading,
}: {
  back: () => void;
  next: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <View className="flex-row gap-3">
      <Button variant="secondary" className="flex-1" onPress={back}>
        Back
      </Button>
      <Button
        className="flex-1"
        disabled={disabled}
        loading={loading}
        onPress={next}
      >
        Submit
      </Button>
    </View>
  );
}
function Summary({
  order,
  details,
  back,
  next,
}: {
  order: Order;
  details: QuoteInput;
  back: () => void;
  next: () => void;
}) {
  const large = order.orderKind === 'LARGE_COURIER';
  return (
    <Card className="gap-5">
      <Text className="text-2xl font-bold text-foreground-light dark:text-foreground-dark">
        Summary
      </Text>
      <View className="border-l-2 border-primary-light pl-4">
        <Text className="font-bold text-foreground-light dark:text-foreground-dark">
          Pickup Address
        </Text>
        <Text className="text-muted-light">{details.pickup.address}</Text>
      </View>
      <View className="border-l-2 border-success-light pl-4">
        <Text className="font-bold text-foreground-light dark:text-foreground-dark">
          Delivery Address
        </Text>
        <Text className="text-muted-light">{details.delivery.address}</Text>
      </View>
      <Text className="text-foreground-light dark:text-foreground-dark">
        {order.deliveryType === 'last_mile'
          ? 'Last-mile Delivery'
          : 'Interstate Delivery'}
        {order.mobilityMethod ? ` · ${order.mobilityMethod}` : ''}
      </Text>
      <Text className="text-foreground-light dark:text-foreground-dark">
        {order.distanceKm ?? '—'} km ·{' '}
        {order.durationSeconds
          ? `${Math.ceil(order.durationSeconds / 60)} mins`
          : '—'}
      </Text>
      <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
        Sender Details
      </Text>
      <Text className="text-muted-light">
        {details.pickup.contact.name} · {details.pickup.contact.phone}
      </Text>
      <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
        Receiver Details
      </Text>
      <Text className="text-muted-light">
        {details.delivery.contact.name} · {details.delivery.contact.phone}
      </Text>
      {large ? (
        <Alert>
          This parcel is above 100 kg and has been saved as a Large Courier
          draft for PEPSA follow-up. No payment or dispatch will occur now.
        </Alert>
      ) : (
        <View className="flex-row justify-between">
          <Text className="font-bold text-foreground-light dark:text-foreground-dark">
            Delivery Fee
          </Text>
          <Text className="text-xl font-bold text-primary-light">
            {money(order.amount)}
          </Text>
        </View>
      )}
      <Actions back={back} next={next} />
    </Card>
  );
}

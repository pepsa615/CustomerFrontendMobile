import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, Radio } from '@/components/ui/controls';
import { useSession } from '@/providers/session-provider';
import { linksApi, money, type Settlement } from './api';

const categories = [
  ['RETAIL', 'Retail'],
  ['FOOD_BEVERAGE', 'Food & Beverage'],
  ['FASHION', 'Fashion'],
  ['HEALTH_BEAUTY', 'Health & Beauty'],
  ['ELECTRONICS', 'Electronics'],
  ['PROFESSIONAL_SERVICES', 'Professional Services'],
  ['OTHER', 'Other'],
] as const;
const empty = {
  category: 'RETAIL',
  otherCategory: '',
  businessName: '',
  phoneNumber: '',
  address: '',
  city: '',
  state: '',
  latitude: '',
  longitude: '',
  houseAddress: '',
  landmark: '',
};

export function BusinessScreen() {
  const { accessToken } = useSession();
  const [exists, setExists] = useState(false);
  const [editing, setEditing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [settlement, setSettlement] = useState<Settlement>();
  const [logo, setLogo] = useState<ImagePicker.ImagePickerAsset>();
  const [form, setForm] = useState(empty);
  useEffect(() => {
    if (!accessToken) return;
    linksApi
      .business(accessToken)
      .then(({ business }) => {
        setExists(true);
        setEditing(false);
        setForm({
          ...empty,
          category: String(business.category ?? 'RETAIL'),
          otherCategory: String(business.otherCategory ?? ''),
          businessName: String(business.name ?? ''),
          phoneNumber: String(business.phoneNumber ?? ''),
          address: String(business.address ?? ''),
          city: String(business.city ?? ''),
          state: String(business.state ?? ''),
          latitude: String(business.latitude ?? ''),
          longitude: String(business.longitude ?? ''),
          houseAddress: String(business.houseAddress ?? ''),
          landmark: String(business.landmark ?? ''),
        });
      })
      .catch(() => undefined);
    linksApi
      .settlement(accessToken)
      .then(setSettlement)
      .catch(() => undefined);
  }, [accessToken]);
  async function currentLocation() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setMessage('Location permission was not granted.');
      return;
    }
    const value = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    if (!accessToken) return;
    const place = await linksApi.resolveLocation(accessToken, {
      latitude: value.coords.latitude,
      longitude: value.coords.longitude,
    });
    setForm((current) => ({
      ...current,
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      address: place.formattedAddress || current.address,
    }));
    setMessage('Location found. Confirm the address before saving.');
  }
  async function chooseLogo() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setLogo(result.assets[0]);
  }
  async function save() {
    if (!accessToken) return;
    setBusy(true);
    setMessage('');
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      if (logo)
        body.append('image', {
          uri: logo.uri,
          name: logo.fileName ?? 'business-logo.jpg',
          type: logo.mimeType ?? 'image/jpeg',
        } as unknown as Blob);
      const result = exists
        ? await linksApi.updateBusiness(accessToken, body)
        : await linksApi.createBusiness(accessToken, body);
      setExists(true);
      setEditing(false);
      setMessage(
        exists
          ? 'Business profile updated.'
          : 'Business profile and four links are ready.',
      );
      setSettlement(await linksApi.settlement(accessToken));
      setForm((current) => ({
        ...current,
        businessName: String(result.business.name ?? current.businessName),
      }));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not save profile',
      );
    } finally {
      setBusy(false);
    }
  }
  const field = (
    key: keyof typeof form,
    label: string,
    keyboardType?: 'phone-pad' | 'numeric',
  ) => (
    <Input
      accessibilityLabel={label}
      value={form[key]}
      keyboardType={keyboardType}
      onChangeText={(value) =>
        setForm((current) => ({ ...current, [key]: value }))
      }
    />
  );
  return (
    <Screen title="Business" description="Profile and settlement setup">
      <Card>
        <Text className="text-xl font-bold text-foreground-light dark:text-foreground-dark">
          Set your profile
        </Text>
        {exists && !editing ? (
          <View className="mt-4 gap-4">
            <Alert tone="success">
              Your business profile is active. Existing links remain stable.
            </Alert>
            <Button variant="secondary" onPress={() => setEditing(true)}>
              Edit business profile
            </Button>
          </View>
        ) : (
          <View className="mt-4 gap-4">
            <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
              Business category
            </Text>
            {categories.map(([value, label]) => (
              <Radio
                key={value}
                label={label}
                selected={form.category === value}
                onPress={() =>
                  setForm((current) => ({ ...current, category: value }))
                }
              />
            ))}
            {form.category === 'OTHER'
              ? field('otherCategory', 'Other category')
              : null}
            {field('businessName', 'Business name')}
            {field('phoneNumber', 'Phone number', 'phone-pad')}
            {field('address', 'Business location')}
            {field('city', 'City')}
            {field('state', 'State')}
            {field('houseAddress', 'Building / floor')}
            {field('landmark', 'Landmark')}
            <Button variant="secondary" onPress={currentLocation}>
              Use current location
            </Button>
            <Button variant="secondary" onPress={chooseLogo}>
              {logo ? 'Logo selected' : 'Choose business logo'}
            </Button>
            <Button loading={busy} onPress={save}>
              {exists ? 'Save changes' : 'Continue'}
            </Button>
            {exists ? (
              <Button variant="ghost" onPress={() => setEditing(false)}>
                Cancel
              </Button>
            ) : null}
          </View>
        )}
        {message ? (
          <Text className="mt-3 text-foreground-light dark:text-foreground-dark">
            {message}
          </Text>
        ) : null}
      </Card>
      <Card>
        <Text className="text-sm text-muted-light dark:text-muted-dark">
          Settlement balance
        </Text>
        <Text className="mt-2 text-3xl font-bold text-foreground-light dark:text-foreground-dark">
          {settlement ? money(settlement.balance) : '—'}
        </Text>
        <Text className="mt-1 text-muted-light dark:text-muted-dark">
          {settlement?.status ?? 'Complete your profile'}
        </Text>
      </Card>
    </Screen>
  );
}

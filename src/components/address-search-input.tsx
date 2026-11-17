import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { apiRequest } from '@/api/client';
import { Input } from '@/components/ui/input';

export type SelectedAddress = {
  placeId: string;
  formattedAddress: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
};

type Suggestion = { placeId: string; description: string };

export function AddressSearchInput({
  label,
  value,
  onChange,
  onSelect,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: SelectedAddress) => void;
}) {
  const [selectedValue, setSelectedValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (value === selectedValue || value.trim().length < 3) {
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      apiRequest<Suggestion[]>(
        `/reference/places/autocomplete?input=${encodeURIComponent(value.trim())}`,
      )
        .then((items) => active && setSuggestions(items))
        .catch((reason) => {
          if (active)
            setError(
              reason instanceof Error
                ? reason.message
                : 'Address search is unavailable',
            );
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selectedValue, value]);

  async function choose(item: Suggestion) {
    setError('');
    try {
      const address = await apiRequest<SelectedAddress>(
        `/reference/places/details?placeId=${encodeURIComponent(item.placeId)}`,
      );
      setSelectedValue(address.formattedAddress);
      onChange(address.formattedAddress);
      onSelect(address);
      setSuggestions([]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not select that address',
      );
    }
  }

  return (
    <View className="gap-1">
      <Input
        accessibilityLabel={label}
        placeholder={label}
        value={value}
        autoCorrect={false}
        onChangeText={(text) => {
          setSelectedValue('');
          setSuggestions([]);
          onChange(text);
        }}
      />
      {suggestions.length ? (
        <View className="overflow-hidden rounded-xl border border-border-light bg-card-light dark:border-border-dark dark:bg-card-dark">
          {suggestions.map((item) => (
            <Pressable
              key={item.placeId}
              className="border-b border-border-light px-4 py-3 dark:border-border-dark"
              onPress={() => void choose(item)}
            >
              <Text className="text-sm text-foreground-light dark:text-foreground-dark">
                {item.description}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {value && value !== selectedValue ? (
        <Text className="text-xs text-warning">
          Select an address from the suggestions.
        </Text>
      ) : null}
      {error ? <Text className="text-xs text-danger">{error}</Text> : null}
    </View>
  );
}

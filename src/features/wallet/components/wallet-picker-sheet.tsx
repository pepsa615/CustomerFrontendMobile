import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Input } from '@/components/ui/input';

export function WalletPickerSheet({
  visible,
  title,
  items,
  selectedId,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: { id: string; label: string; meta?: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(needle) ||
        item.meta?.toLowerCase().includes(needle),
    );
  }, [items, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="max-h-[75%] rounded-t-3xl bg-surface-light px-5 pb-8 pt-5 dark:bg-surface-dark">
          <Text className="mb-4 text-center text-lg font-bold text-foreground-light dark:text-foreground-dark">
            {title}
          </Text>
          <Input
            accessibilityLabel="Search"
            placeholder="Search"
            value={query}
            onChangeText={setQuery}
          />
          <ScrollView className="mt-3 max-h-96">
            {filtered.map((item) => {
              const active = item.id === selectedId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onSelect(item.id);
                    setQuery('');
                    onClose();
                  }}
                  className="flex-row items-center justify-between border-b border-border-light py-4 dark:border-border-dark"
                >
                  <View className="max-w-[80%]">
                    <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
                      {item.label}
                    </Text>
                    {item.meta ? (
                      <Text className="text-xs text-muted-light dark:text-muted-dark">
                        {item.meta}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    className={`size-5 rounded-full border-2 ${active ? 'border-primary-light bg-primary-light dark:border-primary-dark dark:bg-primary-dark' : 'border-border-light bg-primary-light/10 dark:border-border-dark'}`}
                  />
                </Pressable>
              );
            })}
            {!filtered.length ? (
              <Text className="py-8 text-center text-muted-light dark:text-muted-dark">
                No matches
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

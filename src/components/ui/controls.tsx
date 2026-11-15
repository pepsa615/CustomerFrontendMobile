import type { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  Switch as NativeSwitch,
  Text,
  View,
} from 'react-native';
export function Alert({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'danger' | 'success';
}) {
  return (
    <View
      accessibilityRole={tone === 'danger' ? 'alert' : undefined}
      className={`rounded-2xl border p-4 ${tone === 'danger' ? 'border-danger-light/30' : tone === 'success' ? 'border-success-light/30' : 'border-border-light dark:border-border-dark'}`}
    >
      <Text
        className={
          tone === 'danger'
            ? 'text-danger-light dark:text-danger-dark'
            : tone === 'success'
              ? 'text-success-light dark:text-success-dark'
              : 'text-foreground-light dark:text-foreground-dark'
        }
      >
        {children}
      </Text>
    </View>
  );
}
export function Switch({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="flex-1 text-foreground-light dark:text-foreground-dark">
        {label}
      </Text>
      <NativeSwitch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: '#9d0208' }}
      />
    </View>
  );
}
export function Radio({
  selected,
  onPress,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className="flex-row items-center gap-3 py-2"
    >
      <View
        className={`size-5 rounded-full border-2 ${selected ? 'border-[6px] border-primary-light' : 'border-border-light'}`}
      />
      <Text className="text-foreground-light dark:text-foreground-dark">
        {label}
      </Text>
    </Pressable>
  );
}
export function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row rounded-xl bg-background-light p-1 dark:bg-background-dark"
    >
      {items.map((item) => (
        <Pressable
          key={item.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: item.value === value }}
          onPress={() => onChange(item.value)}
          className={`min-h-10 flex-1 items-center justify-center rounded-lg ${item.value === value ? 'bg-surface-light dark:bg-surface-dark' : ''}`}
        >
          <Text className="font-medium text-foreground-light dark:text-foreground-dark">
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function BottomSheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/50">
        <Pressable
          onPress={() => undefined}
          className="max-h-[90%] rounded-t-3xl bg-surface-light p-5 dark:bg-surface-dark"
        >
          <View className="mb-4 h-1 w-12 self-center rounded bg-border-light" />
          <Text
            accessibilityRole="header"
            className="mb-4 text-xl font-semibold text-foreground-light dark:text-foreground-dark"
          >
            {title}
          </Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
export const Select = BottomSheet;
export const Calendar = BottomSheet;

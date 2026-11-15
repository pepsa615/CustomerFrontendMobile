import { useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
export function Input({ accessibilityLabel, ...props }: TextInputProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-foreground-light dark:text-foreground-dark">
        {accessibilityLabel}
      </Text>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor="#898f8f"
        className="min-h-12 rounded-xl border border-border-light bg-surface-light px-4 text-foreground-light dark:border-border-dark dark:bg-surface-dark dark:text-foreground-dark"
        {...props}
      />
    </View>
  );
}
export function PasswordInput(props: TextInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Input {...props} secureTextEntry={!visible} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        onPress={() => setVisible((value) => !value)}
        className="absolute bottom-0 right-0 min-h-12 justify-center px-4"
      >
        <Text className="font-medium text-primary-light dark:text-primary-dark">
          {visible ? 'Hide' : 'Show'}
        </Text>
      </Pressable>
    </View>
  );
}
export function OtpInput({
  value,
  onChangeText,
  label = 'Verification code',
}: {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
}) {
  return (
    <Input
      accessibilityLabel={label}
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      maxLength={6}
      value={value}
      onChangeText={(next) => onChangeText(next.replace(/\D/g, '').slice(0, 6))}
      className="text-center text-xl tracking-widest"
    />
  );
}

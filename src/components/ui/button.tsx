import type { ReactNode } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';

export function Button({
  children,
  disabled,
  loading,
  variant = 'primary',
  ...props
}: Omit<PressableProps, 'children'> & {
  children: ReactNode;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      className={`min-h-12 items-center justify-center rounded-xl px-4 active:opacity-80 disabled:opacity-50 ${variant === 'primary' ? 'bg-primary-light dark:bg-primary-dark' : variant === 'danger' ? 'bg-danger-light dark:bg-danger-dark' : variant === 'ghost' ? 'bg-transparent' : 'border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark'}`}
      {...props}
    >
      <Text
        className={`font-semibold ${variant === 'primary' || variant === 'danger' ? 'text-white' : 'text-foreground-light dark:text-foreground-dark'}`}
      >
        {loading ? 'Working…' : children}
      </Text>
    </Pressable>
  );
}

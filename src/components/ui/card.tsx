import { View, type ViewProps } from 'react-native';
export function Card(props: ViewProps) {
  return (
    <View
      className="rounded-2xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark"
      {...props}
    />
  );
}

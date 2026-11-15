import { Text } from 'react-native';
import { Card } from './card';
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <Text className="text-center text-lg font-semibold text-foreground-light dark:text-foreground-dark">
        {title}
      </Text>
      <Text className="mt-2 text-center text-muted-light dark:text-muted-dark">
        {description}
      </Text>
    </Card>
  );
}
export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <Card>
      <Text
        accessibilityRole="text"
        className="text-center text-muted-light dark:text-muted-dark"
      >
        {label}…
      </Text>
    </Card>
  );
}
export function ErrorState({
  message,
  description,
  title = 'Something went wrong',
  actionLabel,
  onAction,
}: {
  message?: string;
  description?: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card accessibilityRole="alert">
      <Text className="font-semibold text-red-700 dark:text-red-300">
        {title}
      </Text>
      <Text className="mt-2 text-muted-light dark:text-muted-dark">
        {message ?? description}
      </Text>
      {actionLabel && onAction ? (
        <Text
          accessibilityRole="button"
          onPress={onAction}
          className="mt-3 font-semibold text-primary-light dark:text-primary-dark"
        >
          {actionLabel}
        </Text>
      ) : null}
    </Card>
  );
}

import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';

export function WalletFlowHeader({
  title,
  showHistory = false,
}: {
  title: string;
  showHistory?: boolean;
}) {
  return (
    <View className="mb-5 flex-row items-center gap-3">
      <Pressable
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        className="size-11 items-center justify-center rounded-full bg-primary-light/10 dark:bg-primary-dark/20"
      >
        <Text className="text-xl font-bold text-primary-light dark:text-primary-dark">
          ‹
        </Text>
      </Pressable>
      <Text className="flex-1 text-xl font-bold text-foreground-light dark:text-foreground-dark">
        {title}
      </Text>
      {showHistory ? (
        <Pressable
          onPress={() => router.push('/(app)/wallet/history' as never)}
        >
          <Text className="text-sm font-semibold text-primary-light dark:text-primary-dark">
            History
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

import { SafeAreaView } from 'react-native-safe-area-context';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';

export function Screen({
  title,
  description,
  action,
  children,
}: PropsWithChildren<{
  title: string;
  description?: string;
  action?: ReactNode;
}>) {
  return (
    <SafeAreaView
      className="flex-1 bg-background-light dark:bg-background-dark"
      edges={['top']}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-5 p-5"
        >
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text
                accessibilityRole="header"
                className="text-3xl font-bold text-foreground-light dark:text-foreground-dark"
              >
                {title}
              </Text>
              {description ? (
                <Text className="mt-2 text-muted-light dark:text-muted-dark">
                  {description}
                </Text>
              ) : null}
            </View>
            {action}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

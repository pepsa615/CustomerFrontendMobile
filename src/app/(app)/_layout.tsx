import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/providers/session-provider';
export default function AppLayout() {
  const { accessToken, user, isRestoring } = useSession();
  if (isRestoring) return null;
  if (!accessToken) return <Redirect href="/(auth)/login" />;
  if (user && !user.emailVerified)
    return <Redirect href="/(auth)/verify-email" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

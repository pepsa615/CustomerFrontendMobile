import { useLocalSearchParams } from 'expo-router';
import { SettingsDetailScreen } from '@/features/settings/settings-detail-screen';
export default function SettingsDetail() {
  const { section } = useLocalSearchParams<{ section: string }>();
  return <SettingsDetailScreen section={section} />;
}

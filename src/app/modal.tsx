import { View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
export default function NewOrderModal() {
  return (
    <Screen
      title="Request delivery"
      description="Quote details will be sent securely to PEPSA."
    >
      <View className="gap-4">
        <Input accessibilityLabel="Pickup address" />
        <Input accessibilityLabel="Delivery address" />
        <Button>Continue to quote</Button>
      </View>
    </Screen>
  );
}

import { Text, View } from 'react-native';
import { PasswordInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, Switch } from '@/components/ui/controls';
import { WalletFlowHeader } from './wallet-flow-header';

const money = (value: string | number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
    Number(value),
  );

export function PaymentReview({
  title,
  amount,
  rows,
  balance,
  pin,
  onPinChange,
  save,
  onSaveChange,
  showSave,
  loyalty,
  usePoints,
  onUsePointsChange,
  error,
  loading,
  onPay,
  onBack,
}: {
  title: string;
  amount: number;
  rows: { label: string; value: string }[];
  balance: string;
  pin: string;
  onPinChange: (v: string) => void;
  save: boolean;
  onSaveChange: (v: boolean) => void;
  showSave: boolean;
  loyalty?: {
    enabled: boolean;
    points: number;
    discountNaira: number;
    label: string;
  };
  usePoints: boolean;
  onUsePointsChange: (v: boolean) => void;
  error: string;
  loading: boolean;
  onPay: () => void;
  onBack: () => void;
}) {
  const discount = loyalty?.enabled && usePoints ? loyalty.discountNaira : 0;
  const payable = Math.max(0, amount - discount);

  return (
    <View className="gap-5">
      <WalletFlowHeader title={title} />
      <Text className="text-center text-3xl font-bold text-foreground-light dark:text-foreground-dark">
        {money(payable)}
      </Text>
      {rows.map((row) => (
        <View
          key={row.label}
          className="flex-row items-center justify-between border-b border-border-light py-3 dark:border-border-dark"
        >
          <Text className="text-muted-light dark:text-muted-dark">
            {row.label}
          </Text>
          <Text className="font-medium text-foreground-light dark:text-foreground-dark">
            {row.value}
          </Text>
        </View>
      ))}
      {loyalty?.enabled ? (
        <Switch
          value={usePoints}
          onValueChange={onUsePointsChange}
          label={`${loyalty.label} (${loyalty.points}) · ${money(loyalty.discountNaira)}`}
        />
      ) : null}
      <Text className="text-base font-bold text-foreground-light dark:text-foreground-dark">
        Payment Sources
      </Text>
      <View className="rounded-2xl border border-border-light p-4 dark:border-border-dark">
        <Text className="font-bold text-foreground-light dark:text-foreground-dark">
          Account Balance
        </Text>
        <Text className="text-muted-light dark:text-muted-dark">
          {money(balance)}
        </Text>
      </View>
      <PasswordInput
        accessibilityLabel="Transaction PIN"
        keyboardType="number-pad"
        maxLength={4}
        value={pin}
        onChangeText={(v) => onPinChange(v.replace(/\D/g, ''))}
        placeholder="Enter 4 digit pin"
      />
      {showSave ? (
        <Switch
          value={save}
          onValueChange={onSaveChange}
          label="Save as Beneficiary"
        />
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        loading={loading}
        disabled={pin.length !== 4}
        onPress={onPay}
        className="h-14 rounded-2xl"
      >
        Pay
      </Button>
      <Button variant="ghost" onPress={onBack}>
        Edit details
      </Button>
    </View>
  );
}

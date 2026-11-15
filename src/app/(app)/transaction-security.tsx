import { useState } from 'react';
import { View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { Input, OtpInput, PasswordInput } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/controls';
import { apiRequest } from '@/api/client';
import { useSession } from '@/providers/session-provider';
export default function TransactionSecurity() {
  const { accessToken, user } = useSession();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  async function next() {
    try {
      if (step === 0) {
        await apiRequest('/account/phone', accessToken ?? undefined, {
          method: 'POST',
          body: JSON.stringify({ phone }),
        });
        setStep(1);
      } else if (step === 1) {
        await apiRequest(
          '/account/phone/verify-otp',
          accessToken ?? undefined,
          { method: 'POST', body: JSON.stringify({ code }) },
        );
        setStep(2);
      } else {
        await apiRequest('/account/transaction-pin', accessToken ?? undefined, {
          method: 'POST',
          body: JSON.stringify({ pin, confirmPin: confirm }),
        });
        setMessage('Transaction security is ready.');
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : 'Could not continue');
    }
  }
  return (
    <Screen
      title="Transaction security"
      description="Verify your phone and create a four-digit PIN."
    >
      <View className="gap-4">
        {message ? (
          <Alert tone={message.includes('ready') ? 'success' : 'danger'}>
            {message}
          </Alert>
        ) : null}
        {step === 0 ? (
          <Input
            accessibilityLabel="Phone number"
            value={phone}
            onChangeText={setPhone}
          />
        ) : null}
        {step === 1 ? <OtpInput value={code} onChangeText={setCode} /> : null}
        {step === 2 ? (
          <>
            <PasswordInput
              accessibilityLabel="Four-digit PIN"
              keyboardType="number-pad"
              maxLength={4}
              value={pin}
              onChangeText={setPin}
            />
            <PasswordInput
              accessibilityLabel="Confirm PIN"
              keyboardType="number-pad"
              maxLength={4}
              value={confirm}
              onChangeText={setConfirm}
            />
          </>
        ) : null}
        <Button onPress={next}>Continue</Button>
      </View>
    </Screen>
  );
}

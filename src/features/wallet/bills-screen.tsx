import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/controls';
import { useSession } from '@/providers/session-provider';
import { walletApi } from './api';
import { WalletFlowHeader } from './components/wallet-flow-header';
import { WalletPickerSheet } from './components/wallet-picker-sheet';
import { PaymentReview } from './components/payment-review';

function inferBillPath(categoryName: string, billerName: string) {
  const hay = `${categoryName} ${billerName}`.toLowerCase();
  if (hay.includes('cable') || hay.includes('dstv') || hay.includes('gotv'))
    return 'cable-tv' as const;
  return 'electricity' as const;
}

export function BillsScreen() {
  const { accessToken } = useSession();
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [billers, setBillers] = useState<{ id: string; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [billerId, setBillerId] = useState('');
  const [billerName, setBillerName] = useState('');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [save, setSave] = useState(false);
  const [validationReference, setValidationReference] = useState('');
  const [accountName, setAccountName] = useState('');
  const [picker, setPicker] = useState<'category' | 'biller' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState('0');

  const billPath = useMemo(
    () => inferBillPath(categoryName, billerName),
    [billerName, categoryName],
  );

  useEffect(() => {
    if (!accessToken) return;
    void walletApi.categories(accessToken).then(setCategories);
    void walletApi
      .overview(accessToken)
      .then((w) => setBalance(w.availableBalance));
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !categoryId) return;
    void walletApi.billers(accessToken, categoryId).then(setBillers);
  }, [accessToken, categoryId]);

  const validateAndReview = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const value = await walletApi.validateBiller(accessToken, {
        billerId,
        beneficiaryIdentifier: account,
        fields: { accountNumber: account },
      });
      setValidationReference(value.validationReference);
      setAccountName(value.customerName);
      setStep('review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const pay = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const result = await walletApi.purchase(
        accessToken,
        billPath,
        {
          productProvider: billerName,
          beneficiaryIdentifier: account,
          amount: Number(amount),
          pin,
          billerId,
          validationReference,
          customerFields: { accountNumber: account },
          saveBeneficiary: save,
        },
        crypto.randomUUID(),
      );
      router.replace({
        pathname: '/(app)/wallet/receipt',
        params: { id: result.id },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'review') {
    return (
      <ScrollView
        className="flex-1 bg-background-light dark:bg-background-dark"
        contentContainerClassName="px-5 pb-10 pt-14"
      >
        <PaymentReview
          title="BILLS"
          amount={Number(amount)}
          rows={[
            { label: 'Product name', value: billPath.replace('-', ' ') },
            { label: 'Network operator', value: billerName },
            { label: 'Account number', value: account },
            { label: 'Customer', value: accountName },
            { label: 'Amount', value: amount },
          ]}
          balance={balance}
          pin={pin}
          onPinChange={setPin}
          save={save}
          onSaveChange={setSave}
          showSave
          usePoints={false}
          onUsePointsChange={() => {}}
          error={error}
          loading={loading}
          onPay={() => void pay()}
          onBack={() => setStep('form')}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark"
      contentContainerClassName="gap-4 px-5 pb-10 pt-14"
    >
      <WalletFlowHeader title="Bill Payment" showHistory />
      <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
        Bill Type
      </Text>
      <Pressable
        onPress={() => setPicker('category')}
        className="h-12 justify-center rounded-xl border border-border-light px-4 dark:border-border-dark"
      >
        <Text
          className={
            categoryName
              ? 'font-medium text-foreground-light dark:text-foreground-dark'
              : 'text-muted-light dark:text-muted-dark'
          }
        >
          {categoryName || 'Select'}
        </Text>
      </Pressable>
      <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
        Select Provider
      </Text>
      <Pressable
        disabled={!categoryId}
        onPress={() => setPicker('biller')}
        className="h-12 justify-center rounded-xl border border-border-light px-4 opacity-100 disabled:opacity-50 dark:border-border-dark"
      >
        <Text
          className={
            billerName
              ? 'font-medium text-foreground-light dark:text-foreground-dark'
              : 'text-muted-light dark:text-muted-dark'
          }
        >
          {billerName || 'Select'}
        </Text>
      </Pressable>
      <Input
        accessibilityLabel="Account number"
        value={account}
        onChangeText={setAccount}
        placeholder={
          billPath === 'electricity'
            ? 'enter account number'
            : 'enter smart card number'
        }
      />
      <Input
        accessibilityLabel="Amount"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="Enter Amount in Figure"
      />
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        loading={loading}
        disabled={!categoryId || !billerId || !account || !amount}
        className="mt-4 h-14 rounded-2xl"
        onPress={() => void validateAndReview()}
      >
        Pay
      </Button>
      <WalletPickerSheet
        visible={picker === 'category'}
        title="Bill Type"
        items={categories.map((c) => ({ id: c.id, label: c.name }))}
        selectedId={categoryId}
        onSelect={(id) => {
          const item = categories.find((c) => c.id === id);
          setCategoryId(id);
          setCategoryName(item?.name ?? '');
          setBillerId('');
          setBillerName('');
        }}
        onClose={() => setPicker(null)}
      />
      <WalletPickerSheet
        visible={picker === 'biller'}
        title="Select Provider"
        items={billers.map((b) => ({ id: b.id, label: b.name }))}
        selectedId={billerId}
        onSelect={(id) => {
          const item = billers.find((b) => b.id === id);
          setBillerId(id);
          setBillerName(item?.name ?? '');
        }}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
}

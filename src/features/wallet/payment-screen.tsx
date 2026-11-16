import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, Tabs } from '@/components/ui/controls';
import { useSession } from '@/providers/session-provider';
import {
  walletApi,
  type Bank,
  type Beneficiary,
  type TransactionReadiness,
  type WalletLoyalty,
  type WalletTransaction,
} from './api';
import { WalletFlowHeader } from './components/wallet-flow-header';
import { WalletPickerSheet } from './components/wallet-picker-sheet';
import { PaymentReview } from './components/payment-review';

type Kind = 'transfer' | 'airtime' | 'data' | 'electricity' | 'cable-tv';
const titles: Record<Kind, string> = {
  transfer: 'Transfer',
  airtime: 'Mobile Top-Up',
  data: 'Mobile Top-Up',
  electricity: 'Bill Payment',
  'cable-tv': 'Bill Payment',
};

export function PaymentScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const kind = (params.type ?? 'transfer') as Kind;
  const { accessToken } = useSession();
  const [step, setStep] = useState<'form' | 'review'>('form');
  const [scope, setScope] = useState('internal');
  const [account, setAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('PEPSA');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [accountName, setAccountName] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('');
  const [providerName, setProviderName] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [nin, setNin] = useState('');
  const [needsNin, setNeedsNin] = useState(false);
  const [save, setSave] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [readiness, setReadiness] = useState<TransactionReadiness | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [plans, setPlans] = useState<
    { productId: string; name: string; amount: number }[]
  >([]);
  const [productId, setProductId] = useState('');
  const [validationReference, setValidationReference] = useState('');
  const [loyalty, setLoyalty] = useState<WalletLoyalty | null>(null);
  const [balance, setBalance] = useState('0');
  const [billers, setBillers] = useState<{ id: string; name: string }[]>([]);
  const [picker, setPicker] = useState<
    'bank' | 'provider' | 'airtime-beneficiary' | 'plan' | null
  >(null);
  const [topUpType, setTopUpType] = useState<'airtime' | 'data'>(
    kind === 'data' ? 'data' : 'airtime',
  );

  const transfer = kind === 'transfer';
  const bill = kind === 'electricity' || kind === 'cable-tv';
  const effectiveKind: Kind =
    kind === 'airtime' || kind === 'data' ? topUpType : kind;

  const bankItems = useMemo(
    () =>
      banks
        .map((bank) => ({
          id: bank.attributes?.nipCode ?? bank.code ?? bank.id ?? '',
          label: bank.attributes?.name ?? bank.name ?? '',
        }))
        .filter((b) => b.id && b.label)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [banks],
  );

  useEffect(() => {
    if (!accessToken) return;
    void walletApi.readiness(accessToken).then(setReadiness);
    void walletApi
      .overview(accessToken)
      .then((w) => setBalance(w.availableBalance));
    if (kind === 'airtime' || kind === 'data')
      void walletApi.loyalty(accessToken).then(setLoyalty);
  }, [accessToken, kind]);

  useEffect(() => {
    if (
      !accessToken ||
      !transfer ||
      account.length !== 10 ||
      (scope === 'external' && !bankCode)
    )
      return;
    const timer = setTimeout(
      () =>
        walletApi
          .resolve(accessToken, {
            scope,
            accountNumber: account,
            bankCode: scope === 'external' ? bankCode : undefined,
          })
          .then((value) => {
            setAccountName(value.accountName);
            setBankName(value.bankName);
          })
          .catch(() => setAccountName('')),
      350,
    );
    return () => clearTimeout(timer);
  }, [accessToken, transfer, scope, account, bankCode]);

  useEffect(() => {
    if (
      !accessToken ||
      !['airtime', 'data'].includes(effectiveKind) ||
      phone.length !== 11
    )
      return;
    const timer = setTimeout(
      () =>
        walletApi
          .detectNetwork(accessToken, phone)
          .then((value) => setProvider(value.network))
          .catch(() => setProvider('')),
      300,
    );
    return () => clearTimeout(timer);
  }, [accessToken, effectiveKind, phone]);

  useEffect(() => {
    if (accessToken && (transfer || effectiveKind === 'airtime'))
      void walletApi.beneficiaries(accessToken).then(setBeneficiaries);
  }, [accessToken, transfer, effectiveKind]);

  useEffect(() => {
    if (!accessToken || !transfer || scope !== 'external') return;
    void walletApi.banks(accessToken).then(setBanks);
  }, [accessToken, transfer, scope]);

  useEffect(() => {
    if (!accessToken || effectiveKind !== 'data' || phone.length !== 11) return;
    void walletApi.plans(accessToken, phone).then(setPlans);
  }, [accessToken, effectiveKind, phone]);

  useEffect(() => {
    if (!accessToken || !bill) return;
    void walletApi.categories(accessToken).then(async (categories) => {
      const category =
        categories.find((c) =>
          kind === 'electricity'
            ? c.name.toLowerCase().includes('electric')
            : c.name.toLowerCase().includes('cable') ||
              c.name.toLowerCase().includes('tv'),
        ) ?? categories[0];
      if (!category) return;
      const list = await walletApi.billers(accessToken, category.id);
      setBillers(list);
    });
  }, [accessToken, bill, kind]);

  const continueToReview = async () => {
    setError('');
    if (bill) {
      if (!accessToken) return;
      setLoading(true);
      try {
        const value = await walletApi.validateBiller(accessToken, {
          billerId: provider,
          beneficiaryIdentifier: account,
          fields: { accountNumber: account },
        });
        setValidationReference(value.validationReference);
        setAccountName(value.customerName);
        setStep('review');
      } catch (e) {
        setError(
          e instanceof Error ? e.message : 'Could not validate customer',
        );
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep('review');
  };

  const submit = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      let result: WalletTransaction;
      const key = crypto.randomUUID();
      if (transfer) {
        if (scope === 'external' && needsNin)
          await walletApi.saveNin(accessToken, nin);
        result = await walletApi.transfer(
          accessToken,
          scope,
          {
            accountNumber: account,
            bankCode: scope === 'external' ? bankCode : undefined,
            accountName,
            bankName,
            amount: Number(amount),
            pin,
            saveBeneficiary: save,
          },
          key,
        );
      } else {
        result = await walletApi.purchase(
          accessToken,
          effectiveKind,
          {
            productProvider: provider || providerName || bankName,
            beneficiaryIdentifier: bill ? account : phone,
            amount: Number(amount),
            pin,
            saveBeneficiary: save,
            ...(effectiveKind === 'data' ? { productId } : {}),
            ...(bill
              ? {
                  billerId: provider,
                  validationReference,
                  customerFields: { accountNumber: account },
                }
              : {}),
          },
          key,
        );
      }
      router.replace({
        pathname: '/(app)/wallet/receipt',
        params: { id: result.id },
      });
    } catch (e) {
      const api = e as { code?: string; message?: string };
      if (api.code === 'NIN_REQUIRED') {
        setNeedsNin(true);
        setStep('form');
        setError('Enter your NIN to continue this external transfer.');
      } else setError(api.message ?? 'Payment could not be completed');
    } finally {
      setLoading(false);
    }
  };

  const canContinue =
    Number(amount) > 0 &&
    (transfer
      ? account.length === 10 &&
        Boolean(accountName) &&
        (scope === 'internal' || Boolean(bankCode))
      : bill
        ? Boolean(provider) && Boolean(account)
        : effectiveKind === 'data'
          ? phone.length === 11 && Boolean(productId)
          : phone.length === 11);

  if (readiness && !readiness.kycComplete) {
    return (
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-14">
        <Card className="gap-4">
          <Text className="text-lg font-bold">Verify your identity</Text>
          <Text className="text-muted-light dark:text-muted-dark">
            Complete KYC before your first transfer or bill payment.
          </Text>
          <Button onPress={() => router.push('/(app)/kyc' as Href)}>
            Start verification
          </Button>
        </Card>
      </ScrollView>
    );
  }
  if (readiness && (!readiness.phoneVerified || !readiness.pinSet)) {
    return (
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-14">
        <Card className="gap-4">
          <Text className="text-muted-light dark:text-muted-dark">
            Verify your phone and set a transaction PIN first.
          </Text>
          <Button onPress={() => router.push('/(app)/transaction-security')}>
            Set up transaction PIN
          </Button>
        </Card>
      </ScrollView>
    );
  }

  if (step === 'review') {
    const rows = transfer
      ? [
          { label: 'Recipient', value: accountName },
          { label: 'Account number', value: account },
          { label: 'Bank', value: bankName },
          { label: 'Amount', value: amount },
        ]
      : bill
        ? [
            { label: 'Product name', value: effectiveKind.replace('-', ' ') },
            { label: 'Network operator', value: providerName },
            { label: 'Account number', value: account },
            { label: 'Amount', value: amount },
          ]
        : [
            { label: 'Product name', value: effectiveKind },
            {
              label: 'Network operator',
              value: (provider || providerName).toUpperCase(),
            },
            { label: 'Recipient mobile', value: phone },
            { label: 'Amount', value: amount },
          ];
    return (
      <ScrollView
        className="flex-1 bg-background-light dark:bg-background-dark"
        contentContainerClassName="px-5 pb-10 pt-14"
      >
        <PaymentReview
          title={
            transfer
              ? 'Transfer'
              : effectiveKind === 'airtime'
                ? 'Airtime'
                : bill
                  ? 'BILLS'
                  : 'Payment'
          }
          amount={Number(amount)}
          rows={rows}
          balance={balance}
          pin={pin}
          onPinChange={setPin}
          save={save}
          onSaveChange={setSave}
          showSave
          loyalty={loyalty ?? undefined}
          usePoints={usePoints}
          onUsePointsChange={setUsePoints}
          error={error}
          loading={loading}
          onPay={() => void submit()}
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
      <WalletFlowHeader title={titles[kind]} showHistory={!transfer} />
      {transfer ? (
        <Tabs
          value={scope}
          onChange={(value) => {
            setScope(value);
            setAccountName('');
          }}
          items={[
            { value: 'internal', label: 'Pepsa' },
            { value: 'external', label: 'Other Banks' },
          ]}
        />
      ) : null}
      {transfer && beneficiaries.some((item) => item.scope === scope) ? (
        <View className="gap-2">
          <Text className="font-bold">Beneficiary</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {beneficiaries
              .filter((item) => item.scope === scope)
              .map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    setAccount(item.accountNumber);
                    setBankCode(item.bankCode ?? '');
                    setBankName(item.bankName);
                    setAccountName(item.accountName);
                  }}
                  className="mr-2 rounded-2xl bg-primary-light/10 px-4 py-3 dark:bg-primary-dark/20"
                >
                  <Text className="font-bold text-foreground-light dark:text-foreground-dark">
                    {item.accountName}
                  </Text>
                  <Text className="text-xs text-muted-light dark:text-muted-dark">
                    {item.bankName} · {item.accountNumber}
                  </Text>
                </Pressable>
              ))}
          </ScrollView>
        </View>
      ) : null}
      {transfer && scope === 'external' ? (
        <Pressable
          onPress={() => setPicker('bank')}
          className="h-12 justify-center rounded-xl border border-border-light px-4 dark:border-border-dark"
        >
          <Text className="font-medium text-foreground-light dark:text-foreground-dark">
            {bankCode ? bankName : 'Select Bank'}
          </Text>
        </Pressable>
      ) : null}
      {transfer ? (
        <>
          <Input
            accessibilityLabel="Recipient account number"
            keyboardType="number-pad"
            maxLength={10}
            value={account}
            onChangeText={(v) => {
              setAccount(v.replace(/\D/g, ''));
              setAccountName('');
            }}
            placeholder="10 digit account number"
          />
          {accountName ? (
            <Text className="font-semibold text-success-light">
              {accountName}
            </Text>
          ) : null}
        </>
      ) : null}
      {(kind === 'airtime' || kind === 'data') && (
        <>
          <Pressable
            onPress={() =>
              setTopUpType((t) => (t === 'airtime' ? 'data' : 'airtime'))
            }
            className="h-12 justify-center rounded-xl border border-border-light px-4 dark:border-border-dark"
          >
            <Text className="font-medium capitalize text-foreground-light dark:text-foreground-dark">
              Top-Up Type: {topUpType}
            </Text>
          </Pressable>
          <Pressable onPress={() => setPicker('airtime-beneficiary')}>
            <Text className="font-bold text-foreground-light dark:text-foreground-dark">
              Select From Beneficiary
            </Text>
          </Pressable>
          <Input
            accessibilityLabel="Phone number"
            keyboardType="phone-pad"
            maxLength={11}
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
            placeholder="Enter phone number"
          />
          {provider ? (
            <Text className="font-semibold text-success-light">
              {provider.toUpperCase()}
            </Text>
          ) : null}
          {effectiveKind === 'data' ? (
            <Pressable
              onPress={() => setPicker('plan')}
              className="h-12 justify-center rounded-xl border border-border-light px-4 dark:border-border-dark"
            >
              <Text className="font-medium text-foreground-light dark:text-foreground-dark">
                {productId
                  ? (plans.find((p) => p.productId === productId)?.name ??
                    'Plan selected')
                  : 'Select data plan'}
              </Text>
            </Pressable>
          ) : null}
        </>
      )}
      {bill ? (
        <>
          <Pressable
            onPress={() => setPicker('provider')}
            className="h-12 justify-center rounded-xl border border-border-light px-4 dark:border-border-dark"
          >
            <Text className="font-medium text-foreground-light dark:text-foreground-dark">
              {providerName || 'Select Provider'}
            </Text>
          </Pressable>
          <Input
            accessibilityLabel="Account or smartcard"
            value={account}
            onChangeText={(value) => {
              setAccount(value);
              setValidationReference('');
            }}
            placeholder={
              kind === 'electricity'
                ? 'enter account number'
                : 'enter smart card number'
            }
          />
        </>
      ) : null}
      <Input
        accessibilityLabel="Amount"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
        placeholder="Enter Amount in Figure"
      />
      {needsNin ? (
        <Input
          accessibilityLabel="NIN"
          keyboardType="number-pad"
          maxLength={11}
          value={nin}
          onChangeText={(v) => setNin(v.replace(/\D/g, ''))}
        />
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button
        loading={loading}
        disabled={!canContinue}
        className="mt-2 h-14 rounded-2xl"
        onPress={() => void continueToReview()}
      >
        {bill ? 'Pay' : 'Continue'}
      </Button>
      <WalletPickerSheet
        visible={picker === 'bank'}
        title="Select Bank"
        items={bankItems}
        selectedId={bankCode}
        onSelect={(id) => {
          const bank = bankItems.find((b) => b.id === id);
          setBankCode(id);
          setBankName(bank?.label ?? '');
          setAccountName('');
        }}
        onClose={() => setPicker(null)}
      />
      <WalletPickerSheet
        visible={picker === 'provider'}
        title="Select Provider"
        items={billers.map((b) => ({ id: b.id, label: b.name }))}
        selectedId={provider}
        onSelect={(id) => {
          const item = billers.find((b) => b.id === id);
          setProvider(id);
          setProviderName(item?.name ?? '');
        }}
        onClose={() => setPicker(null)}
      />
      <WalletPickerSheet
        visible={picker === 'airtime-beneficiary'}
        title="Beneficiary"
        items={beneficiaries
          .filter((b) => b.scope === 'airtime')
          .map((b) => ({
            id: b.id,
            label: b.accountName,
            meta: `${b.bankName} · ${b.accountNumber}`,
          }))}
        selectedId=""
        onSelect={(id) => {
          const item = beneficiaries.find((b) => b.id === id);
          if (item) {
            setPhone(item.accountNumber);
            setProvider(item.bankName);
          }
        }}
        onClose={() => setPicker(null)}
      />
      <WalletPickerSheet
        visible={picker === 'plan'}
        title="Data plan"
        items={plans.map((p) => ({
          id: p.productId,
          label: p.name,
          meta: `₦${Number(p.amount).toLocaleString()}`,
        }))}
        selectedId={productId}
        onSelect={(id) => {
          const plan = plans.find((p) => p.productId === id);
          setProductId(id);
          if (plan) setAmount(String(plan.amount));
        }}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
}

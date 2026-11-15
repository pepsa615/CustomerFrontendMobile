import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, PasswordInput } from '@/components/ui/input';
import { Alert, Switch, Tabs } from '@/components/ui/controls';
import { useSession } from '@/providers/session-provider';
import {
  walletApi,
  type Bank,
  type Beneficiary,
  type WalletTransaction,
} from './api';

type Kind = 'transfer' | 'airtime' | 'data' | 'electricity' | 'cable-tv';
const titles: Record<Kind, string> = {
  transfer: 'Transfer',
  airtime: 'Mobile Top-Up',
  data: 'Buy Data',
  electricity: 'Electricity',
  'cable-tv': 'Cable TV',
};

export function PaymentScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const kind = (params.type ?? 'transfer') as Kind;
  const { accessToken } = useSession();
  const [scope, setScope] = useState('internal');
  const [account, setAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('PEPSA');
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankSearch, setBankSearch] = useState('');
  const [choosingBank, setChoosingBank] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [nin, setNin] = useState('');
  const [needsNin, setNeedsNin] = useState(false);
  const [save, setSave] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [plans, setPlans] = useState<
    { productId: string; name: string; amount: number }[]
  >([]);
  const [productId, setProductId] = useState('');
  const [validationReference, setValidationReference] = useState('');
  const transfer = kind === 'transfer';
  const bill = kind === 'electricity' || kind === 'cable-tv';
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
      !['airtime', 'data'].includes(kind) ||
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
  }, [accessToken, kind, phone]);
  useEffect(() => {
    if (accessToken && transfer)
      void walletApi
        .beneficiaries(accessToken)
        .then(setBeneficiaries)
        .catch(() => setBeneficiaries([]));
  }, [accessToken, transfer]);
  useEffect(() => {
    if (!accessToken || !transfer || scope !== 'external') return;
    void walletApi
      .banks(accessToken)
      .then(setBanks)
      .catch(() => setError('Could not load the bank list. Please retry.'));
  }, [accessToken, transfer, scope]);
  useEffect(() => {
    if (!accessToken || kind !== 'data' || phone.length !== 11) return;
    void walletApi
      .plans(accessToken, phone)
      .then(setPlans)
      .catch(() => setPlans([]));
  }, [accessToken, kind, phone]);
  const validateBill = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const value = await walletApi.validateBiller(accessToken, {
        billerId: bankCode || provider,
        beneficiaryIdentifier: account,
        fields: { accountNumber: account },
      });
      setValidationReference(value.validationReference);
      setAccountName(value.customerName);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not validate customer');
    } finally {
      setLoading(false);
    }
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
          kind,
          {
            productProvider: provider || bankName,
            beneficiaryIdentifier: bill ? account : phone,
            amount: Number(amount),
            pin,
            ...(kind === 'data' ? { productId } : {}),
            ...(bill
              ? {
                  billerId: bankCode || provider,
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
        setError('Enter your NIN to continue this external transfer.');
      } else setError(api.message ?? 'Payment could not be completed');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Screen
      title={titles[kind]}
      description="Details are verified before your wallet is charged."
    >
      {transfer ? (
        <Tabs
          value={scope}
          onChange={(value) => {
            setScope(value);
            setAccountName('');
          }}
          items={[
            { value: 'internal', label: 'To PEPSA' },
            { value: 'external', label: 'Other bank' },
          ]}
        />
      ) : null}
      {transfer && beneficiaries.some((item) => item.scope === scope) ? (
        <View className="gap-2">
          <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
            Beneficiaries
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
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
                  className="rounded-xl border border-border-light bg-surface-light px-4 py-3 dark:border-border-dark dark:bg-surface-dark"
                >
                  <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
                    {item.accountName}
                  </Text>
                  <Text className="text-xs text-muted-light dark:text-muted-dark">
                    {item.bankName} · {item.accountNumber.slice(-4)}
                  </Text>
                </Pressable>
              ))}
          </ScrollView>
        </View>
      ) : null}
      <Card className="gap-4">
        {transfer && scope === 'external' ? (
          <View className="gap-2">
            <Text className="font-medium text-foreground-light dark:text-foreground-dark">
              Bank
            </Text>
            <Button
              variant="secondary"
              onPress={() => setChoosingBank(!choosingBank)}
            >
              {bankCode ? bankName : 'Select a bank'}
            </Button>
            {choosingBank ? (
              <View className="gap-2 rounded-xl border border-border-light p-3 dark:border-border-dark">
                <Input
                  accessibilityLabel="Search banks"
                  value={bankSearch}
                  onChangeText={setBankSearch}
                  placeholder="Search bank name"
                />
                <ScrollView className="max-h-64" nestedScrollEnabled>
                  {banks
                    .map((bank) => ({
                      code:
                        bank.attributes?.nipCode ?? bank.code ?? bank.id ?? '',
                      name: bank.attributes?.name ?? bank.name ?? '',
                    }))
                    .filter(
                      (bank) =>
                        bank.code &&
                        bank.name
                          .toLowerCase()
                          .includes(bankSearch.toLowerCase()),
                    )
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((bank) => (
                      <Pressable
                        key={`${bank.code}-${bank.name}`}
                        accessibilityRole="button"
                        onPress={() => {
                          setBankCode(bank.code);
                          setBankName(bank.name);
                          setAccountName('');
                          setChoosingBank(false);
                          setBankSearch('');
                        }}
                        className="border-b border-border-light py-3 dark:border-border-dark"
                      >
                        <Text className="font-medium text-foreground-light dark:text-foreground-dark">
                          {bank.name}
                        </Text>
                      </Pressable>
                    ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
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
              <Text className="font-semibold text-success-light dark:text-success-dark">
                {accountName}
              </Text>
            ) : account.length === 10 ? (
              <Text className="text-sm text-muted-light">
                Verifying account…
              </Text>
            ) : null}
          </>
        ) : null}
        {!transfer && !bill ? (
          <>
            <Input
              accessibilityLabel="Phone number"
              keyboardType="phone-pad"
              maxLength={11}
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
              placeholder="08012345678"
            />
            {provider ? (
              <Text className="font-semibold text-success-light dark:text-success-dark">
                Detected {provider.toUpperCase()}
              </Text>
            ) : null}
          </>
        ) : null}
        {kind === 'data' && plans.length ? (
          <View className="gap-2">
            <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
              Available plans
            </Text>
            {plans.map((plan) => (
              <Pressable
                key={plan.productId}
                onPress={() => {
                  setProductId(plan.productId);
                  setAmount(String(plan.amount));
                }}
                className={`rounded-xl border p-3 ${productId === plan.productId ? 'border-primary-light bg-primary-light/5' : 'border-border-light dark:border-border-dark'}`}
              >
                <Text className="font-semibold text-foreground-light dark:text-foreground-dark">
                  {plan.name}
                </Text>
                <Text className="text-primary-light">
                  ₦{Number(plan.amount).toLocaleString()}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {bill ? (
          <>
            <Input
              accessibilityLabel={
                kind === 'electricity'
                  ? 'Electricity provider'
                  : 'Cable provider'
              }
              value={provider}
              onChangeText={(value) => {
                setProvider(value);
                setValidationReference('');
              }}
            />
            <Input
              accessibilityLabel={
                kind === 'electricity' ? 'Meter number' : 'Smartcard number'
              }
              value={account}
              onChangeText={(value) => {
                setAccount(value);
                setValidationReference('');
              }}
            />
            {accountName ? (
              <Text className="font-semibold text-success-light dark:text-success-dark">
                {accountName}
              </Text>
            ) : null}
            <Button
              variant="secondary"
              loading={loading}
              onPress={() => void validateBill()}
            >
              Validate customer
            </Button>
          </>
        ) : null}
        <Input
          accessibilityLabel="Amount"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
        />
        {needsNin ? (
          <PasswordInput
            accessibilityLabel="National Identification Number"
            keyboardType="number-pad"
            maxLength={11}
            value={nin}
            onChangeText={(v) => setNin(v.replace(/\D/g, ''))}
          />
        ) : null}
        <PasswordInput
          accessibilityLabel="Transaction PIN"
          keyboardType="number-pad"
          maxLength={4}
          value={pin}
          onChangeText={(v) => setPin(v.replace(/\D/g, ''))}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/(app)/transaction-security')}
        >
          <Text className="font-semibold text-primary-light dark:text-primary-dark">
            Set up your transaction PIN
          </Text>
        </Pressable>
        {transfer ? (
          <Switch
            value={save}
            onValueChange={setSave}
            label="Save as beneficiary"
          />
        ) : null}
        {error ? <Alert tone="danger">{error}</Alert> : null}
        <Button
          loading={loading}
          disabled={
            !amount ||
            pin.length !== 4 ||
            (transfer && !accountName) ||
            (needsNin && nin.length !== 11) ||
            (kind === 'data' && !productId) ||
            (bill && !validationReference)
          }
          onPress={() => void submit()}
        >
          Pay
        </Button>
      </Card>
      <Pressable onPress={() => router.back()} accessibilityRole="button">
        <Text className="text-center font-semibold text-primary-light dark:text-primary-dark">
          Cancel
        </Text>
      </Pressable>
    </Screen>
  );
}

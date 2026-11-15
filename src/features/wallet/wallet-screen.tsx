import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/controls';
import { useSession } from '@/providers/session-provider';
import { walletApi, type WalletOverview, type WalletTransaction } from './api';

const actions = [
  { id: 'transfer', label: 'Transfer' },
  { id: 'data', label: 'Data' },
  { id: 'airtime', label: 'Airtime' },
  { id: 'electricity', label: 'Electric' },
  { id: 'cable-tv', label: 'Cable TV' },
];
const money = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
    Number(value),
  );
const pretty = (value: string) =>
  value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

export function WalletScreen() {
  const { accessToken } = useSession();
  const [wallet, setWallet] = useState<WalletOverview | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(true);
  const load = useCallback(
    async (refresh = false) => {
      if (!accessToken) return;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [w, tx] = await Promise.all([
          walletApi.overview(accessToken),
          walletApi.transactions(accessToken, search),
        ]);
        setWallet(w);
        setTransactions(tx.items);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load wallet');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, search],
  );
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    const timer = setTimeout(() => void load(), 350);
    return () => clearTimeout(timer);
  }, [search, load]);
  if (loading && !wallet)
    return (
      <Screen title="Wallet">
        <ActivityIndicator color="#9d0208" size="large" />
      </Screen>
    );
  return (
    <Screen title="Wallet" description="Fund, transfer and pay securely.">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
          />
        }
        contentContainerClassName="gap-5"
      >
        <View className="overflow-hidden rounded-3xl bg-primary-light dark:bg-primary-dark">
          <View className="p-6">
            <Text className="text-xs font-semibold uppercase tracking-widest text-white/70">
              PEPSA wallet
            </Text>
            <View className="mt-3 flex-row items-center justify-between">
              <Text className="text-3xl font-bold text-white">
                {visible ? money(wallet?.availableBalance ?? '0') : '••••••••'}
              </Text>
              <Pressable
                accessibilityLabel={visible ? 'Hide balance' : 'Show balance'}
                onPress={() => setVisible(!visible)}
              >
                <Text className="font-semibold text-white">
                  {visible ? 'Hide' : 'Show'}
                </Text>
              </Pressable>
            </View>
            <Text className="mt-1 text-sm text-white/70">
              {wallet?.status ?? 'PENDING'}
            </Text>
          </View>
          {wallet?.fundingAccount ? (
            <View className="gap-2 bg-black/15 p-6">
              <Text className="text-xs uppercase text-white/60">
                Fund wallet by bank transfer
              </Text>
              <Text className="font-semibold text-white">
                {wallet.fundingAccount.accountName}
              </Text>
              <Text className="text-white">
                {wallet.fundingAccount.bankName}
              </Text>
              <Pressable
                onPress={() =>
                  void Clipboard.setStringAsync(
                    wallet.fundingAccount!.accountNumber,
                  )
                }
              >
                <Text className="text-xl font-bold text-white">
                  {wallet.fundingAccount.accountNumber} · Copy
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {actions.map((action) => (
            <Pressable
              key={action.id}
              className="w-[31%] items-center rounded-2xl border border-border-light bg-surface-light p-3 dark:border-border-dark dark:bg-surface-dark"
              onPress={() =>
                router.push({
                  pathname: '/(app)/wallet/payment',
                  params: { type: action.id },
                })
              }
            >
              <View className="mb-2 size-10 items-center justify-center rounded-xl bg-primary-light/10">
                <Text className="text-lg font-bold text-primary-light">
                  {action.label[0]}
                </Text>
              </View>
              <Text className="text-xs font-semibold text-foreground-light dark:text-foreground-dark">
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Card>
          <Text className="mb-3 text-xl font-bold text-foreground-light dark:text-foreground-dark">
            Recent transactions
          </Text>
          <Input
            accessibilityLabel="Search transactions"
            placeholder="Name or reference"
            value={search}
            onChangeText={setSearch}
          />
          {transactions.length ? (
            <View className="mt-4">
              {transactions.map((tx) => (
                <Pressable
                  key={tx.id}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/wallet/receipt',
                      params: { id: tx.id },
                    })
                  }
                  className="flex-row items-center justify-between border-b border-border-light py-4 dark:border-border-dark"
                >
                  <View className="max-w-[65%]">
                    <Text
                      className="font-semibold text-foreground-light dark:text-foreground-dark"
                      numberOfLines={1}
                    >
                      {tx.counterpartyName ?? pretty(tx.type)}
                    </Text>
                    <Text className="text-xs text-muted-light dark:text-muted-dark">
                      {new Date(tx.createdAt).toLocaleDateString()} ·{' '}
                      {pretty(tx.status)}
                    </Text>
                  </View>
                  <Text className="font-bold text-foreground-light dark:text-foreground-dark">
                    {money(tx.amount)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text className="mt-5 text-center text-muted-light dark:text-muted-dark">
              No transactions yet
            </Text>
          )}
        </Card>
        <Button variant="secondary" onPress={() => void load(true)}>
          Refresh wallet
        </Button>
      </ScrollView>
    </Screen>
  );
}

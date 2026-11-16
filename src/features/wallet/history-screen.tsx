import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/controls';
import { useSession } from '@/providers/session-provider';
import { walletApi, type WalletTransaction } from './api';

const money = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
    Number(value),
  );

const pretty = (value: string) =>
  value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

function statusClass(status: string) {
  const s = status.toUpperCase();
  if (s === 'SUCCESSFUL') return 'text-emerald-500';
  if (s === 'REVERSED') return 'text-amber-500';
  return 'text-muted-light dark:text-muted-dark';
}

export function WalletHistoryScreen() {
  const { accessToken } = useSession();
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'list' | 'filter'>('list');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [statementLoading, setStatementLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      setLoading(true);
      void walletApi
        .transactions(accessToken)
        .then((res) => setItems(res.items))
        .finally(() => setLoading(false));
    }, [accessToken]),
  );

  const emailStatement = async () => {
    if (!accessToken || !start || !end) return;
    setStatementLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await walletApi.emailStatement(accessToken, {
        from: new Date(start).toISOString(),
        to: new Date(end).toISOString(),
      });
      setMessage(`Statement emailed (${result.count} transactions).`);
      setMode('list');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not email statement');
    } finally {
      setStatementLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark"
      contentContainerClassName="gap-4 px-5 pb-10 pt-14"
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          className="size-11 items-center justify-center rounded-full bg-primary-light/10 dark:bg-primary-dark/20"
        >
          <Text className="text-xl font-bold text-primary-light dark:text-primary-dark">
            ‹
          </Text>
        </Pressable>
        <Text className="flex-1 text-xl font-bold text-foreground-light dark:text-foreground-dark">
          {mode === 'filter' ? 'Transaction History' : 'History'}
        </Text>
        {mode === 'list' ? (
          <Pressable onPress={() => setMode('filter')}>
            <Text className="text-sm font-semibold text-primary-light dark:text-primary-dark">
              Filter
            </Text>
          </Pressable>
        ) : null}
      </View>
      {mode === 'filter' ? (
        <View className="gap-4">
          <Input
            accessibilityLabel="Start date"
            value={start}
            onChangeText={setStart}
            placeholder="YYYY-MM-DD start"
          />
          <Input
            accessibilityLabel="End date"
            value={end}
            onChangeText={setEnd}
            placeholder="YYYY-MM-DD end"
          />
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {message ? <Alert tone="info">{message}</Alert> : null}
          <Button
            className="h-12 rounded-2xl"
            disabled={!start || !end}
            onPress={() => setMode('list')}
          >
            Search
          </Button>
          <Button
            variant="secondary"
            loading={statementLoading}
            disabled={!start || !end}
            className="h-12 rounded-2xl"
            onPress={() => void emailStatement()}
          >
            Email Statement
          </Button>
        </View>
      ) : loading ? (
        <ActivityIndicator color="#9d0208" />
      ) : items.length ? (
        items.map((tx) => (
          <Pressable
            key={tx.id}
            onPress={() =>
              router.push({
                pathname: '/(app)/wallet/receipt',
                params: { id: tx.id },
              })
            }
            className="flex-row items-start justify-between border-b border-border-light py-4 dark:border-border-dark"
          >
            <View className="max-w-[68%]">
              <Text className="font-medium text-muted-light dark:text-muted-dark">
                {tx.counterpartyName ?? pretty(tx.type)}
              </Text>
              <Text className="mt-1 text-xs text-muted-light dark:text-muted-dark">
                {new Date(tx.createdAt).toLocaleString()}
              </Text>
            </View>
            <View className="items-end">
              <Text className="font-bold text-foreground-light dark:text-foreground-dark">
                {money(tx.amount).replace('₦', '').trim()}
              </Text>
              <Text className={`text-xs capitalize ${statusClass(tx.status)}`}>
                {tx.status.toLowerCase()}
              </Text>
            </View>
          </Pressable>
        ))
      ) : (
        <Text className="mt-20 text-center text-muted-light dark:text-muted-dark">
          No transaction records found
        </Text>
      )}
    </ScrollView>
  );
}

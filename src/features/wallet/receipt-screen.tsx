import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
export function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accessToken } = useSession();
  const [tx, setTx] = useState<WalletTransaction | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!id || !accessToken) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      try {
        const value = await walletApi.detail(accessToken, id);
        setTx(value);
        if (['QUEUED', 'PROCESSING', 'REVERSAL_PENDING'].includes(value.status))
          timer = setTimeout(() => void load(), 2500);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load receipt');
      }
    };
    void load();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [id, accessToken]);
  const html = tx
    ? `<html><body style="font-family:Arial;padding:40px"><h1 style="color:#9d0208">PEPSA</h1><h2>Transaction receipt</h2><p style="font-size:30px;font-weight:bold">${money(tx.amount)}</p><p>${pretty(tx.status)}</p><hr/><p>Type: ${pretty(tx.type)}</p><p>Reference: ${tx.reference}</p><p>Recipient: ${tx.counterpartyName ?? '-'}</p><p>Date: ${new Date(tx.createdAt).toLocaleString()}</p></body></html>`
    : '';
  const sharePdf = async () => {
    if (!tx) return;
    setBusy(true);
    try {
      const file = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share PEPSA receipt',
        });
    } finally {
      setBusy(false);
    }
  };
  if (!tx && !error)
    return (
      <Screen title="Receipt">
        <ActivityIndicator color="#9d0208" size="large" />
      </Screen>
    );
  return (
    <Screen
      title="Receipt"
      description="Transaction details confirmed by PEPSA."
    >
      {error ? (
        <Alert tone="danger">{error}</Alert>
      ) : tx ? (
        <>
          <Card className="items-center gap-2 bg-primary-light/5">
            <Text className="text-sm text-muted-light dark:text-muted-dark">
              {pretty(tx.type)}
            </Text>
            <Text className="text-4xl font-bold text-foreground-light dark:text-foreground-dark">
              {money(tx.amount)}
            </Text>
            <Text className="font-semibold text-success-light dark:text-success-dark">
              {pretty(tx.status)}
            </Text>
          </Card>
          <Card className="gap-4">
            <View>
              <Text className="text-xs text-muted-light">Reference</Text>
              <Text
                selectable
                className="font-semibold text-foreground-light dark:text-foreground-dark"
              >
                {tx.reference}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-muted-light">Recipient</Text>
              <Text className="text-foreground-light dark:text-foreground-dark">
                {tx.counterpartyName ?? '-'}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-muted-light">Date</Text>
              <Text className="text-foreground-light dark:text-foreground-dark">
                {new Date(tx.createdAt).toLocaleString()}
              </Text>
            </View>
          </Card>
          <Button
            variant="secondary"
            onPress={() => void Clipboard.setStringAsync(tx.reference)}
          >
            Copy reference
          </Button>
          <Button loading={busy} onPress={() => void sharePdf()}>
            Share PDF receipt
          </Button>
          <Button
            variant="ghost"
            onPress={() => router.replace('/(app)/(tabs)/wallet')}
          >
            Back to wallet
          </Button>
        </>
      ) : null}
    </Screen>
  );
}

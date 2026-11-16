import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { useSession } from '@/providers/session-provider';
import { walletApi, type WalletOverview } from './api';

const money = (value: string) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(
    Number(value),
  );

export function WalletDepositScreen() {
  const { accessToken } = useSession();
  const [wallet, setWallet] = useState<WalletOverview | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    void walletApi.overview(accessToken).then(setWallet);
  }, [accessToken]);

  const funding = wallet?.fundingAccount;

  return (
    <ScrollView
      className="flex-1 bg-background-light dark:bg-background-dark"
      contentContainerClassName="gap-5 px-5 pb-10 pt-14"
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
        <Text className="text-xl font-bold text-foreground-light dark:text-foreground-dark">
          Fund Wallet
        </Text>
      </View>
      <View className="rounded-2xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark">
        <Text className="text-lg font-bold text-primary-light dark:text-primary-dark">
          Deposit
        </Text>
        <Text className="text-sm text-muted-light dark:text-muted-dark">
          Add money via bank deposit
        </Text>
        {funding ? (
          <View className="mt-5 gap-2">
            <Text className="text-lg font-bold text-foreground-light dark:text-foreground-dark">
              {funding.accountName}
            </Text>
            <Text className="text-muted-light dark:text-muted-dark">
              {funding.bankName}
            </Text>
            <Text className="text-2xl font-bold text-foreground-light dark:text-foreground-dark">
              {funding.accountNumber}
            </Text>
            <Pressable
              className="mt-2 rounded-xl border border-primary-light px-4 py-3 dark:border-primary-dark"
              onPress={() =>
                void Clipboard.setStringAsync(funding.accountNumber)
              }
            >
              <Text className="text-center text-sm font-semibold text-primary-light dark:text-primary-dark">
                Copy Number
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text className="mt-5 text-muted-light dark:text-muted-dark">
            Funding account is still provisioning.
          </Text>
        )}
      </View>
      <Text className="text-sm text-muted-light dark:text-muted-dark">
        Available balance: {money(wallet?.availableBalance ?? '0')}
      </Text>
    </ScrollView>
  );
}

import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { useSession } from '@/providers/session-provider';
import { money, ordersApi, type Order } from './api';
export function OrdersScreen() {
  const { accessToken } = useSession();
  const [orders, setOrders] = useState<Order[]>();
  const [error, setError] = useState('');
  const load = useCallback(() => {
    if (!accessToken) return;
    setError('');
    ordersApi
      .list(accessToken)
      .then(setOrders)
      .catch((e) =>
        setError(e instanceof Error ? e.message : 'Orders unavailable'),
      );
  }, [accessToken]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  return (
    <Screen
      title="Orders"
      description="Quote, place and track deliveries."
      action={
        <Link href="/(app)/orders/new" asChild>
          <Button>New order</Button>
        </Link>
      }
    >
      {!orders && !error ? (
        <LoadingState label="Loading orders" />
      ) : error ? (
        <ErrorState
          title="Orders unavailable"
          description={error}
          actionLabel="Try again"
          onAction={load}
        />
      ) : orders?.length ? (
        <View className="gap-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={{
                pathname: '/(app)/orders/[id]',
                params: { id: order.id },
              }}
              asChild
            >
              <Pressable accessibilityRole="button">
                <Card>
                  <View className="flex-row justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-bold text-foreground-light dark:text-foreground-dark">
                        Order #{order.id}
                      </Text>
                      <Text className="text-sm text-muted-light dark:text-muted-dark">
                        {order.delivery.address}
                      </Text>
                    </View>
                    <View>
                      <Text className="font-semibold text-primary-light dark:text-primary-dark">
                        {money(order.amount)}
                      </Text>
                      <Text className="text-right text-xs text-muted-light dark:text-muted-dark">
                        {order.status.replaceAll('_', ' ')}
                      </Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No orders yet"
          description="Create a quote to start your first delivery."
        />
      )}
    </Screen>
  );
}

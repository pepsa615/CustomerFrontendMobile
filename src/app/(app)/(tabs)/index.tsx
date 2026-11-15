import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/state';
import { Button } from '@/components/ui/button';
import { useSession } from '@/providers/session-provider';
import { money, ordersApi, type Order } from '@/features/orders/api';
export default function HomeScreen() {
  const { accessToken } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (accessToken)
        ordersApi
          .list(accessToken)
          .then((value) => setOrders(value.slice(0, 5)))
          .catch(() => undefined);
    }, [accessToken]),
  );
  return (
    <Screen
      title="Good day"
      description="Your delivery operations at a glance."
      action={
        <Link href="/(app)/orders/new" asChild>
          <Button>New order</Button>
        </Link>
      }
    >
      <Card>
        <Text className="text-sm text-muted-light dark:text-muted-dark">
          Active orders
        </Text>
        <Text className="mt-2 text-3xl font-bold text-foreground-light dark:text-foreground-dark">
          {
            orders.filter(
              (order) =>
                !['DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(
                  order.status,
                ),
            ).length
          }
        </Text>
      </Card>
      <View className="flex-row gap-3">
        <Link href="/(app)/business" asChild>
          <Button variant="secondary">Business</Button>
        </Link>
        <Link href="/(app)/delivery-links" asChild>
          <Button variant="secondary">Delivery links</Button>
        </Link>
      </View>
      {orders.length ? (
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
              <Pressable>
                <Card>
                  <View className="flex-row justify-between">
                    <View>
                      <Text className="font-bold text-foreground-light dark:text-foreground-dark">
                        Order #{order.id}
                      </Text>
                      <Text className="text-sm text-muted-light dark:text-muted-dark">
                        {order.status.replaceAll('_', ' ')}
                      </Text>
                    </View>
                    <Text className="font-semibold text-primary-light dark:text-primary-dark">
                      {money(order.amount)}
                    </Text>
                  </View>
                </Card>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : (
        <EmptyState
          title="No recent orders"
          description="Quotes and deliveries will appear here."
        />
      )}
    </Screen>
  );
}

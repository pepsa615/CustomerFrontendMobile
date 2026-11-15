import { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { Button } from '@/components/ui/button';
import { secureSession } from '@/storage/secure-session';

const slides = [
  {
    key: 'sell-deliver',
    image: require('../../../assets/images/onboarding/sell-deliver.png'),
    title: 'You sell, We deliver',
    description: 'Sell with confidence while PEPSA handles delivery.',
  },
  {
    key: 'fast-delivery',
    image: require('../../../assets/images/onboarding/fast-delivery.png'),
    title: 'Enjoy fast and reliable delivery services.',
    description:
      'Request delivery for your purchases, and send items with ease.',
  },
  {
    key: 'secure-wallet',
    image: require('../../../assets/images/onboarding/secure-wallet.png'),
    title: 'Secured wallet, money-back guarantee for transactions',
    description: 'Shop with confidence—your transactions are protected.',
  },
  {
    key: 'easy-payments',
    image: require('../../../assets/images/onboarding/easy-payments.png'),
    title: 'Buy airtime, data and pay bills effortlessly',
    description: 'Quick, seamless, and stress-free payments, all in one app.',
  },
] as const;

export default function IntroScreen() {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<(typeof slides)[number]>>(null);
  const [index, setIndex] = useState(0);

  function onScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  async function finish(destination: '/(auth)/sign-up' | '/(auth)/login') {
    await secureSession.markIntroComplete();
    router.replace(destination);
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, itemIndex) => ({
          length: width,
          offset: width * itemIndex,
          index: itemIndex,
        })}
        renderItem={({ item }) => (
          <View style={{ width }} className="items-center px-6 pt-12">
            <View className="h-[44%] w-full items-center justify-center">
              <Image
                source={item.image}
                className="h-full w-full"
                resizeMode="contain"
                accessibilityLabel=""
              />
            </View>
            <Text className="mt-5 max-w-sm text-center text-[25px] font-semibold leading-8 text-[#B00008]">
              {item.title}
            </Text>
            <Text className="mt-3 max-w-xs text-center text-base leading-6 text-[#8B8B8B]">
              {item.description}
            </Text>
          </View>
        )}
      />

      <View className="px-6 pb-3">
        <View
          accessibilityRole="adjustable"
          accessibilityLabel={`Onboarding page ${index + 1} of ${slides.length}`}
          className="mb-8 flex-row justify-center gap-1.5"
        >
          {slides.map((slide, dotIndex) => (
            <Pressable
              key={slide.key}
              accessibilityRole="button"
              accessibilityLabel={`Show onboarding page ${dotIndex + 1}`}
              onPress={() =>
                listRef.current?.scrollToIndex({
                  index: dotIndex,
                  animated: true,
                })
              }
              className={`h-2 rounded-full border border-[#FFCDD0] ${dotIndex === index ? 'w-6 border-[#B00008] bg-white' : 'w-3 bg-white'}`}
            />
          ))}
        </View>
        <Button onPress={() => void finish('/(auth)/sign-up')}>
          Get started
        </Button>
        <Pressable
          accessibilityRole="button"
          onPress={() => void finish('/(auth)/login')}
          className="min-h-12 items-center justify-center"
        >
          <Text className="text-base font-semibold text-[#171717]">
            Continue as Guest
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

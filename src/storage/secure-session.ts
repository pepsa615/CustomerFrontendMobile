import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'pepsa.refresh-token';
const BIOMETRIC_KEY = 'pepsa.biometric-enabled';
const INTRO_COMPLETE_KEY = 'pepsa.intro-complete';

export const secureSession = {
  readRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  writeRefreshToken: (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  }),
  clear: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  clearAll: () => Promise.all([SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY), SecureStore.deleteItemAsync(BIOMETRIC_KEY)]).then(() => undefined),
  readBiometricEnabled: async () => (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === 'true',
  setBiometricEnabled: (enabled: boolean) => SecureStore.setItemAsync(BIOMETRIC_KEY, String(enabled)),
  readIntroComplete: async () =>
    (await SecureStore.getItemAsync(INTRO_COMPLETE_KEY)) === 'true',
  markIntroComplete: () =>
    SecureStore.setItemAsync(INTRO_COMPLETE_KEY, 'true', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
};

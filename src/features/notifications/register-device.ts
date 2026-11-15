export type PushRegistration = { token: string; platform: 'ios' | 'android' };

export async function registerDeviceForPush(): Promise<PushRegistration | null> {
  // M1/M2 will request permission and send the Expo/native token to the API.
  return null;
}

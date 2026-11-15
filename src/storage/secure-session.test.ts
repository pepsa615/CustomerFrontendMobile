import * as SecureStore from 'expo-secure-store';
import { secureSession } from './secure-session';

jest.mock('expo-secure-store', () => ({ WHEN_UNLOCKED_THIS_DEVICE_ONLY:'device-only', getItemAsync:jest.fn(), setItemAsync:jest.fn(), deleteItemAsync:jest.fn() }));

describe('secureSession', () => {
  beforeEach(()=>jest.clearAllMocks());
  it('stores refresh credentials as device-only', async () => {
    await secureSession.writeRefreshToken('opaque');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('pepsa.refresh-token','opaque',{keychainAccessible:'device-only'});
  });
  it('clears refresh and biometric state on account closure', async () => {
    await secureSession.clearAll();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('pepsa.refresh-token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('pepsa.biometric-enabled');
  });
});

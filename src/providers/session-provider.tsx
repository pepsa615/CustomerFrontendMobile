import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { apiRequest } from '@/api/client';
import { secureSession } from '@/storage/secure-session';

export type IdentityUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  onboardingStatus: 'EMAIL_PENDING' | 'PROFILE_PENDING' | 'COMPLETE';
};
type SessionResponse = {
  accessToken: string;
  refreshToken: string;
  user?: IdentityUser;
};
type SessionContextValue = {
  accessToken: string | null;
  user: IdentityUser | null;
  isRestoring: boolean;
  login: (identifier: string, password: string) => Promise<IdentityUser>;
  acceptSession: (data: SessionResponse) => Promise<void>;
  logout: () => Promise<void>;
  unlockWithBiometrics: () => Promise<boolean>;
  setBiometricsEnabled: (enabled: boolean) => Promise<void>;
};
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<IdentityUser | null>(null);
  const [isRestoring, setRestoring] = useState(true);
  const acceptSession = useCallback(async (data: SessionResponse) => {
    await secureSession.writeRefreshToken(data.refreshToken);
    setAccessToken(data.accessToken);
    if (data.user) setUser(data.user);
  }, []);
  const restore = useCallback(
    async (requireBiometric: boolean) => {
      const refreshToken = await secureSession.readRefreshToken();
      if (!refreshToken) return false;
      if (requireBiometric) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Unlock PEPSA',
          fallbackLabel: 'Use password',
          cancelLabel: 'Use password',
        });
        if (!result.success) return false;
      }
      const tokens = await apiRequest<{
        accessToken: string;
        refreshToken: string;
      }>('/auth/refresh-token', undefined, {
        method: 'POST',
        body: JSON.stringify({ refreshToken, sessionTransport: 'token' }),
      });
      await acceptSession(tokens);
      setUser(await apiRequest<IdentityUser>('/auth/me', tokens.accessToken));
      return true;
    },
    [acceptSession],
  );
  useEffect(() => {
    secureSession
      .readBiometricEnabled()
      .then((enabled) => restore(enabled))
      .catch(() => secureSession.clear())
      .finally(() => setRestoring(false));
  }, [restore]);
  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await apiRequest<SessionResponse>('/auth/login', undefined, {
        method: 'POST',
        body: JSON.stringify({
          identifier,
          password,
          sessionTransport: 'token',
          platform: 'ios',
          deviceName: 'PEPSA mobile app',
        }),
      });
      await acceptSession(data);
      return data.user!;
    },
    [acceptSession],
  );
  const logout = useCallback(async () => {
    const refreshToken = await secureSession.readRefreshToken();
    if (refreshToken)
      await apiRequest('/auth/logout', undefined, {
        method: 'POST',
        body: JSON.stringify({ refreshToken, sessionTransport: 'token' }),
      }).catch(() => undefined);
    await secureSession.clear();
    setAccessToken(null);
    setUser(null);
  }, []);
  const unlockWithBiometrics = useCallback(() => restore(true), [restore]);
  const setBiometricsEnabled = useCallback(
    (enabled: boolean) => secureSession.setBiometricEnabled(enabled),
    [],
  );
  const value = useMemo(
    () => ({
      accessToken,
      user,
      isRestoring,
      login,
      acceptSession,
      logout,
      unlockWithBiometrics,
      setBiometricsEnabled,
    }),
    [
      accessToken,
      user,
      isRestoring,
      login,
      acceptSession,
      logout,
      unlockWithBiometrics,
      setBiometricsEnabled,
    ],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}

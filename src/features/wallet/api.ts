import { apiRequest } from '@/api/client';

export type WalletOverview = {
  id: string;
  currency: string;
  availableBalance: string;
  ledgerBalance: string;
  status: string;
  hasNin: boolean;
  maskedNin: string | null;
  fundingAccount: {
    accountNumber: string;
    accountName: string;
    bankName: string;
  } | null;
};
export type WalletTransaction = {
  id: string;
  reference: string;
  type: string;
  status: string;
  amount: string;
  fee: string;
  currency: string;
  counterpartyName: string | null;
  counterpartyAccountMasked: string | null;
  provider: string | null;
  narration: string | null;
  createdAt: string;
  completedAt: string | null;
};
export type Beneficiary = {
  id: string;
  scope: string;
  accountNumber: string;
  bankCode: string | null;
  bankName: string;
  accountName: string;
};
export type Bank = {
  id?: string;
  code?: string;
  name?: string;
  attributes?: { nipCode?: string; name?: string };
};
export type TransactionReadiness = {
  kycComplete: boolean;
  phoneVerified: boolean;
  pinSet: boolean;
  transactionReady: boolean;
};
export const walletApi = {
  overview: (token: string) => apiRequest<WalletOverview>('/wallet', token),
  readiness: (token: string) =>
    apiRequest<TransactionReadiness>('/account/transaction-readiness', token),
  transactions: (token: string, search = '') =>
    apiRequest<{ items: WalletTransaction[]; nextCursor: string | null }>(
      `/wallet/transactions?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`,
      token,
    ),
  detail: (token: string, id: string) =>
    apiRequest<WalletTransaction>(`/wallet/transactions/${id}`, token),
  beneficiaries: (token: string) =>
    apiRequest<Beneficiary[]>('/wallet/beneficiaries', token),
  banks: (token: string) => apiRequest<Bank[]>('/wallet/banks', token),
  resolve: (token: string, body: unknown) =>
    apiRequest<{
      accountNumber: string;
      accountName: string;
      bankCode: string;
      bankName: string;
    }>('/wallet/accounts/resolve', token, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  saveNin: (token: string, nin: string) =>
    apiRequest('/wallet/nin', token, {
      method: 'POST',
      body: JSON.stringify({ nin }),
    }),
  transfer: (token: string, scope: string, body: unknown, key: string) =>
    apiRequest<WalletTransaction>(`/wallet/transfers/${scope}`, token, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify(body),
    }),
  detectNetwork: (token: string, phone: string) =>
    apiRequest<{ network: string }>(
      `/vas/networks/detect?phoneNumber=${encodeURIComponent(phone)}`,
      token,
    ),
  plans: (token: string, phone: string) =>
    apiRequest<{ productId: string; name: string; amount: number }[]>(
      `/vas/data-plans?phoneNumber=${encodeURIComponent(phone)}`,
      token,
    ),
  validateBiller: (token: string, body: unknown) =>
    apiRequest<{ validationReference: string; customerName: string }>(
      '/vas/billers/validate',
      token,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  purchase: (token: string, path: string, body: unknown, key: string) =>
    apiRequest<WalletTransaction>(`/vas/${path}`, token, {
      method: 'POST',
      headers: { 'Idempotency-Key': key },
      body: JSON.stringify(body),
    }),
};

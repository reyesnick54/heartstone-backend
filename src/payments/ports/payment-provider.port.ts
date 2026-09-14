export const PAYMENT_PROVIDER_PORT = Symbol('PAYMENT_PROVIDER_PORT');

export interface PaymentProviderRefundInput {
  originalProviderReference: string;
  amountCents: number;
  currency: string;
  reason: string;
}

export interface PaymentProviderRefundResult {
  success: boolean;
  providerReference?: string;
  errorMessage?: string;
}

export interface PaymentProviderPort {
  readonly providerName: string;
  readonly supportsRefunds: boolean;

  refund(input: PaymentProviderRefundInput): Promise<PaymentProviderRefundResult>;
}

export const NOTIFICATION_PROVIDER_PORT = Symbol('NOTIFICATION_PROVIDER_PORT');

export interface NotificationSendInput {
  deliveryId: string;
  attemptId: string;
  messageId: string;
  channel: string;
  destinationReference?: string;
  subject: string;
  bodyReference: string;
  classification: string;
}

export interface NotificationSendResult {
  providerReference: string;
  queued: boolean;
}

export interface NotificationDeliveryStatusResult {
  status: string;
  providerReference?: string;
  deliveredAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

export interface NotificationCallbackValidationResult {
  valid: boolean;
  idempotencyKey?: string;
  deliveryId?: string;
  attemptId?: string;
  eventType?: 'DELIVERED' | 'FAILED' | 'BOUNCED' | 'REJECTED' | 'RECEIPT';
}

export interface NotificationProviderPort {
  readonly providerType: string;
  readonly supportedChannels: readonly string[];
  send(input: NotificationSendInput): Promise<NotificationSendResult>;
  getDeliveryStatus(providerReference: string): Promise<NotificationDeliveryStatusResult>;
  validateCallback(payload: Record<string, unknown>): NotificationCallbackValidationResult;
}

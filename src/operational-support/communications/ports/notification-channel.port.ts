import { type CommunicationChannelType } from '@prisma/client';

export const NOTIFICATION_CHANNEL_PORT = Symbol('NOTIFICATION_CHANNEL_PORT');

export interface NotificationChannelDispatchInput {
  deliveryId: string;
  attemptId: string;
  messageId: string;
  channel: CommunicationChannelType;
  destinationReference: string;
  subject: string;
  body: string;
  mandatoryDelivery: boolean;
}

export interface NotificationChannelDispatchResult {
  providerReference: string;
  queued: boolean;
}

export interface NotificationChannelPort {
  readonly channel: CommunicationChannelType;
  /** When false, production startup must fail if this adapter is bound for outbound delivery. */
  readonly isProductionAdapter: boolean;
  readonly operationalReadinessState: 'READY' | 'BLOCKED' | 'TEST_ONLY';
  dispatch(input: NotificationChannelDispatchInput): Promise<NotificationChannelDispatchResult>;
}

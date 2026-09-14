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
  dispatch(input: NotificationChannelDispatchInput): Promise<NotificationChannelDispatchResult>;
}

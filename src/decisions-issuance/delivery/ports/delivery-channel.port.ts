import {
  type InstrumentDeliveryChannel,
  type InstrumentDeliveryClassification,
} from '@prisma/client';

export const DELIVERY_CHANNEL_PORT = Symbol('DELIVERY_CHANNEL_PORT');

export interface DeliveryChannelDispatchInput {
  deliveryId: string;
  attemptId: string;
  officialInstrumentId: string;
  instrumentVersionId: string;
  channel: InstrumentDeliveryChannel;
  destinationReference?: string;
  classification: InstrumentDeliveryClassification;
}

export interface DeliveryChannelDispatchResult {
  providerReference: string;
  queued: boolean;
}

export interface DeliveryChannelPort {
  readonly channel: InstrumentDeliveryChannel;
  supportsClassification(classification: InstrumentDeliveryClassification): boolean;
  dispatch(input: DeliveryChannelDispatchInput): Promise<DeliveryChannelDispatchResult>;
}

import { Injectable } from '@nestjs/common';
import { InstrumentDeliveryChannel, InstrumentDeliveryClassification } from '@prisma/client';

import {
  DeliveryChannelDispatchInput,
  DeliveryChannelDispatchResult,
  DeliveryChannelPort,
} from '../ports/delivery-channel.port';

@Injectable()
export class NoopDeliveryChannelAdapter implements DeliveryChannelPort {
  readonly channel = InstrumentDeliveryChannel.PORTAL;

  supportsClassification(classification: InstrumentDeliveryClassification): boolean {
    return classification !== InstrumentDeliveryClassification.SECRET;
  }

  dispatch(input: DeliveryChannelDispatchInput): Promise<DeliveryChannelDispatchResult> {
    return Promise.resolve({
      providerReference: `noop:${input.channel}:${input.attemptId}`,
      queued: true,
    });
  }
}

@Injectable()
export class ControlledDownloadDeliveryAdapter implements DeliveryChannelPort {
  readonly channel = InstrumentDeliveryChannel.CONTROLLED_DOWNLOAD;

  supportsClassification(classification: InstrumentDeliveryClassification): boolean {
    return (
      classification === InstrumentDeliveryClassification.PUBLIC ||
      classification === InstrumentDeliveryClassification.OFFICIAL
    );
  }

  dispatch(input: DeliveryChannelDispatchInput): Promise<DeliveryChannelDispatchResult> {
    return Promise.resolve({
      providerReference: `controlled-download:${input.instrumentVersionId}`,
      queued: true,
    });
  }
}

@Injectable()
export class PortalDeliveryAdapter implements DeliveryChannelPort {
  readonly channel = InstrumentDeliveryChannel.PORTAL;

  supportsClassification(classification: InstrumentDeliveryClassification): boolean {
    return classification !== InstrumentDeliveryClassification.SECRET;
  }

  dispatch(input: DeliveryChannelDispatchInput): Promise<DeliveryChannelDispatchResult> {
    return Promise.resolve({
      providerReference: `portal:${input.deliveryId}`,
      queued: true,
    });
  }
}

export const DELIVERY_CHANNEL_ADAPTERS = [
  NoopDeliveryChannelAdapter,
  ControlledDownloadDeliveryAdapter,
  PortalDeliveryAdapter,
] as const;

export type DeliveryChannelAdapter = DeliveryChannelPort;

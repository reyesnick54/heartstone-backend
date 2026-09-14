import { Injectable } from '@nestjs/common';
import { CommunicationChannelType } from '@prisma/client';

import {
  NotificationChannelDispatchInput,
  NotificationChannelDispatchResult,
  NotificationChannelPort,
} from '../ports/notification-channel.port';

@Injectable()
export class TestEmailAdapter implements NotificationChannelPort {
  readonly channel = CommunicationChannelType.EMAIL;

  dispatch(input: NotificationChannelDispatchInput): Promise<NotificationChannelDispatchResult> {
    return Promise.resolve({
      providerReference: `test-email:${input.destinationReference}:${input.attemptId}`,
      queued: true,
    });
  }
}

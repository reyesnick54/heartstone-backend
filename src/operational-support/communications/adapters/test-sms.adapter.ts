import { Injectable } from '@nestjs/common';
import { CommunicationChannelType } from '@prisma/client';

import {
  NotificationChannelDispatchInput,
  NotificationChannelDispatchResult,
  NotificationChannelPort,
} from '../ports/notification-channel.port';

@Injectable()
export class TestSmsAdapter implements NotificationChannelPort {
  readonly channel = CommunicationChannelType.SMS;

  dispatch(input: NotificationChannelDispatchInput): Promise<NotificationChannelDispatchResult> {
    return Promise.resolve({
      providerReference: `test-sms:${input.destinationReference}:${input.attemptId}`,
      queued: true,
    });
  }
}

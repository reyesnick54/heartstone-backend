import { Injectable } from '@nestjs/common';
import { Prisma, WorkflowDurableJobKind, WorkflowDurableJobStatus } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  OPERATIONAL_COMMUNICATION_MAX_DELIVERY_ATTEMPTS,
  OPERATIONAL_INTEGRATION_MAX_EXCHANGE_ATTEMPTS,
} from '../s19.constants';

@Injectable()
export class OperationalDurableRetryService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueueCommunicationDeliveryRetry(input: {
    deliveryId: string;
    attemptNumber: number;
    scheduledFor?: Date;
  }) {
    if (input.attemptNumber >= OPERATIONAL_COMMUNICATION_MAX_DELIVERY_ATTEMPTS) {
      return this.markDeadLetter('communication', input.deliveryId, input.attemptNumber);
    }

    const idempotencyKey = `comm-retry:${input.deliveryId}:${String(input.attemptNumber)}`;
    return this.enqueue(
      WorkflowDurableJobKind.OPERATIONAL_COMMUNICATION_DELIVERY_RETRY,
      idempotencyKey,
      {
        deliveryId: input.deliveryId,
        attemptNumber: input.attemptNumber,
      },
      input.scheduledFor,
    );
  }

  async enqueueIntegrationExchangeRetry(input: {
    integrationRequestId: string;
    attemptNumber: number;
    scheduledFor?: Date;
  }) {
    if (input.attemptNumber >= OPERATIONAL_INTEGRATION_MAX_EXCHANGE_ATTEMPTS) {
      return this.markDeadLetter('integration', input.integrationRequestId, input.attemptNumber);
    }

    const idempotencyKey = `integration-retry:${input.integrationRequestId}:${String(input.attemptNumber)}`;
    return this.enqueue(
      WorkflowDurableJobKind.OPERATIONAL_INTEGRATION_EXCHANGE_RETRY,
      idempotencyKey,
      {
        integrationRequestId: input.integrationRequestId,
        attemptNumber: input.attemptNumber,
      },
      input.scheduledFor,
    );
  }

  private async enqueue(
    jobKind: WorkflowDurableJobKind,
    idempotencyKey: string,
    payload: Record<string, unknown>,
    scheduledFor?: Date,
  ) {
    try {
      return await this.prisma.workflowDurableJob.create({
        data: {
          jobKind,
          idempotencyKey,
          payload: payload as Prisma.InputJsonValue,
          scheduledFor: scheduledFor ?? new Date(Date.now() + 60_000),
          status: WorkflowDurableJobStatus.PENDING,
        },
      });
    } catch {
      return this.prisma.workflowDurableJob.findUnique({ where: { idempotencyKey } });
    }
  }

  private async markDeadLetter(
    domain: 'communication' | 'integration',
    subjectId: string,
    attemptNumber: number,
  ) {
    return this.prisma.workflowDurableJob.create({
      data: {
        jobKind:
          domain === 'communication'
            ? WorkflowDurableJobKind.OPERATIONAL_COMMUNICATION_DELIVERY_RETRY
            : WorkflowDurableJobKind.OPERATIONAL_INTEGRATION_EXCHANGE_RETRY,
        idempotencyKey: `${domain}-dead:${subjectId}`,
        payload: {
          subjectId,
          attemptNumber,
          deadLetter: true,
        },
        scheduledFor: new Date(),
        status: WorkflowDurableJobStatus.DEAD,
      },
    });
  }
}

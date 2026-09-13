import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type CaseCommunication,
  CaseCommunicationDeliveryStatus,
  CaseCommunicationType,
  CaseEventPublicVisibility,
  CaseEventType,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { CaseCommunicationOutboxService } from './case-communication-outbox.service';
import { CaseEventService } from './case-event.service';
import { type CreateCaseCommunicationInput } from './case-timeline.types';

@Injectable()
export class CaseCommunicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseEventService: CaseEventService,
    private readonly outboxService: CaseCommunicationOutboxService,
  ) {}

  async create(input: CreateCaseCommunicationInput): Promise<CaseCommunication> {
    await this.assertCaseExists(input.caseId);

    const isInternal = input.communicationType === CaseCommunicationType.INTERNAL_NOTE;
    const publicVisibility = isInternal
      ? CaseEventPublicVisibility.INTERNAL
      : (input.publicVisibility ?? CaseEventPublicVisibility.APPLICANT_VISIBLE);

    const communication = await this.prisma.$transaction(async (tx) => {
      const created = await tx.caseCommunication.create({
        data: {
          caseId: input.caseId,
          communicationType: input.communicationType,
          senderIdentityId: input.senderIdentityId,
          senderOfficeholderId: input.senderOfficeholderId,
          recipientType: input.recipientType,
          recipientReference: input.recipientReference,
          channel: input.channel,
          subject: input.subject,
          body: input.body,
          templateReference: input.templateReference,
          templateVersion: input.templateVersion,
          sentAt: input.sentAt ?? new Date(),
          receivedAt: input.receivedAt,
          deliveryStatus: input.deliveryStatus ?? CaseCommunicationDeliveryStatus.QUEUED,
          classification: input.classification,
          publicVisibility,
        },
      });

      if (!isInternal) {
        const event = await this.caseEventService.append({
          caseId: input.caseId,
          eventType: this.mapCommunicationToEventType(input.communicationType),
          occurredAt: input.sentAt ?? new Date(),
          actorIdentityId: input.senderIdentityId,
          officeholderId: input.senderOfficeholderId,
          correlationId: created.id,
          metadata: {
            communicationId: created.id,
            channel: input.channel,
            subject: input.subject,
          },
          publicVisibility,
        });

        await tx.caseCommunication.update({
          where: { id: created.id },
          data: { caseEventId: event.id },
        });
      }

      return created;
    });

    if (
      !isInternal &&
      communication.deliveryStatus === CaseCommunicationDeliveryStatus.QUEUED &&
      communication.channel
    ) {
      await this.outboxService.enqueue(communication.id, communication.channel, {
        communicationId: communication.id,
        caseId: communication.caseId,
        channel: communication.channel,
      });
    }

    return communication;
  }

  async listOfficialCommunications(caseId: string): Promise<CaseCommunication[]> {
    await this.assertCaseExists(caseId);

    return this.prisma.caseCommunication.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listApplicantVisibleCommunications(caseId: string): Promise<CaseCommunication[]> {
    await this.assertCaseExists(caseId);

    return this.prisma.caseCommunication.findMany({
      where: {
        caseId,
        communicationType: { not: CaseCommunicationType.INTERNAL_NOTE },
        publicVisibility: CaseEventPublicVisibility.APPLICANT_VISIBLE,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private mapCommunicationToEventType(communicationType: CaseCommunicationType): CaseEventType {
    switch (communicationType) {
      case CaseCommunicationType.DEFICIENCY_NOTICE:
        return CaseEventType.DEFICIENCY_ISSUED;
      case CaseCommunicationType.REQUEST_FOR_INFORMATION:
        return CaseEventType.APPLICANT_RESPONSE_RECEIVED;
      case CaseCommunicationType.REFERRAL_NOTICE:
        return CaseEventType.REFERRED;
      case CaseCommunicationType.STATUS_UPDATE:
        return CaseEventType.STEP_COMPLETED;
      case CaseCommunicationType.APPLICANT_MESSAGE:
        return CaseEventType.APPLICANT_RESPONSE_RECEIVED;
      default:
        return CaseEventType.STEP_COMPLETED;
    }
  }

  private async assertCaseExists(caseId: string): Promise<void> {
    const exists = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}

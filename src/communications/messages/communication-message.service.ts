import { Injectable } from '@nestjs/common';
import {
  CommunicationAiDraftStatus,
  type CommunicationMessage,
  CommunicationMessageStatus,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { generateCommunicationMessageNumber } from '../common/communication-number.util';
import {
  CommunicationApprovalRequiredException,
  CommunicationMessageNotFoundException,
  CommunicationTemplateNotFoundException,
} from '../common/communications.exceptions';
import { CommunicationsBoundaryService } from '../common/communications-boundary.service';
import { validateTemplateFields } from '../common/template-sanitizer.util';

export interface PrepareCommunicationMessageInput {
  communicationType: string;
  sourceRecordType: string;
  sourceRecordId: string;
  masterAdministrativeFileId: string;
  caseId?: string;
  templateVersionId?: string;
  subject: string;
  classification: CommunicationMessage['classification'];
  senderInstitutionId: string;
  preparedByIdentityId: string;
  canonicalNoticeReference?: string;
  verifiedDataSnapshot?: Prisma.InputJsonValue;
  computedDataSnapshot?: Prisma.InputJsonValue;
  humanEnteredText?: Record<string, unknown>;
  mandatoryCategory?: CommunicationMessage['mandatoryCategory'];
  deliveryEffect?: CommunicationMessage['deliveryEffect'];
  aiDraftStatus?: CommunicationAiDraftStatus;
  duplicateBodyContent?: string;
}

export interface ApproveCommunicationMessageInput {
  messageId: string;
  approvedByIdentityId: string;
}

@Injectable()
export class CommunicationMessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CommunicationsBoundaryService,
  ) {}

  async prepareMessage(input: PrepareCommunicationMessageInput): Promise<CommunicationMessage> {
    this.boundary.assertNotDuplicatingSubstantiveNotice(
      input.sourceRecordType,
      input.duplicateBodyContent,
    );

    if (input.templateVersionId) {
      const version = await this.prisma.communicationTemplateVersion.findUnique({
        where: { id: input.templateVersionId },
      });
      if (!version) {
        throw new CommunicationTemplateNotFoundException(input.templateVersionId);
      }
    }

    const humanEnteredText = input.humanEnteredText
      ? validateTemplateFields(input.humanEnteredText, Object.keys(input.humanEnteredText))
      : undefined;

    return this.prisma.communicationMessage.create({
      data: {
        messageNumber: generateCommunicationMessageNumber(),
        communicationType: input.communicationType,
        sourceRecordType: input.sourceRecordType,
        sourceRecordId: input.sourceRecordId,
        caseId: input.caseId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        templateVersionId: input.templateVersionId,
        subject: input.subject,
        classification: input.classification,
        senderInstitutionId: input.senderInstitutionId,
        preparedByIdentityId: input.preparedByIdentityId,
        canonicalNoticeReference: input.canonicalNoticeReference,
        verifiedDataSnapshot: input.verifiedDataSnapshot,
        computedDataSnapshot: input.computedDataSnapshot,
        humanEnteredText,
        mandatoryCategory: input.mandatoryCategory,
        deliveryEffect: input.deliveryEffect,
        aiDraftStatus: input.aiDraftStatus,
        status: CommunicationMessageStatus.DRAFT,
        isOfficial: false,
      },
    });
  }

  async approveMessage(input: ApproveCommunicationMessageInput): Promise<CommunicationMessage> {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id: input.messageId },
      include: { templateVersion: true },
    });

    if (!message) {
      throw new CommunicationMessageNotFoundException(input.messageId);
    }

    if (
      message.aiDraftStatus === CommunicationAiDraftStatus.PENDING_HUMAN_APPROVAL ||
      message.templateVersion?.requiresApproval
    ) {
      if (!input.approvedByIdentityId) {
        throw new CommunicationApprovalRequiredException();
      }
    }

    return this.prisma.communicationMessage.update({
      where: { id: input.messageId },
      data: {
        approvedByIdentityId: input.approvedByIdentityId,
        status: CommunicationMessageStatus.APPROVED,
        isOfficial: true,
        aiDraftStatus:
          message.aiDraftStatus === CommunicationAiDraftStatus.PENDING_HUMAN_APPROVAL
            ? CommunicationAiDraftStatus.APPROVED
            : message.aiDraftStatus,
      },
    });
  }

  async assertReadyForDelivery(messageId: string): Promise<CommunicationMessage> {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id: messageId },
      include: { templateVersion: true },
    });

    if (!message) {
      throw new CommunicationMessageNotFoundException(messageId);
    }

    if (!message.isOfficial) {
      throw new CommunicationApprovalRequiredException();
    }

    if (message.templateVersion?.requiresApproval && !message.approvedByIdentityId) {
      throw new CommunicationApprovalRequiredException();
    }

    return message;
  }

  async getMessage(messageId: string): Promise<CommunicationMessage | null> {
    return this.prisma.communicationMessage.findUnique({ where: { id: messageId } });
  }
}

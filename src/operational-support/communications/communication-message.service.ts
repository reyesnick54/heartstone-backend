import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CommunicationChannelType,
  CommunicationMessage,
  CommunicationMessageStatus,
  CommunicationRecipient,
  CommunicationTemplateStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CommunicationTemplateService } from './communication-template.service';

export interface CreateCommunicationMessageInput {
  messageReference: string;
  channelType: CommunicationChannelType;
  subject: string;
  body: string;
  caseId?: string;
  masterAdministrativeFileId?: string;
  communicationTemplateVersionId?: string;
  decisionNoticeReference?: string;
  scheduledAt?: Date;
  recipients: {
    recipientType: string;
    recipientReference: string;
    recipientIdentityId?: string;
    displayName?: string;
  }[];
}

@Injectable()
export class CommunicationMessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: CommunicationTemplateService,
  ) {}

  async createMessage(input: CreateCommunicationMessageInput): Promise<CommunicationMessage> {
    this.templates.assertTemplateContentSafe(input.subject);
    this.templates.assertTemplateContentSafe(input.body);

    if (input.communicationTemplateVersionId) {
      const version = await this.prisma.communicationTemplateVersion.findUnique({
        where: { id: input.communicationTemplateVersionId },
      });

      if (!version) {
        throw new NotFoundException(
          `CommunicationTemplateVersion ${input.communicationTemplateVersionId} not found`,
        );
      }

      if (
        version.status !== CommunicationTemplateStatus.APPROVED &&
        version.status !== CommunicationTemplateStatus.ACTIVE
      ) {
        throw new BadRequestException('Messages may use only approved or active template versions');
      }
    }

    return this.prisma.communicationMessage.create({
      data: {
        messageReference: input.messageReference,
        channelType: input.channelType,
        subject: input.subject,
        body: input.body,
        caseId: input.caseId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        communicationTemplateVersionId: input.communicationTemplateVersionId,
        decisionNoticeReference: input.decisionNoticeReference,
        scheduledAt: input.scheduledAt,
        status: CommunicationMessageStatus.DRAFT,
        recipients: {
          create: input.recipients.map((recipient) => ({
            recipientType: recipient.recipientType,
            recipientReference: recipient.recipientReference,
            recipientIdentityId: recipient.recipientIdentityId,
            displayName: recipient.displayName,
          })),
        },
      },
      include: { recipients: true },
    });
  }

  async approveMessage(messageId: string): Promise<CommunicationMessage> {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`CommunicationMessage ${messageId} not found`);
    }

    if (message.status !== CommunicationMessageStatus.DRAFT) {
      throw new BadRequestException('Only draft messages may be approved');
    }

    this.templates.assertTemplateContentSafe(message.subject);
    this.templates.assertTemplateContentSafe(message.body);

    return this.prisma.communicationMessage.update({
      where: { id: messageId },
      data: {
        status: CommunicationMessageStatus.APPROVED,
        approvedAt: new Date(),
      },
    });
  }

  async linkDecisionNoticeReference(
    messageId: string,
    decisionNoticeReference: string,
  ): Promise<CommunicationMessage> {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(`CommunicationMessage ${messageId} not found`);
    }

    return this.prisma.communicationMessage.update({
      where: { id: messageId },
      data: { decisionNoticeReference },
    });
  }

  async getMessage(messageId: string): Promise<
    | (CommunicationMessage & { recipients: CommunicationRecipient[] })
    | null
  > {
    return this.prisma.communicationMessage.findUnique({
      where: { id: messageId },
      include: { recipients: true, deliveries: true },
    });
  }

  async listMessagesForCase(caseId: string): Promise<CommunicationMessage[]> {
    return this.prisma.communicationMessage.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

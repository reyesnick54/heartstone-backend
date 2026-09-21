import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CommunicationChannelType,
  CommunicationMessageStatus,
  CommunicationReceiptType,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../../identity/audit/security-audit.service';
import { CITIZEN_MESSAGE_ACKNOWLEDGMENT_DISCLAIMER } from '../citizen-experience.constants';
import {
  CitizenAccessScope,
  CitizenAccessScopeService,
} from '../common/citizen-access-scope.service';
import { CitizenExperienceBoundaryService } from '../common/citizen-experience-boundary.service';

export interface CitizenMessageSummary {
  id: string;
  messageReference: string;
  subject: string;
  channelType: CommunicationChannelType;
  status: CommunicationMessageStatus;
  deliveredAt?: string;
  caseId?: string;
  acknowledged: boolean;
}

export interface CitizenMessageDetail extends CitizenMessageSummary {
  body: string;
  decisionNoticeReference?: string;
  deliveries: {
    id: string;
    channelType: CommunicationChannelType;
    status: string;
    completedAt?: string;
  }[];
}

export interface CitizenMessageAcknowledgmentResult {
  receiptId: string;
  messageId: string;
  receivedAt: string;
  disclaimer: string;
}

type AccessibleMessage = Prisma.CommunicationMessageGetPayload<{
  include: {
    recipients: true;
    deliveries: { include: { receipts: true } };
  };
}>;

@Injectable()
export class CitizenMessagesProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CitizenAccessScopeService,
    private readonly boundary: CitizenExperienceBoundaryService,
    private readonly audit: SecurityAuditService,
  ) {}

  async listMessages(identityId: string): Promise<CitizenMessageSummary[]> {
    const scope = await this.scopeService.resolveScope(identityId);
    const messages = await this.findAccessibleMessages(scope);
    return messages.map((message) => this.toSummary(message, scope));
  }

  async getMessage(identityId: string, messageId: string): Promise<CitizenMessageDetail> {
    const scope = await this.scopeService.resolveScope(identityId);
    const message = await this.findAccessibleMessageById(scope, messageId);
    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }
    return this.toDetail(message, scope);
  }

  async acknowledgeMessage(
    identityId: string,
    messageId: string,
    sessionId?: string,
  ): Promise<CitizenMessageAcknowledgmentResult> {
    const scope = await this.scopeService.resolveScope(identityId);
    const message = await this.findAccessibleMessageById(scope, messageId);
    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }

    const recipientMatch = this.recipientMatchesIdentity(message, scope);
    const portalDelivery = message.deliveries.find(
      (delivery) => delivery.channelType === CommunicationChannelType.PORTAL,
    );

    const alreadyAcknowledged = portalDelivery
      ? portalDelivery.receipts.some(
          (receipt) => receipt.receiptType === CommunicationReceiptType.LEGAL_ACKNOWLEDGMENT,
        )
      : false;

    this.boundary.assertMessageAcknowledgable(
      this.boundary.isMessageAcknowledgable({
        status: message.status,
        channelType: message.channelType,
        recipientMatches: recipientMatch,
        alreadyAcknowledged,
      }),
    );

    if (!portalDelivery) {
      this.boundary.assertMessageAcknowledgable(false);
      throw new Error('Portal delivery is required after acknowledgment guard');
    }

    const receipt = await this.prisma.communicationReceipt.create({
      data: {
        communicationDeliveryId: portalDelivery.id,
        receiptType: CommunicationReceiptType.LEGAL_ACKNOWLEDGMENT,
        evidenceReference: `citizen-portal-ack:${message.id}:${identityId}`,
      },
    });

    await this.audit.record({
      eventType: 'PROTECTED_ENDPOINT_ACCESS',
      identityId,
      sessionId,
      actorIdentityId: identityId,
      metadata: {
        action: 'CITIZEN_MESSAGE_ACKNOWLEDGED',
        messageId: message.id,
        messageReference: message.messageReference,
        receiptId: receipt.id,
      },
    });

    return {
      receiptId: receipt.id,
      messageId: message.id,
      receivedAt: receipt.receivedAt.toISOString(),
      disclaimer: CITIZEN_MESSAGE_ACKNOWLEDGMENT_DISCLAIMER,
    };
  }

  private async findAccessibleMessages(scope: CitizenAccessScope): Promise<AccessibleMessage[]> {
    const messages = await this.prisma.communicationMessage.findMany({
      where: {
        status: {
          in: [
            CommunicationMessageStatus.DELIVERED,
            CommunicationMessageStatus.PARTIALLY_DELIVERED,
          ],
        },
        OR: [
          ...(scope.caseIds.length > 0 ? [{ caseId: { in: scope.caseIds } }] : []),
          {
            recipients: {
              some: {
                OR: [
                  { recipientIdentityId: scope.identityId },
                  ...(scope.organizationIds.length > 0
                    ? [
                        {
                          recipientReference: { in: scope.organizationIds },
                          recipientType: 'ORGANIZATION',
                        },
                      ]
                    : []),
                ],
              },
            },
          },
        ],
      },
      include: this.messageInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return messages.filter((message) => this.isMessageAccessible(message, scope));
  }

  private async findAccessibleMessageById(
    scope: CitizenAccessScope,
    messageId: string,
  ): Promise<AccessibleMessage | null> {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id: messageId },
      include: this.messageInclude(),
    });

    if (!message || !this.boundary.isMessageCitizenVisible(message.status)) {
      return null;
    }

    if (!this.isMessageAccessible(message, scope)) {
      return null;
    }

    return message;
  }

  private messageInclude() {
    return {
      recipients: true,
      deliveries: {
        include: { receipts: true },
        orderBy: { createdAt: 'desc' as const },
      },
    };
  }

  private isMessageAccessible(message: AccessibleMessage, scope: CitizenAccessScope): boolean {
    if (message.caseId && scope.caseIds.includes(message.caseId)) {
      return true;
    }

    return this.recipientMatchesIdentity(message, scope);
  }

  private recipientMatchesIdentity(message: AccessibleMessage, scope: CitizenAccessScope): boolean {
    return message.recipients.some((recipient) => {
      if (recipient.recipientIdentityId === scope.identityId) {
        return true;
      }

      if (
        recipient.recipientType === 'ORGANIZATION' &&
        scope.organizationIds.includes(recipient.recipientReference)
      ) {
        return true;
      }

      return false;
    });
  }

  private isAcknowledged(message: AccessibleMessage): boolean {
    return message.deliveries.some((delivery) =>
      delivery.receipts.some(
        (receipt) => receipt.receiptType === CommunicationReceiptType.LEGAL_ACKNOWLEDGMENT,
      ),
    );
  }

  private toSummary(message: AccessibleMessage, scope: CitizenAccessScope): CitizenMessageSummary {
    const portalDelivery = message.deliveries.find(
      (d) => d.channelType === CommunicationChannelType.PORTAL,
    );

    return {
      id: message.id,
      messageReference: message.messageReference,
      subject: message.subject,
      channelType: message.channelType,
      status: message.status,
      deliveredAt: portalDelivery?.completedAt?.toISOString(),
      caseId: message.caseId ?? undefined,
      acknowledged: this.isAcknowledged(message) && this.recipientMatchesIdentity(message, scope),
    };
  }

  private toDetail(message: AccessibleMessage, scope: CitizenAccessScope): CitizenMessageDetail {
    const summary = this.toSummary(message, scope);

    return {
      ...summary,
      body: message.body,
      decisionNoticeReference: message.decisionNoticeReference ?? undefined,
      deliveries: message.deliveries.map((delivery) => ({
        id: delivery.id,
        channelType: delivery.channelType,
        status: delivery.status,
        completedAt: delivery.completedAt?.toISOString(),
      })),
    };
  }
}

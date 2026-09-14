import { Injectable } from '@nestjs/common';
import {
  type CommunicationRecipient,
  CommunicationRecipientRole,
  CommunicationServiceCapacity,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CommunicationMessageNotFoundException,
  CommunicationRecipientBlockedException,
} from '../common/communications.exceptions';
import { CommunicationsBoundaryService } from '../common/communications-boundary.service';

export interface AddCommunicationRecipientInput {
  messageId: string;
  recipientIdentityId?: string;
  recipientOrganizationId?: string;
  recipientRole?: CommunicationRecipientRole;
  channelReference?: string;
  preferredLanguage?: string;
  accessibilityRequirements?: Prisma.InputJsonValue;
  legalServiceCapacity: CommunicationServiceCapacity;
  representativeAuthorityId?: string;
  representativeRelationship?: string;
}

@Injectable()
export class CommunicationRecipientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CommunicationsBoundaryService,
  ) {}

  async addRecipient(input: AddCommunicationRecipientInput): Promise<CommunicationRecipient> {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id: input.messageId },
    });

    if (!message) {
      throw new CommunicationMessageNotFoundException(input.messageId);
    }

    if (
      input.recipientRole === CommunicationRecipientRole.REPRESENTATIVE ||
      input.legalServiceCapacity === CommunicationServiceCapacity.REPRESENTATIVE
    ) {
      const authority = input.representativeAuthorityId
        ? await this.prisma.representativeAuthority.findUnique({
            where: { id: input.representativeAuthorityId },
          })
        : null;
      this.boundary.assertRepresentativeAuthorityValid(authority);
    }

    if (!input.recipientIdentityId && !input.recipientOrganizationId) {
      throw new CommunicationRecipientBlockedException(
        'recipient identity or organization required',
      );
    }

    return this.prisma.communicationRecipient.create({
      data: {
        messageId: input.messageId,
        recipientIdentityId: input.recipientIdentityId,
        recipientOrganizationId: input.recipientOrganizationId,
        recipientRole: input.recipientRole ?? CommunicationRecipientRole.PRIMARY,
        channelReference: input.channelReference,
        preferredLanguage: input.preferredLanguage ?? 'en',
        accessibilityRequirements: input.accessibilityRequirements,
        legalServiceCapacity: input.legalServiceCapacity,
        representativeAuthorityId: input.representativeAuthorityId,
        representativeRelationship: input.representativeRelationship,
      },
    });
  }

  async assertRecipientEligible(recipientId: string): Promise<CommunicationRecipient> {
    const recipient = await this.prisma.communicationRecipient.findUnique({
      where: { id: recipientId },
      include: { representativeAuthority: true },
    });

    if (!recipient) {
      throw new CommunicationRecipientBlockedException('recipient not found');
    }

    if (recipient.blocked) {
      throw new CommunicationRecipientBlockedException(recipient.blockReason ?? 'blocked');
    }

    if (
      recipient.recipientRole === CommunicationRecipientRole.REPRESENTATIVE ||
      recipient.legalServiceCapacity === CommunicationServiceCapacity.REPRESENTATIVE
    ) {
      this.boundary.assertRepresentativeAuthorityValid(recipient.representativeAuthority);
    }

    return recipient;
  }
}

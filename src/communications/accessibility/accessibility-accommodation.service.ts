import { Injectable } from '@nestjs/common';
import { type AccessibilityAccommodation, AccessibilityAccommodationType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CommunicationMessageNotFoundException } from '../common/communications.exceptions';

export interface RecordAccessibilityAccommodationInput {
  messageId: string;
  recipientId?: string;
  accommodationType: AccessibilityAccommodationType;
  description?: string;
  configuredSupport?: string;
}

@Injectable()
export class AccessibilityAccommodationService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAccommodation(
    input: RecordAccessibilityAccommodationInput,
  ): Promise<AccessibilityAccommodation> {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id: input.messageId },
    });

    if (!message) {
      throw new CommunicationMessageNotFoundException(input.messageId);
    }

    return this.prisma.accessibilityAccommodation.create({
      data: {
        messageId: input.messageId,
        recipientId: input.recipientId,
        accommodationType: input.accommodationType,
        description: input.description,
        configuredSupport: input.configuredSupport,
      },
    });
  }
}

import { Injectable } from '@nestjs/common';
import {
  CommunicationChannel,
  CommunicationMandatoryCategory,
  type CommunicationPreference,
  CommunicationPreferenceScope,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { MandatoryCommunicationSuppressedException } from '../common/communications.exceptions';
import { CommunicationsBoundaryService } from '../common/communications-boundary.service';

export interface UpsertCommunicationPreferenceInput {
  identityId: string;
  scope: CommunicationPreferenceScope;
  channel?: CommunicationChannel;
  enabled: boolean;
  language?: string;
}

export interface AssertDeliveryAllowedInput {
  identityId: string;
  channel: CommunicationChannel;
  mandatoryCategory?: CommunicationMandatoryCategory | null;
  requiredOrOptional: boolean;
}

@Injectable()
export class CommunicationPreferenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CommunicationsBoundaryService,
  ) {}

  async upsertPreference(
    input: UpsertCommunicationPreferenceInput,
  ): Promise<CommunicationPreference> {
    const channelKey = input.channel ?? null;

    const existing = await this.prisma.communicationPreference.findFirst({
      where: {
        identityId: input.identityId,
        scope: input.scope,
        channel: channelKey,
      },
    });

    if (existing) {
      return this.prisma.communicationPreference.update({
        where: { id: existing.id },
        data: {
          enabled: input.enabled,
          language: input.language,
        },
      });
    }

    return this.prisma.communicationPreference.create({
      data: {
        identityId: input.identityId,
        scope: input.scope,
        channel: input.channel,
        enabled: input.enabled,
        language: input.language,
      },
    });
  }

  async assertDeliveryAllowed(input: AssertDeliveryAllowedInput): Promise<void> {
    if (this.boundary.isMandatoryCategory(input.mandatoryCategory)) {
      return;
    }

    if (input.requiredOrOptional) {
      return;
    }

    const preference = await this.prisma.communicationPreference.findFirst({
      where: {
        identityId: input.identityId,
        OR: [{ channel: input.channel }, { channel: null }],
        scope: {
          in: [CommunicationPreferenceScope.MARKETING, CommunicationPreferenceScope.INFORMATIONAL],
        },
      },
    });

    if (preference && !preference.enabled) {
      if (input.mandatoryCategory) {
        throw new MandatoryCommunicationSuppressedException(input.mandatoryCategory);
      }
      throw new MandatoryCommunicationSuppressedException('OPTIONAL_COMMUNICATION');
    }
  }

  async isOptionalDeliveryEnabled(
    identityId: string,
    scope: CommunicationPreferenceScope,
  ): Promise<boolean> {
    const preference = await this.prisma.communicationPreference.findFirst({
      where: { identityId, scope },
    });
    return preference?.enabled ?? true;
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { type CommunicationPreference, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../../identity/audit/security-audit.service';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import {
  CITIZEN_COMMUNICATION_PREFERENCES_DISCLAIMER,
  CITIZEN_CONFIGURABLE_CHANNELS,
} from './citizen-self-service.constants';
import {
  type CitizenCommunicationPreferencesDto,
  type UpdateCitizenCommunicationPreferencesDto,
} from './dto/citizen-self-service.dto';

/**
 * Citizen-level communication preferences (identity scope, no institution). Self-service and
 * applied directly: they only steer optional deliveries. CommunicationDeliveryService still
 * delivers mandatory notices regardless of these settings.
 */
@Injectable()
export class CitizenCommunicationPreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
  ) {}

  async get(identityId: string): Promise<CitizenCommunicationPreferencesDto> {
    const rows = await this.prisma.communicationPreference.findMany({
      where: { identityId, institutionId: null },
      orderBy: { updatedAt: 'desc' },
    });
    return this.toDto(rows);
  }

  async update(
    session: SessionContextDto,
    dto: UpdateCitizenCommunicationPreferencesDto,
  ): Promise<CitizenCommunicationPreferencesDto> {
    const identityId = session.identityId;
    const channels = dto.preferences.map((preference) => preference.channelType);
    if (new Set(channels).size !== channels.length) {
      throw new BadRequestException('Each channel may appear at most once');
    }

    const changes = await this.prisma.$transaction(async (tx) => {
      // One writer per identity so concurrent saves cannot create duplicate channel rows.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`citizen-comm-prefs:${identityId}`}))`;

      const applied: { channelType: string; isEnabled: boolean; previous: boolean | null }[] = [];
      for (const preference of dto.preferences) {
        const existing = await tx.communicationPreference.findFirst({
          where: { identityId, institutionId: null, channelType: preference.channelType },
          orderBy: { updatedAt: 'desc' },
        });
        const data = {
          isEnabled: preference.isEnabled,
          locale: preference.locale ?? null,
          accessibilityRequirements: (preference.accessibilityRequirements ??
            []) as Prisma.InputJsonValue,
        };
        if (existing) {
          await tx.communicationPreference.update({ where: { id: existing.id }, data });
        } else {
          await tx.communicationPreference.create({
            data: { identityId, channelType: preference.channelType, ...data },
          });
        }
        applied.push({
          channelType: preference.channelType,
          isEnabled: preference.isEnabled,
          previous: existing?.isEnabled ?? null,
        });
      }
      return applied;
    });

    await this.audit.record({
      eventType: 'PROTECTED_ENDPOINT_ACCESS',
      identityId,
      sessionId: session.sessionId,
      actorIdentityId: identityId,
      metadata: { action: 'CITIZEN_COMMUNICATION_PREFERENCES_UPDATED', changes },
    });

    return this.get(identityId);
  }

  private toDto(rows: CommunicationPreference[]): CitizenCommunicationPreferencesDto {
    return {
      items: CITIZEN_CONFIGURABLE_CHANNELS.map((channelType) => {
        // Rows are newest first; the newest row is the one that applies.
        const row = rows.find((candidate) => candidate.channelType === channelType);
        const accessibility = Array.isArray(row?.accessibilityRequirements)
          ? row.accessibilityRequirements.filter((item): item is string => typeof item === 'string')
          : [];
        return {
          channelType,
          isEnabled: row?.isEnabled ?? true,
          locale: row?.locale ?? null,
          accessibilityRequirements: accessibility,
          isExplicit: row !== undefined,
        };
      }),
      disclaimer: CITIZEN_COMMUNICATION_PREFERENCES_DISCLAIMER,
    };
  }
}

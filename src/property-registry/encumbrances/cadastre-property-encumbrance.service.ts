import { BadRequestException, Injectable } from '@nestjs/common';
import {
  Prisma,
  PropertyEncumbranceStatus,
  PropertyEncumbranceType,
  PropertyRegistryAuditEventType,
  PropertyTransactionHistoryEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PropertyRegistryAuditService } from '../audit/property-registry-audit.service';
import { PropertyRegistryCadastreBoundaryService } from '../common/property-registry-cadastre-boundary.service';
import { buildPropertyReference } from '../common/property-registry-reference.util';
import { PROPERTY_ENCUMBRANCE_REFERENCE_PREFIX } from '../property-registry.constants';

@Injectable()
export class CadastrePropertyEncumbranceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PropertyRegistryCadastreBoundaryService,
    private readonly audit: PropertyRegistryAuditService,
  ) {}

  assertDeleteBlocked(): void {
    this.boundary.assertEncumbranceCannotBeSilentlyDeleted('delete');
  }

  async recordEncumbrance(input: {
    titleRecordId: string;
    encumbranceType: PropertyEncumbranceType;
    summary?: string;
    actorIdentityId: string;
  }) {
    const encumbranceReference = buildPropertyReference(PROPERTY_ENCUMBRANCE_REFERENCE_PREFIX);

    const encumbrance = await this.prisma.cadastrePropertyEncumbrance.create({
      data: {
        encumbranceReference,
        titleRecordId: input.titleRecordId,
        encumbranceType: input.encumbranceType,
        status: PropertyEncumbranceStatus.ACTIVE,
        summary: input.summary,
      },
    });

    await this.prisma.propertyTransactionHistory.create({
      data: {
        titleRecordId: input.titleRecordId,
        eventType: PropertyTransactionHistoryEventType.ENCUMBRANCE_REGISTRATION,
        effectiveDate: new Date(),
        eventSummary: {
          encumbranceReference,
          encumbranceType: input.encumbranceType,
        } satisfies Prisma.InputJsonObject,
      },
    });

    await this.audit.record({
      eventType: PropertyRegistryAuditEventType.ENCUMBRANCE_RECORDED,
      actorIdentityId: input.actorIdentityId,
      metadata: { encumbranceReference },
    });

    return encumbrance;
  }

  async releaseEncumbrance(input: {
    encumbranceId: string;
    releaseDecisionId: string;
    actorIdentityId: string;
  }) {
    const encumbrance = await this.prisma.cadastrePropertyEncumbrance.findUnique({
      where: { id: input.encumbranceId },
    });

    if (!encumbrance) {
      throw new BadRequestException('Encumbrance not found');
    }

    const updated = await this.prisma.cadastrePropertyEncumbrance.update({
      where: { id: encumbrance.id },
      data: {
        status: PropertyEncumbranceStatus.RELEASED,
        effectiveTo: new Date(),
        releaseDecisionId: input.releaseDecisionId,
      },
    });

    await this.prisma.propertyTransactionHistory.create({
      data: {
        titleRecordId: encumbrance.titleRecordId,
        eventType: PropertyTransactionHistoryEventType.ENCUMBRANCE_RELEASE,
        effectiveDate: new Date(),
        eventSummary: {
          encumbranceReference: encumbrance.encumbranceReference,
          releaseDecisionId: input.releaseDecisionId,
        } satisfies Prisma.InputJsonObject,
      },
    });

    await this.audit.record({
      eventType: PropertyRegistryAuditEventType.ENCUMBRANCE_RELEASE_REQUESTED,
      actorIdentityId: input.actorIdentityId,
      metadata: { encumbranceId: encumbrance.id },
    });

    return updated;
  }
}

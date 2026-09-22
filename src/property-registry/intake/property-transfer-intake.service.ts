import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PropertyRegistryAuditEventType,
  PropertyTransactionHistoryEventType,
  PropertyTransferApplicationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PropertyRegistryAuditService } from '../audit/property-registry-audit.service';
import { PropertyRegistryBoundaryService } from '../common/property-registry-boundary.service';
import { buildPropertyReference } from '../common/property-registry-reference.util';
import { PROPERTY_TRANSFER_REFERENCE_PREFIX } from '../property-registry.constants';

export interface CreatePropertyTransferIntakeInput {
  landParcelId: string;
  propertyRecordId: string;
  titleRecordId?: string;
  jurisdictionId: string;
  institutionId: string;
  applicationId?: string;
  caseId?: string;
  governmentServiceId?: string;
  governingServicePackVersionId?: string;
  clientPayload?: Record<string, unknown>;
  representativeAuthorityId?: string;
  actorHasRepresentativeAuthority?: boolean;
}

@Injectable()
export class PropertyTransferIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PropertyRegistryBoundaryService,
    private readonly audit: PropertyRegistryAuditService,
  ) {}

  async createIntake(actorIdentityId: string, input: CreatePropertyTransferIntakeInput) {
    if (input.clientPayload) {
      this.boundary.rejectClientForgedTransferFields(input.clientPayload);
    }

    this.boundary.assertTransferApplicationDoesNotMutateTitle(
      input.clientPayload?.applicationStatus as PropertyTransferApplicationStatus | undefined,
    );

    if (input.representativeAuthorityId !== undefined) {
      this.boundary.assertUnauthorizedRepresentativeCannotTransfer(
        Boolean(input.actorHasRepresentativeAuthority),
      );
    }

    const transferReference = buildPropertyReference(PROPERTY_TRANSFER_REFERENCE_PREFIX);

    const transfer = await this.prisma.propertyTransfer.create({
      data: {
        transferReference,
        applicationStatus: PropertyTransferApplicationStatus.INTAKE_DRAFT,
        landParcelId: input.landParcelId,
        propertyRecordId: input.propertyRecordId,
        titleRecordId: input.titleRecordId,
        jurisdictionId: input.jurisdictionId,
        institutionId: input.institutionId,
        applicationId: input.applicationId,
        caseId: input.caseId,
        governmentServiceId: input.governmentServiceId,
        governingServicePackVersionId: input.governingServicePackVersionId,
      },
    });

    if (input.titleRecordId) {
      await this.prisma.propertyTransactionHistory.create({
        data: {
          titleRecordId: input.titleRecordId,
          propertyTransferId: transfer.id,
          eventType: PropertyTransactionHistoryEventType.TRANSFER_APPLICATION,
          effectiveDate: new Date(),
          eventSummary: {
            transferReference,
            note: 'Intake only — not a title mutation',
          } satisfies Prisma.InputJsonObject,
        },
      });
    }

    await this.audit.record({
      propertyTransferId: transfer.id,
      eventType: PropertyRegistryAuditEventType.TRANSFER_INTAKE_CREATED,
      actorIdentityId,
      metadata: { transferReference },
    });

    return transfer;
  }
}

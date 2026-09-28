import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  FreeZoneCustomsCaseStatus,
  FreeZoneCustomsCoordinationStatus,
  FreeZoneDutyReliefRequestStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { FREE_ZONE_CUSTOMS_CASE_REFERENCE_PREFIX } from '../absez-s18f.constants';
import { FreeZoneCustomsAuthorityService } from './free-zone-customs-authority.service';
import { FreeZoneCustomsBoundaryService } from './free-zone-customs-boundary.service';

@Injectable()
export class FreeZoneCustomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: FreeZoneCustomsBoundaryService,
    private readonly authority: FreeZoneCustomsAuthorityService,
  ) {}

  async configureCase(input: {
    institutionId: string;
    jurisdictionId: string;
    delegatedFunctionCode?: string;
    governingSourceId?: string;
    shipmentReferenceId?: string;
    customsDeclarationId?: string;
    absezZoneEnterpriseId?: string;
  }) {
    const caseReference = `${FREE_ZONE_CUSTOMS_CASE_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const record = await this.prisma.freeZoneCustomsCase.create({
      data: {
        id: randomUUID(),
        caseReference,
        institutionId: input.institutionId,
        jurisdictionId: input.jurisdictionId,
        delegatedFunctionCode: input.delegatedFunctionCode,
        governingSourceId: input.governingSourceId,
        shipmentReferenceId: input.shipmentReferenceId,
        customsDeclarationId: input.customsDeclarationId,
        absezZoneEnterpriseId: input.absezZoneEnterpriseId,
        status: FreeZoneCustomsCaseStatus.CONFIGURED,
        coordinationStatus: FreeZoneCustomsCoordinationStatus.DRAFT,
        doesNotImplyCustomsClearance: true,
      },
    });
    this.boundary.assertDoesNotManufactureClearance(record.doesNotImplyCustomsClearance);
    return record;
  }

  async registerBondedWarehouse(input: {
    institutionId: string;
    warehouseCode: string;
    facilityLabel: string;
  }) {
    return this.prisma.bondedWarehouseReference.upsert({
      where: {
        institutionId_warehouseCode: {
          institutionId: input.institutionId,
          warehouseCode: input.warehouseCode,
        },
      },
      create: {
        id: randomUUID(),
        institutionId: input.institutionId,
        warehouseCode: input.warehouseCode,
        facilityLabel: input.facilityLabel,
      },
      update: { facilityLabel: input.facilityLabel },
    });
  }

  async linkBondedWarehouse(freeZoneCustomsCaseId: string, bondedWarehouseReferenceId: string) {
    return this.prisma.freeZoneBondedWarehouseLink.create({
      data: {
        id: randomUUID(),
        freeZoneCustomsCaseId,
        bondedWarehouseReferenceId,
      },
    });
  }

  async referenceDutyRelief(freeZoneCustomsCaseId: string, requestReference: string) {
    return this.prisma.freeZoneDutyReliefRequest.create({
      data: {
        id: randomUUID(),
        freeZoneCustomsCaseId,
        requestReference,
        status: FreeZoneDutyReliefRequestStatus.REFERENCED,
      },
    });
  }

  async recordPortCoordination(
    freeZoneCustomsCaseId: string,
    portReferenceToken: string,
    coordinationNotes?: string,
  ) {
    return this.prisma.freeZonePortCustomsCoordination.create({
      data: {
        id: randomUUID(),
        freeZoneCustomsCaseId,
        portReferenceToken,
        coordinationNotes,
      },
    });
  }

  async attemptConsequentialCoordination(freeZoneCustomsCaseId: string) {
    const caseRecord = await this.prisma.freeZoneCustomsCase.findUniqueOrThrow({
      where: { id: freeZoneCustomsCaseId },
    });
    try {
      await this.authority.assertDelegatedCustomsFacilitationActive(
        caseRecord.delegatedFunctionCode,
      );
    } catch {
      return this.prisma.freeZoneCustomsCase.update({
        where: { id: freeZoneCustomsCaseId },
        data: {
          coordinationStatus: FreeZoneCustomsCoordinationStatus.HALTED_PENDING_AUTHORITY,
          status: FreeZoneCustomsCaseStatus.AWAITING_NATIONAL_CUSTOMS,
        },
      });
    }
    return this.prisma.freeZoneCustomsCase.update({
      where: { id: freeZoneCustomsCaseId },
      data: {
        coordinationStatus: FreeZoneCustomsCoordinationStatus.ACTIVE,
        status: FreeZoneCustomsCaseStatus.COORDINATION_ACTIVE,
      },
    });
  }

  async recordExternalCustomsDetermination(input: {
    freeZoneCustomsCaseId: string;
    externalAuthorityId: string;
    isAuthenticated: boolean;
    authenticatedPayload?: Record<string, unknown>;
    recordedByIdentityId?: string;
    retainedNationalDeterminationId?: string;
    clientPayload?: Record<string, unknown>;
    actorIsOfficial: boolean;
  }) {
    if (input.clientPayload) {
      this.boundary.rejectApplicantForgedNationalCustomsDetermination(
        input.clientPayload,
        input.actorIsOfficial,
      );
    }

    const authenticatedPayloadHash = input.authenticatedPayload
      ? createHash('sha256').update(JSON.stringify(input.authenticatedPayload)).digest('hex')
      : undefined;

    const determination = await this.prisma.freeZoneCustomsExternalDetermination.create({
      data: {
        id: randomUUID(),
        freeZoneCustomsCaseId: input.freeZoneCustomsCaseId,
        externalAuthorityId: input.externalAuthorityId,
        isAuthenticated: input.isAuthenticated,
        authenticatedPayloadHash,
        recordedByIdentityId: input.recordedByIdentityId,
        retainedNationalDeterminationId: input.retainedNationalDeterminationId,
        spoofedAbsezClearanceAttempt: false,
      },
    });

    await this.prisma.freeZoneCustomsCase.update({
      where: { id: input.freeZoneCustomsCaseId },
      data: {
        status: FreeZoneCustomsCaseStatus.EXTERNAL_DETERMINATION_RECORDED,
        coordinationStatus: FreeZoneCustomsCoordinationStatus.AWAITING_EXTERNAL,
      },
    });

    return determination;
  }
}

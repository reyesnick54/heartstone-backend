import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CorporateBeneficialOwnerControlNature,
  type CorporateBeneficialOwnerRecord,
  CorporateBeneficialOwnershipChangeType,
  CorporateBeneficialOwnerVerificationStatus,
  CorporateFilingStatus,
  CorporateRegistryRecordStatus,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface StructuredBeneficialOwnerInput {
  ownerReference: string;
  controlNature: CorporateBeneficialOwnerControlNature;
  ownershipPercentage?: number;
  subjectPersonId?: string;
  subjectOrganizationId?: string;
  provenanceSource: string;
  effectiveFrom?: Date;
}

@Injectable()
export class CorporateBeneficialOwnershipService {
  constructor(private readonly prisma: PrismaService) {}

  async submitStructuredDeclaration(input: {
    profileId: string;
    changedByIdentityId: string;
    owners: StructuredBeneficialOwnerInput[];
  }) {
    const declarationReference = `BO-${randomUUID().slice(0, 8).toUpperCase()}`;

    const declaration = await this.prisma.corporateBeneficialOwnershipDeclaration.create({
      data: {
        profileId: input.profileId,
        declarationReference,
        status: CorporateFilingStatus.SUBMITTED,
        recordApprovalStatus: CorporateRegistryRecordStatus.PENDING_REVIEW,
        submittedAt: new Date(),
      },
    });

    const createdRecords: CorporateBeneficialOwnerRecord[] = [];

    for (const owner of input.owners) {
      const record = await this.prisma.corporateBeneficialOwnerRecord.create({
        data: {
          profileId: input.profileId,
          declarationId: declaration.id,
          ownerReference: owner.ownerReference,
          controlNature: owner.controlNature,
          ownershipPercentage: owner.ownershipPercentage,
          subjectPersonId: owner.subjectPersonId,
          subjectOrganizationId: owner.subjectOrganizationId,
          provenanceSource: owner.provenanceSource,
          effectiveFrom: owner.effectiveFrom ?? new Date(),
          verificationStatus: CorporateBeneficialOwnerVerificationStatus.PENDING_REVIEW,
          recordStatus: CorporateRegistryRecordStatus.PENDING_REVIEW,
        },
      });

      await this.recordChangeHistory({
        profileId: input.profileId,
        beneficialOwnerRecordId: record.id,
        changeType: CorporateBeneficialOwnershipChangeType.CREATE,
        priorSnapshot: {},
        newSnapshot: this.snapshotRecord(record),
        changedByIdentityId: input.changedByIdentityId,
      });

      createdRecords.push(record);
    }

    return { declaration, records: createdRecords };
  }

  async supersedeOwnerRecord(input: {
    profileId: string;
    beneficialOwnerRecordId: string;
    changedByIdentityId: string;
    replacement: StructuredBeneficialOwnerInput;
  }) {
    const existing = await this.prisma.corporateBeneficialOwnerRecord.findFirst({
      where: {
        id: input.beneficialOwnerRecordId,
        profileId: input.profileId,
        supersededAt: null,
      },
    });
    if (!existing) {
      throw new NotFoundException('Beneficial owner record not found');
    }

    const priorSnapshot = this.snapshotRecord(existing);

    await this.prisma.corporateBeneficialOwnerRecord.update({
      where: { id: existing.id },
      data: {
        recordStatus: CorporateRegistryRecordStatus.SUPERSEDED,
        supersededAt: new Date(),
        effectiveUntil: new Date(),
      },
    });

    const replacement = await this.prisma.corporateBeneficialOwnerRecord.create({
      data: {
        profileId: input.profileId,
        declarationId: existing.declarationId,
        ownerReference: input.replacement.ownerReference,
        controlNature: input.replacement.controlNature,
        ownershipPercentage: input.replacement.ownershipPercentage,
        subjectPersonId: input.replacement.subjectPersonId,
        subjectOrganizationId: input.replacement.subjectOrganizationId,
        provenanceSource: input.replacement.provenanceSource,
        effectiveFrom: input.replacement.effectiveFrom ?? new Date(),
        verificationStatus: CorporateBeneficialOwnerVerificationStatus.PENDING_REVIEW,
        recordStatus: CorporateRegistryRecordStatus.PENDING_REVIEW,
      },
    });

    await this.recordChangeHistory({
      profileId: input.profileId,
      beneficialOwnerRecordId: replacement.id,
      changeType: CorporateBeneficialOwnershipChangeType.SUPERSEDE,
      priorSnapshot,
      newSnapshot: this.snapshotRecord(replacement),
      changedByIdentityId: input.changedByIdentityId,
    });

    return { superseded: existing, replacement };
  }

  async listActiveStructuredRecords(profileId: string) {
    return this.prisma.corporateBeneficialOwnerRecord.findMany({
      where: {
        profileId,
        supersededAt: null,
        recordStatus: {
          in: [
            CorporateRegistryRecordStatus.DRAFT,
            CorporateRegistryRecordStatus.PENDING_REVIEW,
            CorporateRegistryRecordStatus.APPROVED,
          ],
        },
      },
      orderBy: { effectiveFrom: 'asc' },
    });
  }

  private snapshotRecord(record: CorporateBeneficialOwnerRecord): Prisma.InputJsonValue {
    return {
      ownerReference: record.ownerReference,
      controlNature: record.controlNature,
      ownershipPercentage: record.ownershipPercentage?.toString() ?? null,
      subjectPersonId: record.subjectPersonId,
      subjectOrganizationId: record.subjectOrganizationId,
      verificationStatus: record.verificationStatus,
      provenanceSource: record.provenanceSource,
      effectiveFrom: record.effectiveFrom.toISOString(),
      effectiveUntil: record.effectiveUntil?.toISOString() ?? null,
      recordStatus: record.recordStatus,
    };
  }

  private async recordChangeHistory(input: {
    profileId: string;
    beneficialOwnerRecordId: string;
    changeType: CorporateBeneficialOwnershipChangeType;
    priorSnapshot: Prisma.InputJsonValue;
    newSnapshot: Prisma.InputJsonValue;
    changedByIdentityId: string;
  }) {
    await this.prisma.corporateBeneficialOwnershipChangeHistory.create({
      data: {
        profileId: input.profileId,
        beneficialOwnerRecordId: input.beneficialOwnerRecordId,
        changeType: input.changeType,
        priorSnapshot: input.priorSnapshot,
        newSnapshot: input.newSnapshot,
        changedByIdentityId: input.changedByIdentityId,
      },
    });
  }
}

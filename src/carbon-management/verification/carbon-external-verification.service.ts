import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  CarbonExternalVerificationCategory,
  CarbonExternalVerificationRecordedBy,
  CarbonExternalVerificationStatus,
  CarbonManagementActorPersona,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CarbonManagementBoundaryService } from '../common/carbon-management-boundary.service';

@Injectable()
export class CarbonExternalVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CarbonManagementBoundaryService,
  ) {}

  async assertFinalDecisionAllowed(carbonProjectId: string): Promise<void> {
    const verifications = await this.prisma.carbonExternalVerificationRecord.findMany({
      where: { carbonProjectId },
    });
    this.boundary.assertExternalVerificationsResolved(verifications);
  }

  async recordVerification(
    actorPersona: CarbonManagementActorPersona,
    input: {
      carbonProjectId: string;
      verificationCategory: CarbonExternalVerificationCategory;
      configuredCategoryCode?: string;
      status: CarbonExternalVerificationStatus;
      providerOrganizationId?: string;
      verifierIdentityId?: string;
      externalReference?: string;
      verificationDate?: Date;
      evidenceRecordId?: string;
      provenanceSummary?: string;
      recordedBy: CarbonExternalVerificationRecordedBy;
      recordedByIdentityId?: string;
      blocksFinalDecision?: boolean;
      markOfficialApproval?: boolean;
    },
  ) {
    this.boundary.rejectApplicantForgedExternalVerification(actorPersona, Boolean(input.verifierIdentityId));
    this.boundary.assertAiCannotApproveAuthorization(
      actorPersona,
      'FINALIZE_CARBON_GOVERNMENT_DECISION',
    );
    this.boundary.assertExternalVerificationIsNotAutonomousApproval(
      Boolean(input.markOfficialApproval),
    );

    return this.prisma.carbonExternalVerificationRecord.create({
      data: {
        id: randomUUID(),
        carbonProjectId: input.carbonProjectId,
        verificationCategory: input.verificationCategory,
        configuredCategoryCode: input.configuredCategoryCode,
        status: input.status,
        providerOrganizationId: input.providerOrganizationId,
        verifierIdentityId: input.verifierIdentityId,
        externalReference: input.externalReference,
        verificationDate: input.verificationDate,
        evidenceRecordId: input.evidenceRecordId,
        provenanceSummary: input.provenanceSummary,
        recordedBy: input.recordedBy,
        recordedByIdentityId: input.recordedByIdentityId,
        blocksFinalDecision: input.blocksFinalDecision ?? false,
        isOfficialApproval: false,
        doesNotSubstituteGovernmentDecision: true,
      },
    });
  }

  async updateVerificationStatus(input: {
    verificationId: string;
    reviewerPersona: CarbonManagementActorPersona;
    status: CarbonExternalVerificationStatus;
    markOfficialApproval?: boolean;
  }) {
    this.boundary.assertAiCannotApproveAuthorization(
      input.reviewerPersona,
      'FINALIZE_CARBON_GOVERNMENT_DECISION',
    );
    this.boundary.assertExternalVerificationIsNotAutonomousApproval(
      Boolean(input.markOfficialApproval),
    );

    return this.prisma.carbonExternalVerificationRecord.update({
      where: { id: input.verificationId },
      data: {
        status: input.status,
        isOfficialApproval: false,
      },
    });
  }
}

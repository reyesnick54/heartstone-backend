import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ResearchDataAccessGrantStatus,
  ResearchDatasetStatus,
  ResearchPseudonymizationState,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { HealthcareFoundationAccessPolicyService } from '../common/healthcare-data-access-policy.service';
import { HEALTHCARE_REASON_CODES } from '../healthcare.constants';

@Injectable()
export class ResearchDataGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: HealthcareFoundationAccessPolicyService,
  ) {}

  async createDatasetWithProvenance(input: {
    datasetReference: string;
    purposeCode: string;
    ethicsApprovalRef?: string;
    protocolReference?: string;
    pseudonymizationState?: ResearchPseudonymizationState;
  }) {
    const purpose = await this.prisma.researchDataPurpose.findUnique({
      where: { purposeCode: input.purposeCode },
    });
    if (!purpose) {
      throw new NotFoundException('Research purpose not found');
    }

    const dataset = await this.prisma.researchDataset.create({
      data: {
        datasetReference: input.datasetReference,
        purposeId: purpose.id,
        status: ResearchDatasetStatus.APPROVED,
        ethicsApprovalRef: input.ethicsApprovalRef,
        protocolReference: input.protocolReference,
        pseudonymizationState:
          input.pseudonymizationState ?? ResearchPseudonymizationState.PSEUDONYMIZED,
        claimsAnonymous: false,
        pseudonymizationRecords: {
          create: {
            state: input.pseudonymizationState ?? ResearchPseudonymizationState.PSEUDONYMIZED,
            directIdentifiersRemoved: true,
            provenanceSummary: { note: 'Provenance retained for pseudonymized dataset' },
          },
        },
      },
    });

    return dataset;
  }

  async grantResearchAccess(input: {
    datasetId: string;
    approvalReference: string;
    grantReference: string;
    researcherIdentityId: string;
    expiresAt: Date;
  }) {
    const useRequest = await this.prisma.researchDataUseRequest.create({
      data: {
        requestReference: `${input.grantReference}-request`,
        datasetId: input.datasetId,
        requesterIdentityId: input.researcherIdentityId,
        purposeSummary: 'Approved research access',
        status: 'APPROVED',
      },
    });

    const approval = await this.prisma.researchDataUseApproval.create({
      data: {
        useRequestId: useRequest.id,
        approvalReference: input.approvalReference,
        expiresAt: input.expiresAt,
      },
    });

    return this.prisma.researchDataAccessGrant.create({
      data: {
        grantReference: input.grantReference,
        datasetId: input.datasetId,
        approvalId: approval.id,
        researcherIdentityId: input.researcherIdentityId,
        status: ResearchDataAccessGrantStatus.ACTIVE,
        grantedAt: new Date(),
        expiresAt: input.expiresAt,
      },
    });
  }

  async assertResearcherDatasetAccess(actor: ActorContext, grantId: string): Promise<void> {
    const grant = await this.prisma.researchDataAccessGrant.findUnique({
      where: { id: grantId },
      include: { dataset: true },
    });
    if (grant?.researcherIdentityId !== actor.identityId) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.ARBITRARY_PATIENT_BROWSE_DENIED);
    }
    if (grant.status !== ResearchDataAccessGrantStatus.ACTIVE) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.RESEARCH_ACCESS_EXPIRED);
    }
    if (grant.expiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.RESEARCH_ACCESS_EXPIRED);
    }
  }

  async listDatasetRecordsForResearcher(actor: ActorContext, grantId: string) {
    await this.assertResearcherDatasetAccess(actor, grantId);
    const grant = await this.prisma.researchDataAccessGrant.findUniqueOrThrow({
      where: { id: grantId },
    });

    const version = await this.prisma.researchDatasetVersion.findFirst({
      where: { datasetId: grant.datasetId },
      orderBy: { versionNumber: 'desc' },
      include: {
        recordLinks: { include: { recordReference: true } },
      },
    });

    return version?.recordLinks.map((link) => link.recordReference) ?? [];
  }

  async assertResearcherCannotBrowseArbitraryPatient(
    actor: ActorContext,
    patientReferenceId: string,
    grantId: string,
  ): Promise<void> {
    await this.assertResearcherDatasetAccess(actor, grantId);
    const allowedRecords = await this.listDatasetRecordsForResearcher(actor, grantId);
    const allowed = allowedRecords.some(
      (record) => record.patientReferenceId === patientReferenceId,
    );
    if (!allowed) {
      throw new ForbiddenException(HEALTHCARE_REASON_CODES.ARBITRARY_PATIENT_BROWSE_DENIED);
    }
  }
}

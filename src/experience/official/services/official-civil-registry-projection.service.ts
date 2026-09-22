import { Injectable } from '@nestjs/common';
import {
  CivilRegistryCertificateStatus,
  CivilRegistryRecordStatus,
  CivilRegistrySubmissionStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../types/official-context.types';
import { OfficialScopeService } from './official-scope.service';

export interface OfficialCivilRegistryWorkspaceProjection {
  pendingRegistrations: { count: number; submissionIds: string[] };
  evidenceDeficiencies: { count: number; caseIds: string[] };
  correctionRequests: { count: number; caseIds: string[] };
  decisionReadyRegistrations: { count: number; recordIds: string[] };
  certificateIssuanceQueue: { count: number; certificateIds: string[] };
  recordAmendmentRequests: { count: number; recordIds: string[] };
  slaRisks: { count: number; caseIds: string[] };
  restrictedOrSealedWarnings: { count: number; recordIds: string[] };
  templateDisclaimer: string;
}

@Injectable()
export class OfficialCivilRegistryProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: OfficialScopeService,
  ) {}

  async buildProjection(
    context: ResolvedOfficialContext,
  ): Promise<OfficialCivilRegistryWorkspaceProjection> {
    const scopeFilter = this.scopeService.buildCaseScopeFilter(context);
    const scopedCaseIds = (
      await this.prisma.case.findMany({
        where: scopeFilter,
        select: { id: true },
        take: 500,
      })
    ).map((caseRecord) => caseRecord.id);

    if (scopedCaseIds.length === 0) {
      return this.emptyProjection();
    }

    const pendingSubmissions = await this.prisma.civilRegistryEventSubmission.findMany({
      where: {
        caseId: { in: scopedCaseIds },
        status: {
          in: [CivilRegistrySubmissionStatus.SUBMITTED, CivilRegistrySubmissionStatus.UNDER_REVIEW],
        },
      },
      select: { id: true, caseId: true },
    });

    const decisionReadyRecords = await this.prisma.civilRegistryVitalRecord.findMany({
      where: {
        registrationCaseId: { in: scopedCaseIds },
        status: CivilRegistryRecordStatus.SUBMISSION_PENDING,
      },
      select: { id: true, registrationCaseId: true },
    });

    const certificateQueue = await this.prisma.civilRegistryCertificate.findMany({
      where: {
        status: CivilRegistryCertificateStatus.PENDING_ISSUANCE,
        OR: [
          { issuanceCaseId: { in: scopedCaseIds } },
          { vitalRecord: { registrationCaseId: { in: scopedCaseIds } } },
        ],
      },
      select: { id: true },
    });

    const correctionCases = await this.prisma.case.findMany({
      where: {
        id: { in: scopedCaseIds },
        governmentService: {
          slug: { contains: 'correction' },
        },
      },
      select: { id: true },
    });

    const sealedOrRestricted = await this.prisma.civilRegistryVitalRecord.findMany({
      where: {
        registrationCaseId: { in: scopedCaseIds },
        OR: [{ isSealed: true }, { isRestricted: true }],
      },
      select: { id: true },
    });

    const slaRiskCases = await this.prisma.caseSlaClock.findMany({
      where: {
        caseId: { in: scopedCaseIds },
        status: { in: ['RUNNING', 'BREACHED'] },
      },
      select: { caseId: true },
      take: 50,
    });

    const deficiencyCases = await this.prisma.applicantInformationRequest.findMany({
      where: {
        status: 'ISSUED',
        applicationSubmission: {
          application: {
            case: { id: { in: scopedCaseIds } },
          },
        },
      },
      select: {
        applicationSubmission: {
          select: { application: { select: { case: { select: { id: true } } } } },
        },
      },
      take: 50,
    });

    return {
      pendingRegistrations: {
        count: pendingSubmissions.length,
        submissionIds: pendingSubmissions.map((item) => item.id),
      },
      evidenceDeficiencies: {
        count: deficiencyCases.length,
        caseIds: deficiencyCases
          .map((item) => item.applicationSubmission.application.case?.id)
          .filter((id): id is string => Boolean(id)),
      },
      correctionRequests: {
        count: correctionCases.length,
        caseIds: correctionCases.map((item) => item.id),
      },
      decisionReadyRegistrations: {
        count: decisionReadyRecords.length,
        recordIds: decisionReadyRecords.map((item) => item.id),
      },
      certificateIssuanceQueue: {
        count: certificateQueue.length,
        certificateIds: certificateQueue.map((item) => item.id),
      },
      recordAmendmentRequests: {
        count: correctionCases.length,
        recordIds: decisionReadyRecords.map((item) => item.id),
      },
      slaRisks: {
        count: slaRiskCases.length,
        caseIds: [...new Set(slaRiskCases.map((item) => item.caseId))],
      },
      restrictedOrSealedWarnings: {
        count: sealedOrRestricted.length,
        recordIds: sealedOrRestricted.map((item) => item.id),
      },
      templateDisclaimer:
        'NON_PRODUCTION civil registry workspace indicators — not verified law or policy.',
    };
  }

  private emptyProjection(): OfficialCivilRegistryWorkspaceProjection {
    return {
      pendingRegistrations: { count: 0, submissionIds: [] },
      evidenceDeficiencies: { count: 0, caseIds: [] },
      correctionRequests: { count: 0, caseIds: [] },
      decisionReadyRegistrations: { count: 0, recordIds: [] },
      certificateIssuanceQueue: { count: 0, certificateIds: [] },
      recordAmendmentRequests: { count: 0, recordIds: [] },
      slaRisks: { count: 0, caseIds: [] },
      restrictedOrSealedWarnings: { count: 0, recordIds: [] },
      templateDisclaimer:
        'NON_PRODUCTION civil registry workspace indicators — not verified law or policy.',
    };
  }
}

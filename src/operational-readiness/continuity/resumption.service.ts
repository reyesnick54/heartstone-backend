import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  ContinuityEvent,
  ContinuityEventStatus,
  ContinuityOperatingMode,
  ResumptionAuthorization,
  ResumptionAuthorizationStatus,
  ResumptionReadinessAssessment,
  ResumptionReadinessStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import {
  RESUMPTION_ASSESSMENT_PREFIX,
  RESUMPTION_AUTH_PREFIX,
} from '../business-continuity.constants';
import { BusinessContinuityBoundaryService } from '../common/business-continuity-boundary.service';

export interface CreateResumptionReadinessAssessmentInput {
  continuityEventId: string;
  technicalRecommenderIdentityId: string;
  technicalRecommendationNotes: string;
  technicalRecoveryComplete?: boolean;
  evaluations?: Partial<Record<string, { evaluated: boolean; notes?: string }>>;
}

export interface AuthorizeResumptionInput {
  resumptionReadinessAssessmentId: string;
  authorizingOfficeholderId: string;
  authorizingIdentityId: string;
  functionAuthorityRecordId: string;
  appointmentId: string;
  delegationId?: string;
  expiresAt?: Date;
}

@Injectable()
export class ResumptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: BusinessContinuityBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async createReadinessAssessment(
    input: CreateResumptionReadinessAssessmentInput,
  ): Promise<ResumptionReadinessAssessment> {
    this.boundary.rejectClientResumptionFields(input as unknown as Record<string, unknown>);
    await this.getEventOrThrow(input.continuityEventId);

    const count = await this.prisma.resumptionReadinessAssessment.count();
    const assessmentReference = `${RESUMPTION_ASSESSMENT_PREFIX}-${String(count + 1).padStart(6, '0')}`;

    const evaluations = input.evaluations ?? {};

    return this.prisma.resumptionReadinessAssessment.create({
      data: {
        assessmentReference,
        continuityEventId: input.continuityEventId,
        identityTrustEvaluated: evaluations.identityTrust?.evaluated ?? false,
        identityTrustNotes: evaluations.identityTrust?.notes,
        authorityEvaluated: evaluations.authority?.evaluated ?? false,
        authorityNotes: evaluations.authority?.notes,
        recordIntegrityEvaluated: evaluations.recordIntegrity?.evaluated ?? false,
        recordIntegrityNotes: evaluations.recordIntegrity?.notes,
        securityPostureEvaluated: evaluations.securityPosture?.evaluated ?? false,
        securityPostureNotes: evaluations.securityPosture?.notes,
        dependenciesEvaluated: evaluations.dependencies?.evaluated ?? false,
        dependenciesNotes: evaluations.dependencies?.notes,
        requiredPersonnelEvaluated: evaluations.requiredPersonnel?.evaluated ?? false,
        requiredPersonnelNotes: evaluations.requiredPersonnel?.notes,
        dataStateEvaluated: evaluations.dataState?.evaluated ?? false,
        dataStateNotes: evaluations.dataState?.notes,
        integrationsEvaluated: evaluations.integrations?.evaluated ?? false,
        integrationsNotes: evaluations.integrations?.notes,
        backlogEvaluated: evaluations.backlog?.evaluated ?? false,
        backlogNotes: evaluations.backlog?.notes,
        knownDefectsEvaluated: evaluations.knownDefects?.evaluated ?? false,
        knownDefectsNotes: evaluations.knownDefects?.notes,
        residualRiskEvaluated: evaluations.residualRisk?.evaluated ?? false,
        residualRiskNotes: evaluations.residualRisk?.notes,
        monitoringEvaluated: evaluations.monitoring?.evaluated ?? false,
        monitoringNotes: evaluations.monitoring?.notes,
        fallbackEvaluated: evaluations.fallback?.evaluated ?? false,
        fallbackNotes: evaluations.fallback?.notes,
        overallStatus: ResumptionReadinessStatus.UNDER_REVIEW,
        technicalRecommendationNotes: input.technicalRecommendationNotes,
        technicalRecommenderIdentityId: input.technicalRecommenderIdentityId,
        technicalRecoveryComplete: input.technicalRecoveryComplete ?? false,
      },
    });
  }

  async markReadyForAuthorization(assessmentId: string): Promise<ResumptionReadinessAssessment> {
    const assessment = await this.getAssessmentOrThrow(assessmentId);

    return this.prisma.resumptionReadinessAssessment.update({
      where: { id: assessment.id },
      data: { overallStatus: ResumptionReadinessStatus.READY_FOR_AUTHORIZATION },
    });
  }

  async authorizeResumption(input: AuthorizeResumptionInput): Promise<ResumptionAuthorization> {
    const assessment = await this.getAssessmentOrThrow(input.resumptionReadinessAssessmentId);

    this.boundary.assertNamedInstitutionalActorPresent(
      input.authorizingOfficeholderId,
      input.authorizingIdentityId,
    );

    if (assessment.overallStatus !== ResumptionReadinessStatus.READY_FOR_AUTHORIZATION) {
      throw new ForbiddenException(
        'Resumption readiness assessment must be READY_FOR_AUTHORIZATION before institutional authorization',
      );
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.authorizingIdentityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: input.authorizingOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Institutional resumption authorization denied');
    }

    const count = await this.prisma.resumptionAuthorization.count();
    const authorizationReference = `${RESUMPTION_AUTH_PREFIX}-${String(count + 1).padStart(6, '0')}`;

    const authorization = await this.prisma.resumptionAuthorization.create({
      data: {
        authorizationReference,
        resumptionReadinessAssessmentId: assessment.id,
        authorizingOfficeholderId: input.authorizingOfficeholderId,
        authorizingIdentityId: input.authorizingIdentityId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        appointmentId: input.appointmentId,
        delegationId: input.delegationId,
        status: ResumptionAuthorizationStatus.GRANTED,
        authorizedAt: new Date(),
        expiresAt: input.expiresAt,
      },
    });

    await this.prisma.resumptionReadinessAssessment.update({
      where: { id: assessment.id },
      data: { overallStatus: ResumptionReadinessStatus.AUTHORIZED },
    });

    await this.prisma.continuityEvent.update({
      where: { id: assessment.continuityEventId },
      data: {
        institutionalResumptionAt: new Date(),
        operatingMode: ContinuityOperatingMode.NORMAL,
        status: ContinuityEventStatus.RESOLVED,
      },
    });

    return authorization;
  }

  assertInstitutionalResumptionRequired(
    authorization: ResumptionAuthorization | null | undefined,
  ): void {
    this.boundary.assertInstitutionalResumptionAuthorizationRequired(authorization?.status);
  }

  rejectTechnicalAutoResumption(autoResumeRequested: boolean): void {
    this.boundary.assertTechnicalRecoveryCannotResumeAutomatically(autoResumeRequested);
  }

  async getAssessmentOrThrow(id: string): Promise<ResumptionReadinessAssessment> {
    const assessment = await this.prisma.resumptionReadinessAssessment.findUnique({
      where: { id },
    });
    if (!assessment) {
      throw new NotFoundException(`ResumptionReadinessAssessment ${id} not found`);
    }
    return assessment;
  }

  async getEventOrThrow(id: string): Promise<ContinuityEvent> {
    const event = await this.prisma.continuityEvent.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`ContinuityEvent ${id} not found`);
    }
    return event;
  }
}

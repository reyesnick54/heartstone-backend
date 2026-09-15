import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  ManualDigitalReconciliation,
  ManualDigitalReconciliationStatus,
  ManualOperationAuthorization,
  ManualOperationAuthorizationStatus,
  ManualOperationProcedure,
  ManualOperationProcedureStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import {
  MANUAL_OPERATION_AUTH_PREFIX,
  RECONCILIATION_PREFIX,
} from '../business-continuity.constants';
import { BusinessContinuityBoundaryService } from '../common/business-continuity-boundary.service';

export interface CreateManualOperationProcedureInput {
  procedureCode: string;
  title: string;
  description: string;
  segregationOfDutiesRequirements: string;
  evidenceRequirements: string;
  financialControlRequirements: string;
}

export interface AuthorizeManualOperationInput {
  manualOperationProcedureId: string;
  continuityEventId?: string;
  authorizedByOfficeholderId: string;
  authorizedByIdentityId: string;
  functionAuthorityRecordId: string;
  appointmentId: string;
  delegationId?: string;
  actorIdentityId: string;
  segregatedApproverIdentityId: string;
  emergencyAuthorityReference?: string;
  expiresAt: Date;
  bypassAuthority?: boolean;
  sharedCredentialUseDetected?: boolean;
}

export interface ReconcileManualToDigitalInput {
  manualRecordReference: string;
  digitizedRepresentationReference: string;
  reconcilerIdentityId: string;
  comparisonNotes: string;
  discrepancyDescription?: string;
  correctionNotes?: string;
  verificationNotes?: string;
  auditLinkReference?: string;
  overwriteManualOriginal?: boolean;
}

@Injectable()
export class ManualOperationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: BusinessContinuityBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async createProcedure(
    input: CreateManualOperationProcedureInput,
  ): Promise<ManualOperationProcedure> {
    return this.prisma.manualOperationProcedure.create({
      data: {
        procedureCode: input.procedureCode,
        title: input.title,
        description: input.description,
        segregationOfDutiesRequirements: input.segregationOfDutiesRequirements,
        evidenceRequirements: input.evidenceRequirements,
        financialControlRequirements: input.financialControlRequirements,
        status: ManualOperationProcedureStatus.DRAFT,
      },
    });
  }

  async authorizeManualOperation(
    input: AuthorizeManualOperationInput,
  ): Promise<ManualOperationAuthorization> {
    this.boundary.assertManualOperationNotAuthorityBypass(input.bypassAuthority ?? false);
    this.boundary.assertEmergencyCredentialNotShared(input.sharedCredentialUseDetected ?? false);
    this.boundary.assertEmergencyAuthorityIsTimeBounded(input.expiresAt);
    this.boundary.assertEmergencyAuthorityNotExpired(input.expiresAt);
    this.boundary.assertManualOperationSegregation(
      input.actorIdentityId,
      input.authorizedByIdentityId,
      input.segregatedApproverIdentityId,
    );
    this.boundary.assertNamedInstitutionalActorPresent(
      input.authorizedByOfficeholderId,
      input.authorizedByIdentityId,
    );

    await this.getProcedureOrThrow(input.manualOperationProcedureId);

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.authorizedByIdentityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: input.authorizedByOfficeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException('Manual operation authorization denied by authority evaluation');
    }

    const count = await this.prisma.manualOperationAuthorization.count();
    const authorizationReference = `${MANUAL_OPERATION_AUTH_PREFIX}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.manualOperationAuthorization.create({
      data: {
        authorizationReference,
        manualOperationProcedureId: input.manualOperationProcedureId,
        continuityEventId: input.continuityEventId,
        authorizedByOfficeholderId: input.authorizedByOfficeholderId,
        authorizedByIdentityId: input.authorizedByIdentityId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        appointmentId: input.appointmentId,
        delegationId: input.delegationId,
        actorIdentityId: input.actorIdentityId,
        segregatedApproverIdentityId: input.segregatedApproverIdentityId,
        emergencyAuthorityReference: input.emergencyAuthorityReference,
        expiresAt: input.expiresAt,
        status: ManualOperationAuthorizationStatus.AUTHORIZED,
      },
    });
  }

  async activateAuthorization(
    authorizationId: string,
    at: Date = new Date(),
  ): Promise<ManualOperationAuthorization> {
    const authorization = await this.getAuthorizationOrThrow(authorizationId);
    this.boundary.assertEmergencyAuthorityCannotSilentlyContinue(
      authorization.status,
      authorization.expiresAt,
      at,
    );

    return this.prisma.manualOperationAuthorization.update({
      where: { id: authorizationId },
      data: { status: ManualOperationAuthorizationStatus.ACTIVE },
    });
  }

  async reconcileManualToDigital(
    input: ReconcileManualToDigitalInput,
  ): Promise<ManualDigitalReconciliation> {
    this.boundary.assertManualOriginalPreserved(!(input.overwriteManualOriginal ?? false));

    const count = await this.prisma.manualDigitalReconciliation.count();
    const reconciliationReference = `${RECONCILIATION_PREFIX}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.manualDigitalReconciliation.create({
      data: {
        reconciliationReference,
        manualRecordReference: input.manualRecordReference,
        digitizedRepresentationReference: input.digitizedRepresentationReference,
        reconcilerIdentityId: input.reconcilerIdentityId,
        comparisonNotes: input.comparisonNotes,
        discrepancyDescription: input.discrepancyDescription,
        correctionNotes: input.correctionNotes,
        verificationNotes: input.verificationNotes,
        auditLinkReference: input.auditLinkReference,
        manualOriginalPreserved: true,
        status: input.discrepancyDescription
          ? ManualDigitalReconciliationStatus.DISCREPANCY_FOUND
          : ManualDigitalReconciliationStatus.RECONCILED,
      },
    });
  }

  async getProcedureOrThrow(id: string): Promise<ManualOperationProcedure> {
    const procedure = await this.prisma.manualOperationProcedure.findUnique({ where: { id } });
    if (!procedure) {
      throw new NotFoundException(`ManualOperationProcedure ${id} not found`);
    }
    return procedure;
  }

  async getAuthorizationOrThrow(id: string): Promise<ManualOperationAuthorization> {
    const authorization = await this.prisma.manualOperationAuthorization.findUnique({
      where: { id },
    });
    if (!authorization) {
      throw new NotFoundException(`ManualOperationAuthorization ${id} not found`);
    }
    return authorization;
  }
}

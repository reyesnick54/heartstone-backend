import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  IdentityType,
  ServiceActivationOutcome,
  ServiceReadinessLevel,
  ServiceTestReadinessStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import {
  type ServiceActivationRequest,
  type ServiceActivationResult,
  type ServiceSupersessionRequest,
  type ServiceSuspensionRequest,
} from './service-activation.types';
import { SERVICE_ACTIVATION_BASIS } from './service-catalog-governance.constants';
import { ServiceReadinessService } from './service-readiness.service';

@Injectable()
export class ServiceActivationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readinessService: ServiceReadinessService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async recordInstitutionalAcceptance(
    request: ServiceActivationRequest,
  ): Promise<ServiceActivationResult> {
    const version = await this.loadVersion(request.governmentServiceVersionId);
    const readiness = await this.readinessService.assessReadiness(
      request.governmentServiceVersionId,
      request.effectiveAt ?? new Date(),
    );

    if (!readiness.technicallyReady) {
      return this.blockedResult(
        version,
        ServiceActivationOutcome.REQUIRES_READINESS,
        'Institutional acceptance requires technical readiness',
      );
    }

    const authorityResult = await this.evaluateActivationAuthority(request, version);
    if (!authorityResult.allowed) {
      return authorityResult.result;
    }

    const effectiveAt = request.effectiveAt ?? new Date();
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.governmentServiceVersion.update({
        where: { id: version.id },
        data: {
          maturityStatus: GovernmentServiceMaturityStatus.ACCEPTED,
          institutionallyAccepted: true,
          institutionallyAcceptedAt: effectiveAt,
        },
      });

      return tx.serviceActivationRecord.create({
        data: {
          governmentServiceVersionId: version.id,
          priorMaturityStatus: version.maturityStatus,
          newMaturityStatus: GovernmentServiceMaturityStatus.ACCEPTED,
          priorPublicAvailability: version.publicAvailability,
          newPublicAvailability: version.publicAvailability,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          authorityEvaluationRecordId: authorityResult.evaluationRecordId,
          activationBasis: SERVICE_ACTIVATION_BASIS.INSTITUTIONAL_ACCEPTANCE,
          effectiveAt,
          scopeLimitations: request.scopeLimitations ?? [],
          reason: request.reason,
          outcome: ServiceActivationOutcome.ACTIVATED,
        },
      });
    });

    return {
      outcome: ServiceActivationOutcome.ACTIVATED,
      governmentServiceVersionId: version.id,
      priorMaturityStatus: version.maturityStatus,
      newMaturityStatus: GovernmentServiceMaturityStatus.ACCEPTED,
      priorPublicAvailability: version.publicAvailability,
      newPublicAvailability: version.publicAvailability,
      activationRecordId: record.id,
      authorityEvaluationRecordId: authorityResult.evaluationRecordId,
      message: 'Institutional acceptance recorded via authorized authority pathway',
    };
  }

  async activateOperationally(request: ServiceActivationRequest): Promise<ServiceActivationResult> {
    const version = await this.loadVersion(request.governmentServiceVersionId);
    const readiness = await this.readinessService.assessReadiness(
      request.governmentServiceVersionId,
      request.effectiveAt ?? new Date(),
    );

    if (readiness.achievedLevel !== ServiceReadinessLevel.INSTITUTIONALLY_ACCEPTED) {
      return this.blockedResult(
        version,
        ServiceActivationOutcome.REQUIRES_READINESS,
        'Operational activation requires institutional acceptance',
      );
    }

    const authorityResult = await this.evaluateActivationAuthority(request, version);
    if (!authorityResult.allowed) {
      return authorityResult.result;
    }

    const effectiveAt = request.effectiveAt ?? new Date();
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.governmentServiceVersion.update({
        where: { id: version.id },
        data: {
          maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
          publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
        },
      });

      return tx.serviceActivationRecord.create({
        data: {
          governmentServiceVersionId: version.id,
          priorMaturityStatus: version.maturityStatus,
          newMaturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
          priorPublicAvailability: version.publicAvailability,
          newPublicAvailability: GovernmentServicePublicAvailability.ACTIVE,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          authorityEvaluationRecordId: authorityResult.evaluationRecordId,
          activationBasis: SERVICE_ACTIVATION_BASIS.OPERATIONAL_ACTIVATION,
          effectiveAt,
          scopeLimitations: request.scopeLimitations ?? [],
          reason: request.reason,
          outcome: ServiceActivationOutcome.ACTIVATED,
        },
      });
    });

    return {
      outcome: ServiceActivationOutcome.ACTIVATED,
      governmentServiceVersionId: version.id,
      priorMaturityStatus: version.maturityStatus,
      newMaturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
      priorPublicAvailability: version.publicAvailability,
      newPublicAvailability: GovernmentServicePublicAvailability.ACTIVE,
      activationRecordId: record.id,
      authorityEvaluationRecordId: authorityResult.evaluationRecordId,
      message: 'Service version is operationally active',
    };
  }

  async activatePilot(request: ServiceActivationRequest): Promise<ServiceActivationResult> {
    const version = await this.loadVersion(request.governmentServiceVersionId);
    const readiness = await this.readinessService.assessReadiness(
      request.governmentServiceVersionId,
      request.effectiveAt ?? new Date(),
    );

    if (!readiness.technicallyReady) {
      return this.blockedResult(
        version,
        ServiceActivationOutcome.REQUIRES_READINESS,
        'Pilot activation requires technical readiness',
      );
    }

    if (!request.pilotScopeDescription?.trim()) {
      throw new BadRequestException(
        'Pilot activation requires an explicit pilot scope description',
      );
    }

    const authorityResult = await this.evaluateActivationAuthority(request, version);
    if (!authorityResult.allowed) {
      return authorityResult.result;
    }

    const effectiveAt = request.effectiveAt ?? new Date();
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.governmentServiceVersion.update({
        where: { id: version.id },
        data: {
          maturityStatus: GovernmentServiceMaturityStatus.ACCEPTED,
          publicAvailability: GovernmentServicePublicAvailability.PILOT_ONLY,
          pilotScopeDescription: request.pilotScopeDescription,
        },
      });

      return tx.serviceActivationRecord.create({
        data: {
          governmentServiceVersionId: version.id,
          priorMaturityStatus: version.maturityStatus,
          newMaturityStatus: GovernmentServiceMaturityStatus.ACCEPTED,
          priorPublicAvailability: version.publicAvailability,
          newPublicAvailability: GovernmentServicePublicAvailability.PILOT_ONLY,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          authorityEvaluationRecordId: authorityResult.evaluationRecordId,
          activationBasis: SERVICE_ACTIVATION_BASIS.PILOT_ACTIVATION,
          effectiveAt,
          scopeLimitations:
            request.scopeLimitations ??
            (request.pilotScopeDescription ? [request.pilotScopeDescription] : []),
          reason: request.reason,
          outcome: ServiceActivationOutcome.ACTIVATED,
        },
      });
    });

    return {
      outcome: ServiceActivationOutcome.ACTIVATED,
      governmentServiceVersionId: version.id,
      priorMaturityStatus: version.maturityStatus,
      newMaturityStatus: GovernmentServiceMaturityStatus.ACCEPTED,
      priorPublicAvailability: version.publicAvailability,
      newPublicAvailability: GovernmentServicePublicAvailability.PILOT_ONLY,
      activationRecordId: record.id,
      authorityEvaluationRecordId: authorityResult.evaluationRecordId,
      message: 'Service version activated for pilot scope only',
    };
  }

  async suspend(request: ServiceSuspensionRequest): Promise<ServiceActivationResult> {
    const version = await this.loadVersion(request.governmentServiceVersionId);

    if (
      version.maturityStatus !== GovernmentServiceMaturityStatus.ACTIVE &&
      version.maturityStatus !== GovernmentServiceMaturityStatus.ACCEPTED
    ) {
      throw new BadRequestException('Only active or accepted service versions can be suspended');
    }

    const authorityResult = await this.evaluateActivationAuthority(
      {
        governmentServiceVersionId: request.governmentServiceVersionId,
        actor: request.actor,
        reason: request.reason,
        effectiveAt: request.effectiveAt,
      },
      version,
    );
    if (!authorityResult.allowed) {
      return authorityResult.result;
    }

    const effectiveAt = request.effectiveAt ?? new Date();
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.governmentServiceVersion.update({
        where: { id: version.id },
        data: {
          maturityStatus: GovernmentServiceMaturityStatus.SUSPENDED,
          publicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
        },
      });

      return tx.serviceActivationRecord.create({
        data: {
          governmentServiceVersionId: version.id,
          priorMaturityStatus: version.maturityStatus,
          newMaturityStatus: GovernmentServiceMaturityStatus.SUSPENDED,
          priorPublicAvailability: version.publicAvailability,
          newPublicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          authorityEvaluationRecordId: authorityResult.evaluationRecordId,
          activationBasis: SERVICE_ACTIVATION_BASIS.SUSPENSION,
          effectiveAt,
          scopeLimitations: [],
          reason: request.reason,
          outcome: ServiceActivationOutcome.ACTIVATED,
        },
      });
    });

    return {
      outcome: ServiceActivationOutcome.ACTIVATED,
      governmentServiceVersionId: version.id,
      priorMaturityStatus: version.maturityStatus,
      newMaturityStatus: GovernmentServiceMaturityStatus.SUSPENDED,
      priorPublicAvailability: version.publicAvailability,
      newPublicAvailability: GovernmentServicePublicAvailability.SUSPENDED,
      activationRecordId: record.id,
      authorityEvaluationRecordId: authorityResult.evaluationRecordId,
      message: 'Service version suspended',
    };
  }

  async supersede(request: ServiceSupersessionRequest): Promise<ServiceActivationResult> {
    const priorVersion = await this.loadVersion(request.priorGovernmentServiceVersionId);
    const newVersion = await this.loadVersion(request.newGovernmentServiceVersionId);

    if (priorVersion.governmentServiceId !== newVersion.governmentServiceId) {
      throw new BadRequestException(
        'Supersession requires versions of the same government service',
      );
    }

    if (priorVersion.supersededByVersionId) {
      throw new BadRequestException('Prior service version is already superseded');
    }

    const effectiveAt = request.effectiveAt ?? new Date();
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.governmentServiceVersion.update({
        where: { id: priorVersion.id },
        data: {
          maturityStatus: GovernmentServiceMaturityStatus.SUPERSEDED,
          supersededByVersionId: newVersion.id,
          supersededAt: effectiveAt,
        },
      });

      return tx.serviceActivationRecord.create({
        data: {
          governmentServiceVersionId: priorVersion.id,
          priorMaturityStatus: priorVersion.maturityStatus,
          newMaturityStatus: GovernmentServiceMaturityStatus.SUPERSEDED,
          priorPublicAvailability: priorVersion.publicAvailability,
          newPublicAvailability: priorVersion.publicAvailability,
          actorIdentityId: request.actor.identityId,
          officeholderId: request.actor.officeholderId,
          activationBasis: SERVICE_ACTIVATION_BASIS.SUPERSESSION,
          effectiveAt,
          scopeLimitations: [`supersededByVersionId:${newVersion.id}`],
          reason: request.reason,
          outcome: ServiceActivationOutcome.ACTIVATED,
        },
      });
    });

    return {
      outcome: ServiceActivationOutcome.ACTIVATED,
      governmentServiceVersionId: priorVersion.id,
      priorMaturityStatus: priorVersion.maturityStatus,
      newMaturityStatus: GovernmentServiceMaturityStatus.SUPERSEDED,
      priorPublicAvailability: priorVersion.publicAvailability,
      newPublicAvailability: priorVersion.publicAvailability,
      activationRecordId: record.id,
      message: 'Prior service version superseded without erasure',
    };
  }

  async markTechnicalTestsPassed(governmentServiceVersionId: string): Promise<void> {
    const version = await this.loadVersion(governmentServiceVersionId);
    await this.prisma.governmentServiceVersion.update({
      where: { id: version.id },
      data: {
        testReadinessStatus: ServiceTestReadinessStatus.TECHNICAL_TESTS_PASSED,
        maturityStatus: GovernmentServiceMaturityStatus.TESTED,
      },
    });
  }

  private async evaluateActivationAuthority(
    request: ServiceActivationRequest,
    version: Awaited<ReturnType<typeof this.loadVersion>>,
  ): Promise<
    | { allowed: true; evaluationRecordId?: string }
    | { allowed: false; result: ServiceActivationResult }
  > {
    if (!version.activationFunctionAuthorityRecordId) {
      return {
        allowed: false,
        result: this.blockedResult(
          version,
          ServiceActivationOutcome.REQUIRES_CONFIGURATION,
          'No activation-authority FunctionAuthorityRecord is configured',
        ),
      };
    }

    const identity = await this.prisma.identity.findUnique({
      where: { id: request.actor.identityId },
    });
    if (!identity) {
      throw new NotFoundException(`Identity "${request.actor.identityId}" was not found`);
    }
    if (identity.type !== IdentityType.INDIVIDUAL) {
      throw new ForbiddenException(
        'Service activation requires an authorized human institutional actor',
      );
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: request.actor.identityId,
      functionAuthorityRecordId: version.activationFunctionAuthorityRecordId,
      action: AuthorityActionType.APPROVE,
      officeholderId: request.actor.officeholderId,
      officeId: request.actor.officeId,
      appointmentId: request.actor.appointmentId,
      delegationId: request.actor.delegationId,
      at: request.effectiveAt,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      return {
        allowed: false,
        result: this.blockedResult(
          version,
          ServiceActivationOutcome.DENIED,
          'Institutional authority evaluation denied activation',
          evaluation.evaluationId,
        ),
      };
    }

    return { allowed: true, evaluationRecordId: evaluation.evaluationId };
  }

  private blockedResult(
    version: Awaited<ReturnType<typeof this.loadVersion>>,
    outcome: ServiceActivationOutcome,
    message: string,
    authorityEvaluationRecordId?: string,
  ): ServiceActivationResult {
    return {
      outcome,
      governmentServiceVersionId: version.id,
      priorMaturityStatus: version.maturityStatus,
      newMaturityStatus: version.maturityStatus,
      priorPublicAvailability: version.publicAvailability,
      newPublicAvailability: version.publicAvailability,
      authorityEvaluationRecordId,
      message,
    };
  }

  private async loadVersion(governmentServiceVersionId: string) {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: governmentServiceVersionId },
    });
    if (!version) {
      throw new NotFoundException(
        `GovernmentServiceVersion "${governmentServiceVersionId}" was not found`,
      );
    }
    return version;
  }
}

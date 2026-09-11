import { Injectable } from '@nestjs/common';
import {
  AuthorityDependencyBlockingStatus,
  AuthorityDependencyStatus,
  AuthorityDependencyType,
  ExternalDeterminationStatus,
  IdentityType,
  InstitutionalActType,
  ProfessionalAttestationSource,
  RetainedNationalDeterminationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { type AuthorityExplanationCode } from '../authority.constants';
import { isEffectiveAt } from '../common/effective-period.util';

interface DependencyRecord {
  id: string;
  dependencyType: AuthorityDependencyType;
  externalAuthorityId: string | null;
  blockingStatus: AuthorityDependencyBlockingStatus;
  status: AuthorityDependencyStatus;
  effectiveFrom: Date | null;
  effectiveUntil: Date | null;
  configuration: unknown;
}

interface EvaluationContext {
  identityType: IdentityType;
  externalDataAccessOnly?: boolean;
  attestationSource?: ProfessionalAttestationSource;
  at?: Date;
}

@Injectable()
export class AuthorityDependencyEvaluator {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    functionAuthorityRecordId: string,
    dependencies: DependencyRecord[],
    context: EvaluationContext,
  ): Promise<AuthorityExplanationCode[]> {
    const failures: AuthorityExplanationCode[] = [];
    const at = context.at ?? new Date();

    const institutionalActs = await this.prisma.institutionalAuthorityAct.findMany({
      where: { functionAuthorityRecordId },
      orderBy: { performedAt: 'desc' },
    });

    for (const dependency of dependencies) {
      if (dependency.status !== AuthorityDependencyStatus.ACTIVE) {
        continue;
      }

      if (
        dependency.effectiveFrom &&
        !isEffectiveAt(
          { effectiveFrom: dependency.effectiveFrom, effectiveUntil: dependency.effectiveUntil },
          at,
        )
      ) {
        continue;
      }

      const config = (dependency.configuration ?? {}) as Record<string, unknown>;
      const failure = await this.evaluateDependency(
        functionAuthorityRecordId,
        dependency,
        config,
        context,
        institutionalActs,
        at,
      );

      if (failure) {
        failures.push(failure);
      }
    }

    return failures;
  }

  hasBlockingFailures(
    dependencies: Pick<DependencyRecord, 'dependencyType' | 'blockingStatus'>[],
    failureCodes: AuthorityExplanationCode[],
  ): boolean {
    const blockingTypes = new Set(
      dependencies
        .filter((dep) => dep.blockingStatus === AuthorityDependencyBlockingStatus.BLOCKING)
        .map((dep) => dep.dependencyType),
    );

    return failureCodes.some((code) => {
      if (code === AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_RETAINED_NATIONAL_DETERMINATION) {
        return true;
      }
      if (code === AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_GOVERNMENT_CONCURRENCE) {
        return blockingTypes.has(AuthorityDependencyType.GOVERNMENT_CONCURRENCE);
      }
      if (code === AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_MANDATORY_CONSULTATION) {
        return blockingTypes.has(AuthorityDependencyType.MANDATORY_CONSULTATION);
      }
      if (code === AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_SHARED_COORDINATED_ACTION) {
        return blockingTypes.has(AuthorityDependencyType.SHARED_COORDINATED_ACTION);
      }
      if (code === AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_SATISFY_PROFESSIONAL) {
        return blockingTypes.has(AuthorityDependencyType.PROFESSIONAL_REVIEW);
      }
      return (
        code !== AUTHORITY_EVALUATION_EXPLANATION_CODES.SUPERVISION_NOT_APPROVAL &&
        code !== AUTHORITY_EVALUATION_EXPLANATION_CODES.LIAISON_NOT_DELEGATION &&
        code !== AUTHORITY_EVALUATION_EXPLANATION_CODES.EXTERNAL_DATA_NOT_DECISION_RIGHT
      );
    });
  }

  private async evaluateDependency(
    functionAuthorityRecordId: string,
    dependency: DependencyRecord,
    config: Record<string, unknown>,
    context: EvaluationContext,
    institutionalActs: { actType: InstitutionalActType; institutionId: string | null; externalAuthorityId: string | null }[],
    at: Date,
  ): Promise<AuthorityExplanationCode | null> {
    switch (dependency.dependencyType) {
      case AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION:
      case AuthorityDependencyType.EXPRESSLY_RETAINED_NATIONAL_DETERMINATION:
        return this.evaluateRetainedNational(functionAuthorityRecordId, dependency, at);
      case AuthorityDependencyType.PROFESSIONAL_QUALIFICATION:
      case AuthorityDependencyType.PROFESSIONAL_REVIEW:
        return this.evaluateProfessionalReview(dependency, config, context);
      case AuthorityDependencyType.EXTERNAL_DATA_ACCESS:
        return context.externalDataAccessOnly
          ? AUTHORITY_EVALUATION_EXPLANATION_CODES.EXTERNAL_DATA_NOT_DECISION_RIGHT
          : null;
      case AuthorityDependencyType.GOVERNMENT_CONCURRENCE:
        return this.evaluateGovernmentConcurrence(dependency, institutionalActs, at);
      case AuthorityDependencyType.MANDATORY_CONSULTATION:
        return this.evaluateMandatoryConsultation(institutionalActs);
      case AuthorityDependencyType.SUPERVISORY_REVIEW:
        if (dependency.blockingStatus === AuthorityDependencyBlockingStatus.NON_BLOCKING) {
          return null;
        }
        return this.evaluateSupervisoryReview(institutionalActs);
      case AuthorityDependencyType.LIAISON:
        if (dependency.blockingStatus === AuthorityDependencyBlockingStatus.NON_BLOCKING) {
          return null;
        }
        return this.evaluateLiaison(institutionalActs);
      case AuthorityDependencyType.SHARED_COORDINATED_ACTION:
        return this.evaluateSharedCoordinated(institutionalActs);
      case AuthorityDependencyType.OTHER_AUTHENTICATED_DEPENDENCY:
      case AuthorityDependencyType.INSPECTION_DEPENDENCY:
        return this.evaluateAuthenticatedDetermination(dependency.id, dependency.externalAuthorityId, at);
      default:
        return null;
    }
  }

  private async evaluateRetainedNational(
    functionAuthorityRecordId: string,
    dependency: DependencyRecord,
    at: Date,
  ): Promise<AuthorityExplanationCode | null> {
    const externalDetermination = await this.prisma.externalDependencyDetermination.findFirst({
      where: { authorityDependencyId: dependency.id },
      orderBy: { receivedAt: 'desc' },
    });

    if (
      externalDetermination &&
      this.isExternalDeterminationValid(externalDetermination, dependency.externalAuthorityId, at)
    ) {
      return null;
    }

    const determination = await this.prisma.retainedNationalDetermination.findFirst({
      where: {
        functionAuthorityRecordId,
        status: RetainedNationalDeterminationStatus.ACTIVE,
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (
      determination &&
      isEffectiveAt(
        { effectiveFrom: determination.effectiveFrom, effectiveUntil: determination.effectiveUntil },
        at,
      )
    ) {
      return null;
    }

    return AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_RETAINED_NATIONAL_DETERMINATION;
  }

  private evaluateProfessionalReview(
    dependency: DependencyRecord,
    config: Record<string, unknown>,
    context: EvaluationContext,
  ): AuthorityExplanationCode | null {
    if (context.attestationSource === ProfessionalAttestationSource.AI_ASSISTANCE) {
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_SATISFY_PROFESSIONAL;
    }

    if (context.attestationSource === ProfessionalAttestationSource.ADMINISTRATOR) {
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.ADMINISTRATOR_CANNOT_SATISFY_PROFESSIONAL;
    }

    if (context.identityType === IdentityType.SERVICE) {
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_SATISFY_PROFESSIONAL;
    }

    if (context.attestationSource === ProfessionalAttestationSource.QUALIFIED_PROFESSIONAL) {
      return null;
    }

    const required = (config.requiredQualifications as string[] | undefined) ?? [];
    if (required.length === 0 && dependency.dependencyType === AuthorityDependencyType.PROFESSIONAL_QUALIFICATION) {
      return null;
    }

    return AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_PROFESSIONAL_REVIEW;
  }

  private async evaluateGovernmentConcurrence(
    dependency: DependencyRecord,
    institutionalActs: { actType: InstitutionalActType }[],
    at: Date,
  ): Promise<AuthorityExplanationCode | null> {
    const concurrenceActs = institutionalActs.filter(
      (act) => act.actType === InstitutionalActType.CONCURRENCE,
    );
    if (concurrenceActs.length > 0) {
      return null;
    }

    const consultationActs = institutionalActs.filter(
      (act) => act.actType === InstitutionalActType.CONSULTATION,
    );
    if (consultationActs.length > 0) {
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.CONSULTATION_NOT_CONCURRENCE;
    }

    const externalValid = await this.hasValidExternalDetermination(
      dependency.id,
      dependency.externalAuthorityId,
      at,
    );
    if (externalValid) {
      return null;
    }

    return AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_GOVERNMENT_CONCURRENCE;
  }

  private evaluateMandatoryConsultation(
    institutionalActs: { actType: InstitutionalActType }[],
  ): AuthorityExplanationCode | null {
    const consultationActs = institutionalActs.filter(
      (act) => act.actType === InstitutionalActType.CONSULTATION,
    );
    if (consultationActs.length > 0) {
      return null;
    }

    const concurrenceActs = institutionalActs.filter(
      (act) => act.actType === InstitutionalActType.CONCURRENCE,
    );
    if (concurrenceActs.length > 0) {
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.CONSULTATION_NOT_CONCURRENCE;
    }

    return AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_MANDATORY_CONSULTATION;
  }

  private evaluateSupervisoryReview(
    institutionalActs: { actType: InstitutionalActType }[],
  ): AuthorityExplanationCode | null {
    const supervisionActs = institutionalActs.filter(
      (act) => act.actType === InstitutionalActType.SUPERVISION,
    );
    if (supervisionActs.length === 0) {
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.SUPERVISION_NOT_APPROVAL;
    }
    return null;
  }

  private evaluateLiaison(
    institutionalActs: { actType: InstitutionalActType }[],
  ): AuthorityExplanationCode | null {
    const liaisonActs = institutionalActs.filter(
      (act) => act.actType === InstitutionalActType.LIAISON,
    );
    if (liaisonActs.length === 0) {
      return AUTHORITY_EVALUATION_EXPLANATION_CODES.LIAISON_NOT_DELEGATION;
    }
    return null;
  }

  private evaluateSharedCoordinated(
    institutionalActs: {
      actType: InstitutionalActType;
      institutionId: string | null;
      externalAuthorityId: string | null;
    }[],
  ): AuthorityExplanationCode | null {
    const coordinatedActs = institutionalActs.filter(
      (act) => act.actType === InstitutionalActType.COORDINATED_ACTION,
    );
    const uniqueOwners = new Set(
      coordinatedActs.map((act) => act.institutionId ?? act.externalAuthorityId ?? 'unknown'),
    );

    if (coordinatedActs.length >= 2 && uniqueOwners.size >= 2) {
      return null;
    }

    return AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_SHARED_COORDINATED_ACTION;
  }

  private async evaluateAuthenticatedDetermination(
    dependencyId: string,
    competentAuthorityId: string | null,
    at: Date,
  ): Promise<AuthorityExplanationCode | null> {
    const valid = await this.hasValidExternalDetermination(dependencyId, competentAuthorityId, at);
    return valid ? null : AUTHORITY_EVALUATION_EXPLANATION_CODES.UNAUTHENTICATED_EXTERNAL_DETERMINATION;
  }

  private async hasValidExternalDetermination(
    dependencyId: string,
    competentAuthorityId: string | null,
    at: Date,
  ): Promise<boolean> {
    const determination = await this.prisma.externalDependencyDetermination.findFirst({
      where: { authorityDependencyId: dependencyId },
      orderBy: { receivedAt: 'desc' },
    });

    return (
      determination !== null &&
      this.isExternalDeterminationValid(determination, competentAuthorityId, at)
    );
  }

  private isExternalDeterminationValid(
    determination: {
      externalAuthorityId: string;
      determinationStatus: ExternalDeterminationStatus;
      isAuthenticated: boolean;
      expiryDate: Date | null;
    },
    competentAuthorityId: string | null,
    at: Date,
  ): boolean {
    if (!determination.isAuthenticated) {
      return false;
    }
    if (determination.determinationStatus !== ExternalDeterminationStatus.GRANTED) {
      return false;
    }
    if (determination.expiryDate && determination.expiryDate < at) {
      return false;
    }
    if (competentAuthorityId && determination.externalAuthorityId !== competentAuthorityId) {
      return false;
    }
    return true;
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityDependencyType,
  type CaseReferralResponse,
  CaseReferralResponseAuthStatus,
  CaseReferralResponseStatus,
  CaseReferralStatus,
  ExternalDeterminationStatus,
  InstitutionalActType,
} from '@prisma/client';

import { actTypeSatisfiesDependency } from '../../authority/common/dependency-semantics.util';
import { AuthorityDependenciesService } from '../../authority/dependencies/authority-dependencies.service';
import { PrismaService } from '../../database/prisma.service';
import { CASE_COORDINATION_EXPLANATION_CODES } from '../applications-workflow.constants';
import {
  consultationSatisfiesConcurrenceRequirement,
  externalResponseIsAbsezDecision,
} from '../common/referral-semantics.util';

export interface RecordCaseReferralResponseInput {
  referralId: string;
  responseReference: string;
  receivedAt: Date;
  sourceInstitutionId?: string;
  sourceExternalAuthorityId?: string;
  authenticatedStatus: CaseReferralResponseAuthStatus;
  status?: CaseReferralResponseStatus;
  determinationReference?: string;
  conditionsReference?: string;
  effectiveDate?: Date;
  expiryDate?: Date;
  summary?: string;
  recordReferences?: string[];
}

export interface DependencySatisfactionResult {
  satisfied: boolean;
  explanationCode: string;
  externalDependencyDeterminationId?: string;
}

@Injectable()
export class CaseReferralResponsesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityDependencies: AuthorityDependenciesService,
  ) {}

  async recordResponse(input: RecordCaseReferralResponseInput): Promise<CaseReferralResponse> {
    const referral = await this.prisma.caseReferral.findUnique({
      where: { id: input.referralId },
    });
    if (!referral) {
      throw new NotFoundException(`Case referral "${input.referralId}" was not found`);
    }

    const response = await this.prisma.caseReferralResponse.create({
      data: {
        referralId: input.referralId,
        responseReference: input.responseReference,
        receivedAt: input.receivedAt,
        sourceInstitutionId: input.sourceInstitutionId,
        sourceExternalAuthorityId: input.sourceExternalAuthorityId,
        authenticatedStatus: input.authenticatedStatus,
        status: input.status ?? CaseReferralResponseStatus.RECEIVED,
        determinationReference: input.determinationReference,
        conditionsReference: input.conditionsReference,
        effectiveDate: input.effectiveDate,
        expiryDate: input.expiryDate,
        summary: input.summary,
        recordReferences: input.recordReferences ?? [],
      },
    });

    await this.prisma.caseReferral.update({
      where: { id: referral.id },
      data: { status: CaseReferralStatus.RESPONSE_RECEIVED },
    });

    return response;
  }

  /** External responses are never treated as ABSEZ government decisions. */
  responseIsAbsezDecision(response: CaseReferralResponse): boolean {
    const isExternal = response.sourceExternalAuthorityId !== null;
    return externalResponseIsAbsezDecision(isExternal);
  }

  /** Consultation institutional acts do not satisfy concurrence dependencies. */
  consultationSatisfiesConcurrence(
    dependencyType: AuthorityDependencyType,
    actType: InstitutionalActType,
  ): boolean {
    return consultationSatisfiesConcurrenceRequirement(dependencyType, actType);
  }

  /**
   * When a verified response satisfies a Phase 4 AuthorityDependency, feed the fact
   * through the canonical Phase 4 architecture without duplicating AuthorityDependency.
   */
  async processResponseForDependency(
    responseId: string,
  ): Promise<DependencySatisfactionResult> {
    const response = await this.prisma.caseReferralResponse.findUnique({
      where: { id: responseId },
      include: {
        referral: {
          include: { authorityDependency: true },
        },
      },
    });

    if (!response) {
      throw new NotFoundException(`Case referral response "${responseId}" was not found`);
    }

    const dependency = response.referral.authorityDependency;
    if (!dependency) {
      return { satisfied: false, explanationCode: 'NO_LINKED_AUTHORITY_DEPENDENCY' };
    }

    if (response.authenticatedStatus !== CaseReferralResponseAuthStatus.VERIFIED) {
      return {
        satisfied: false,
        explanationCode: CASE_COORDINATION_EXPLANATION_CODES.EXTERNAL_RESPONSE_NOT_ABSEZ_DECISION,
      };
    }

    if (!response.sourceExternalAuthorityId) {
      return {
        satisfied: false,
        explanationCode: CASE_COORDINATION_EXPLANATION_CODES.EXTERNAL_RESPONSE_NOT_ABSEZ_DECISION,
      };
    }

    if (
      dependency.externalAuthorityId &&
      dependency.externalAuthorityId !== response.sourceExternalAuthorityId
    ) {
      return {
        satisfied: false,
        explanationCode: CASE_COORDINATION_EXPLANATION_CODES.WRONG_EXTERNAL_AUTHORITY_UNSATISFIED,
      };
    }

    const now = new Date();
    if (response.expiryDate && response.expiryDate < now) {
      return {
        satisfied: false,
        explanationCode: CASE_COORDINATION_EXPLANATION_CODES.EXPIRED_DETERMINATION_UNSATISFIED,
      };
    }

    const determination = await this.authorityDependencies.registerExternalDetermination({
      authorityDependencyId: dependency.id,
      externalAuthorityId: response.sourceExternalAuthorityId,
      determinationReference:
        response.determinationReference ?? response.responseReference,
      determinationStatus: ExternalDeterminationStatus.GRANTED,
      effectiveDate: response.effectiveDate ?? response.receivedAt,
      expiryDate: response.expiryDate ?? undefined,
      isAuthenticated: true,
      scope: response.summary ?? undefined,
    });

    const createdDetermination = await this.prisma.externalDependencyDetermination.findFirst({
      where: {
        authorityDependencyId: dependency.id,
        determinationReference: determination.determinationReference,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (createdDetermination) {
      await this.prisma.caseReferralResponse.update({
        where: { id: response.id },
        data: { externalDependencyDeterminationId: createdDetermination.id },
      });
    }

    return {
      satisfied: true,
      explanationCode: 'DEPENDENCY_FACT_REGISTERED',
      externalDependencyDeterminationId: createdDetermination?.id,
    };
  }

  validateInstitutionalActForDependency(
    dependencyType: AuthorityDependencyType,
    actType: InstitutionalActType,
  ): void {
    if (
      dependencyType === AuthorityDependencyType.GOVERNMENT_CONCURRENCE &&
      actType === InstitutionalActType.CONSULTATION
    ) {
      throw new BadRequestException(
        CASE_COORDINATION_EXPLANATION_CODES.CONSULTATION_NOT_CONCURRENCE,
      );
    }

    if (!actTypeSatisfiesDependency(dependencyType, actType)) {
      throw new BadRequestException('Institutional act does not satisfy dependency type');
    }
  }
}

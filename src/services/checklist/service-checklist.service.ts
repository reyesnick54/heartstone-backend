import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GovernmentServiceVersionStatus,
  type ServiceRequirement,
  ServiceRequirementEffectiveState,
  ServiceRequirementMandatoryStatus,
  ServiceRequirementType,
  StructuredApplicabilityRuleType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StructuredApplicabilityRuleEvaluator } from '../rules/structured-applicability-rule-evaluator.service';
import {
  REQUIREMENT_SATISFACTION_MECHANISMS,
  type RequirementSatisfactionMechanism,
  SERVICE_CHECKLIST_EXPLANATION_CODES,
} from '../services.constants';
import {
  type ChecklistRequirementDto,
  type GoverningSourceReferenceDto,
  type ServiceChecklistResponseDto,
} from './dto/service-checklist-response.dto';

type RequirementWithRelations = ServiceRequirement & {
  governingSource: {
    id: string;
    code: string;
    title: string;
  } | null;
  applicabilityRule: {
    id: string;
    ruleType: StructuredApplicabilityRuleType;
    configuration: unknown;
    status: string;
  } | null;
};

@Injectable()
export class ServiceChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ruleEvaluator: StructuredApplicabilityRuleEvaluator,
  ) {}

  async generate(
    serviceVersionId: string,
    facts: Record<string, unknown> = {},
  ): Promise<ServiceChecklistResponseDto> {
    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: serviceVersionId },
    });

    if (!serviceVersion) {
      throw new NotFoundException(`Government service version "${serviceVersionId}" was not found`);
    }

    const now = new Date();
    const requirements = await this.prisma.serviceRequirement.findMany({
      where: {
        serviceVersionId,
        effectiveState: ServiceRequirementEffectiveState.ACTIVE,
      },
      include: {
        governingSource: true,
        applicabilityRule: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });

    const currentRequirements = requirements.filter((requirement) =>
      this.isRequirementCurrentlyEffective(requirement, now),
    );

    const explanationCodes: string[] = [];
    const applicableRequirements: ChecklistRequirementDto[] = [];
    const mandatoryRequirements: ChecklistRequirementDto[] = [];
    const conditionalRequirementsTriggered: ChecklistRequirementDto[] = [];
    const requirementsNotApplicable: ChecklistRequirementDto[] = [];
    const unresolvedRequirements: ChecklistRequirementDto[] = [];
    const governingSourceReferences: GoverningSourceReferenceDto[] = [];

    if (currentRequirements.length === 0) {
      explanationCodes.push(SERVICE_CHECKLIST_EXPLANATION_CODES.NO_APPROVED_REQUIREMENT_SET);
    }

    for (const requirement of currentRequirements) {
      const item = this.toChecklistRequirement(requirement, facts);
      const applicability = this.resolveApplicability(requirement, facts);

      if (applicability === 'UNRESOLVED') {
        unresolvedRequirements.push(item);
        continue;
      }

      if (applicability === 'DOES_NOT_APPLY') {
        requirementsNotApplicable.push(item);
        continue;
      }

      applicableRequirements.push(item);

      if (requirement.mandatoryStatus === ServiceRequirementMandatoryStatus.MANDATORY) {
        mandatoryRequirements.push(item);
      }

      if (requirement.mandatoryStatus === ServiceRequirementMandatoryStatus.CONDITIONAL) {
        conditionalRequirementsTriggered.push(item);
      }

      if (requirement.governingSource && requirement.sourceReference) {
        governingSourceReferences.push({
          governingSourceId: requirement.governingSource.id,
          code: requirement.governingSource.code,
          title: requirement.governingSource.title,
          sourceReference: requirement.sourceReference,
        });
      }
    }

    const hasApprovedRequirementSet =
      serviceVersion.status === GovernmentServiceVersionStatus.PUBLISHED &&
      currentRequirements.length > 0;

    const checklistComplete =
      hasApprovedRequirementSet &&
      unresolvedRequirements.length === 0 &&
      !explanationCodes.includes(SERVICE_CHECKLIST_EXPLANATION_CODES.NO_APPROVED_REQUIREMENT_SET);

    return {
      serviceVersionId,
      versionLabel: serviceVersion.versionLabel,
      applicableRequirements,
      mandatoryRequirements,
      conditionalRequirementsTriggered,
      requirementsNotApplicable,
      unresolvedRequirements,
      governingSourceReferences,
      explanationCodes,
      checklistComplete,
    };
  }

  private isRequirementCurrentlyEffective(requirement: ServiceRequirement, now: Date): boolean {
    if (requirement.effectiveState === ServiceRequirementEffectiveState.SUPERSEDED) {
      return false;
    }

    if (requirement.effectiveState === ServiceRequirementEffectiveState.EXPIRED) {
      return false;
    }

    if (requirement.effectiveFrom && requirement.effectiveFrom > now) {
      return false;
    }

    if (requirement.effectiveUntil && requirement.effectiveUntil <= now) {
      return false;
    }

    return requirement.effectiveState === ServiceRequirementEffectiveState.ACTIVE;
  }

  private resolveApplicability(
    requirement: RequirementWithRelations,
    facts: Record<string, unknown>,
  ): 'APPLIES' | 'DOES_NOT_APPLY' | 'UNRESOLVED' {
    if (requirement.mandatoryStatus === ServiceRequirementMandatoryStatus.MANDATORY) {
      return 'APPLIES';
    }

    if (requirement.mandatoryStatus === ServiceRequirementMandatoryStatus.OPTIONAL) {
      return 'APPLIES';
    }

    if (!requirement.applicabilityRule) {
      return 'UNRESOLVED';
    }

    const evaluation = this.ruleEvaluator.evaluate(requirement.applicabilityRule, facts);
    return evaluation.outcome;
  }

  private toChecklistRequirement(
    requirement: RequirementWithRelations,
    facts: Record<string, unknown>,
  ): ChecklistRequirementDto {
    const explanationCodes: string[] = [];
    const satisfactionMechanism = this.resolveSatisfactionMechanism(requirement);

    if (
      requirement.requirementType === ServiceRequirementType.PROFESSIONAL_DOCUMENT &&
      requirement.formFieldId
    ) {
      explanationCodes.push(
        SERVICE_CHECKLIST_EXPLANATION_CODES.PROFESSIONAL_DOCUMENT_CANNOT_USE_FORM_TEXT,
      );
    }

    const evidenceStatus = this.resolveEvidenceStatus(requirement, facts);
    if (evidenceStatus === 'SUBMITTED_NOT_VERIFIED') {
      explanationCodes.push(SERVICE_CHECKLIST_EXPLANATION_CODES.DOCUMENT_SUBMITTED_NOT_VERIFIED);
    }

    return {
      id: requirement.id,
      code: requirement.code,
      name: requirement.name,
      publicDescription: requirement.publicDescription,
      requirementType: requirement.requirementType,
      mandatoryStatus: requirement.mandatoryStatus,
      evidenceQualityExpectation: requirement.evidenceQualityExpectation,
      verificationRequired: requirement.verificationRequired,
      sourceReference: requirement.sourceReference,
      governingSourceId: requirement.governingSourceId,
      formFieldId: requirement.formFieldId,
      declarationDefinitionVersionId: requirement.declarationDefinitionVersionId,
      satisfactionMechanism,
      evidenceStatus,
      explanationCodes,
    };
  }

  private resolveSatisfactionMechanism(
    requirement: ServiceRequirement,
  ): RequirementSatisfactionMechanism {
    if (requirement.requirementType === ServiceRequirementType.PROFESSIONAL_DOCUMENT) {
      return REQUIREMENT_SATISFACTION_MECHANISMS.PROFESSIONAL_DOCUMENT;
    }

    if (requirement.requirementType === ServiceRequirementType.DECLARATION) {
      return REQUIREMENT_SATISFACTION_MECHANISMS.DECLARATION;
    }

    if (
      requirement.requirementType === ServiceRequirementType.EXTERNAL_DETERMINATION ||
      requirement.requirementType === ServiceRequirementType.PREREQUISITE
    ) {
      return REQUIREMENT_SATISFACTION_MECHANISMS.EXTERNAL_DETERMINATION;
    }

    if (
      requirement.requirementType === ServiceRequirementType.FORM_FIELD ||
      requirement.formFieldId
    ) {
      return REQUIREMENT_SATISFACTION_MECHANISMS.FORM_FIELD;
    }

    return REQUIREMENT_SATISFACTION_MECHANISMS.INFORMATION_INTAKE;
  }

  private resolveEvidenceStatus(
    requirement: ServiceRequirement,
    facts: Record<string, unknown>,
  ): 'NOT_SUBMITTED' | 'SUBMITTED_NOT_VERIFIED' {
    const documentTypes: ServiceRequirementType[] = [
      ServiceRequirementType.DOCUMENT,
      ServiceRequirementType.EVIDENCE,
      ServiceRequirementType.PROFESSIONAL_DOCUMENT,
    ];

    if (!documentTypes.includes(requirement.requirementType)) {
      return 'NOT_SUBMITTED';
    }

    const submittedDocuments = facts.submittedDocuments;
    if (!Array.isArray(submittedDocuments)) {
      return 'NOT_SUBMITTED';
    }

    const submitted = submittedDocuments.includes(requirement.code);
    return submitted ? 'SUBMITTED_NOT_VERIFIED' : 'NOT_SUBMITTED';
  }

  assertPublishedVersionImmutable(isImmutable: boolean, action: string): void {
    if (isImmutable) {
      throw new BadRequestException(
        `${SERVICE_CHECKLIST_EXPLANATION_CODES.PUBLISHED_VERSION_IMMUTABLE}: cannot ${action} on an immutable published service version`,
      );
    }
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthorityActionType,
  DecisionMakerActorType,
  DecisionOutcomeCode,
  DecisionRequirementElementType,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  DECISIONS_EXPLANATION_CODES,
  FINAL_DECISION_AUTHORITY_ACTIONS,
  NON_FINAL_AUTHORITY_ACTIONS,
} from '../decisions.constants';

@Injectable()
export class DecisionCatalogValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureInstitutionExists(institutionId: string): Promise<void> {
    const institution = await this.prisma.institution.findUnique({ where: { id: institutionId } });
    if (!institution) {
      throw new NotFoundException(`Institution with id "${institutionId}" was not found`);
    }
  }

  async ensureDepartmentBelongsToInstitution(
    departmentId: string,
    institutionId: string,
  ): Promise<void> {
    const department = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) {
      throw new NotFoundException(`Department with id "${departmentId}" was not found`);
    }
    if (department.institutionId !== institutionId) {
      throw new BadRequestException('Department does not belong to the responsible institution');
    }
  }

  async ensureDecisionTypeExists(decisionTypeDefinitionId: string): Promise<void> {
    const definition = await this.prisma.decisionTypeDefinition.findUnique({
      where: { id: decisionTypeDefinitionId },
    });
    if (!definition) {
      throw new NotFoundException(
        `Decision type definition with id "${decisionTypeDefinitionId}" was not found`,
      );
    }
  }

  async ensureFunctionAuthorityRecordExists(functionAuthorityRecordId: string): Promise<void> {
    const record = await this.prisma.functionAuthorityRecord.findUnique({
      where: { id: functionAuthorityRecordId },
    });
    if (!record) {
      throw new NotFoundException(
        `Function authority record with id "${functionAuthorityRecordId}" was not found`,
      );
    }
  }

  assertRequiredAuthorityActionIsFinalDecision(action: AuthorityActionType): void {
    if (
      NON_FINAL_AUTHORITY_ACTIONS.includes(action as (typeof NON_FINAL_AUTHORITY_ACTIONS)[number])
    ) {
      throw new BadRequestException({
        message:
          'Required authority action must be a final decision action, not a preparatory action',
        code:
          action === AuthorityActionType.RECOMMEND
            ? DECISIONS_EXPLANATION_CODES.RECOMMENDATION_NOT_FINAL_DECISION
            : DECISIONS_EXPLANATION_CODES.NON_DECISION_AUTHORITY_ACTION,
      });
    }

    if (
      !FINAL_DECISION_AUTHORITY_ACTIONS.includes(
        action as (typeof FINAL_DECISION_AUTHORITY_ACTIONS)[number],
      )
    ) {
      throw new BadRequestException({
        message:
          'Required authority action must be DECIDE or APPROVE for institutional decision routes',
        code: DECISIONS_EXPLANATION_CODES.NON_DECISION_AUTHORITY_ACTION,
      });
    }
  }

  assertAuthorizedDecisionMakerType(actorType: DecisionMakerActorType): void {
    const allowed: DecisionMakerActorType[] = [
      DecisionMakerActorType.OFFICEHOLDER,
      DecisionMakerActorType.PANEL,
      DecisionMakerActorType.DUAL_CONTROL_PAIR,
    ];
    if (!allowed.includes(actorType)) {
      throw new BadRequestException({
        message: 'Service or AI identities cannot be configured as final decision-makers',
        code: DECISIONS_EXPLANATION_CODES.SERVICE_IDENTITY_CANNOT_BE_DECISION_MAKER,
      });
    }
  }

  assertRequirementElementsDoNotSubstituteFinalDecision(
    elements: {
      elementType: DecisionRequirementElementType;
      configuration?: Record<string, unknown> | null;
    }[],
  ): void {
    for (const element of elements) {
      if (element.elementType !== DecisionRequirementElementType.RECOMMENDATION) {
        continue;
      }

      const configuration = element.configuration ?? {};
      if (
        configuration.treatAsFinalDecision === true ||
        configuration.equivalentToDecision === true
      ) {
        throw new BadRequestException({
          message:
            'Recommendation requirement cannot be configured as equivalent to a final decision',
          code: DECISIONS_EXPLANATION_CODES.RECOMMENDATION_ELEMENT_NOT_FINAL_DECISION,
        });
      }
    }
  }

  async resolveOutcomeDefinitionIds(outcomeCodes: DecisionOutcomeCode[]): Promise<string[]> {
    const definitions = await this.prisma.decisionPermissibleOutcomeDefinition.findMany({
      where: { code: { in: outcomeCodes } },
    });

    if (definitions.length !== outcomeCodes.length) {
      const found = new Set(definitions.map((definition) => definition.code));
      const missing = outcomeCodes.filter((code) => !found.has(code));
      throw new BadRequestException(`Unknown decision outcome codes: ${missing.join(', ')}`);
    }

    return definitions.map((definition) => definition.id);
  }

  assertDefinitionOperationallyAvailable(status: StructuralLifecycleStatus): void {
    if (status !== StructuralLifecycleStatus.ACTIVE) {
      throw new BadRequestException({
        message: 'Decision type definition is not operationally available',
        code: DECISIONS_EXPLANATION_CODES.DECISION_TYPE_NOT_OPERATIONALLY_AVAILABLE,
      });
    }
  }

  assertClientCannotSetLifecycleStatus(payload: Record<string, unknown>): void {
    if ('status' in payload && payload.status !== undefined) {
      throw new BadRequestException({
        message:
          'Client-supplied lifecycle status is not accepted on catalog configuration endpoints',
        code: DECISIONS_EXPLANATION_CODES.CLIENT_CANNOT_SET_LIFECYCLE_STATUS,
      });
    }
  }
}

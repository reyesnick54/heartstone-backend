import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  CaseStatus,
  DecisionOutcomeCode,
  DecisionTypeLifecycleStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  DECISIONS_EXPLANATION_CODES,
  FORBIDDEN_DECISION_BOUNDARY_MODELS,
  IMMUTABLE_DECISION_TYPE_VERSION_STATUSES,
} from '../decisions.constants';

@Injectable()
export class DecisionCatalogBoundaryService {
  constructor(private readonly prisma: PrismaService) {}

  assertCatalogConfigurationDoesNotCreateDecision(): void {
    throw new ForbiddenException({
      message: 'Decision catalog configuration does not create a final government decision',
      code: DECISIONS_EXPLANATION_CODES.CATALOG_DOES_NOT_CREATE_DECISION,
    });
  }

  assertEvidencePacketDoesNotCreateDecision(): void {
    throw new ForbiddenException({
      message: 'Evidence packet existence does not create an institutional decision',
      code: DECISIONS_EXPLANATION_CODES.CATALOG_DOES_NOT_CREATE_DECISION,
    });
  }

  assertCaseDecisionPendingDoesNotCreateDecision(caseStatus: CaseStatus): void {
    if (caseStatus === CaseStatus.DECISION_PENDING) {
      throw new ForbiddenException({
        message: 'Case DECISION_PENDING status does not create a final institutional decision',
        code: DECISIONS_EXPLANATION_CODES.CATALOG_DOES_NOT_CREATE_DECISION,
      });
    }
  }

  assertGovernmentResponseDoesNotCreateAbsezDecision(): void {
    throw new ForbiddenException({
      message: 'Government communication response does not create an ABSEZ institutional decision',
      code: DECISIONS_EXPLANATION_CODES.CATALOG_DOES_NOT_CREATE_DECISION,
    });
  }

  assertProfessionalFindingDoesNotCreateDecision(): void {
    throw new ForbiddenException({
      message: 'Professional finding does not constitute an institutional decision',
      code: DECISIONS_EXPLANATION_CODES.CATALOG_DOES_NOT_CREATE_DECISION,
    });
  }

  assertVersionMutable(status: DecisionTypeLifecycleStatus): void {
    if (
      IMMUTABLE_DECISION_TYPE_VERSION_STATUSES.includes(
        status as (typeof IMMUTABLE_DECISION_TYPE_VERSION_STATUSES)[number],
      )
    ) {
      throw new BadRequestException({
        message: 'ACTIVE, SUPERSEDED, and RETIRED decision type versions are immutable',
        code: DECISIONS_EXPLANATION_CODES.DECISION_TYPE_VERSION_IMMUTABLE,
      });
    }
  }

  assertOperationallyAvailable(
    versionStatus: DecisionTypeLifecycleStatus,
    definitionStatus: StructuralLifecycleStatus,
  ): void {
    if (definitionStatus !== StructuralLifecycleStatus.ACTIVE) {
      throw new BadRequestException({
        message: 'Inactive or suspended decision type definition cannot be used operationally',
        code: DECISIONS_EXPLANATION_CODES.DECISION_TYPE_NOT_OPERATIONALLY_AVAILABLE,
      });
    }

    if (versionStatus !== DecisionTypeLifecycleStatus.ACTIVE) {
      throw new BadRequestException({
        message: 'Only ACTIVE decision type versions may be used operationally',
        code: DECISIONS_EXPLANATION_CODES.DECISION_TYPE_NOT_OPERATIONALLY_AVAILABLE,
      });
    }
  }

  assertOutcomeConfigured(
    configuredOutcomeCodes: DecisionOutcomeCode[],
    requestedOutcomeCode: DecisionOutcomeCode,
  ): void {
    if (!configuredOutcomeCodes.includes(requestedOutcomeCode)) {
      throw new BadRequestException({
        message: 'Requested outcome is not configured for this decision type version',
        code: DECISIONS_EXPLANATION_CODES.OUTCOME_NOT_CONFIGURED,
      });
    }
  }

  async assertPhase8ADoesNotCreateDecisionEntities(): Promise<void> {
    for (const modelName of FORBIDDEN_DECISION_BOUNDARY_MODELS) {
      const tableName = this.modelNameToTableName(modelName);
      const result = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_name = '${tableName}'`,
      );
      if (Number(result[0]?.count ?? 0) > 0) {
        throw new ForbiddenException({
          message: `Phase 8A boundary violation: ${modelName} table exists before Phase 8B+`,
          code: DECISIONS_EXPLANATION_CODES.CATALOG_DOES_NOT_CREATE_DECISION,
        });
      }
    }
  }

  private modelNameToTableName(modelName: string): string {
    return modelName
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .replace(/__/g, '_');
  }
}

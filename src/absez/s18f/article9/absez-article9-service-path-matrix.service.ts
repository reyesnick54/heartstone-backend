import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  AbsezArticle9ServicePackReadinessStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { ABSEZ_INSTITUTION_CODE } from '../../../setup/setup.constants';
import { S18F_BOUNDARY_DISCLAIMERS } from '../absez-s18f.constants';
import { ABSEZ_ARTICLE9_SERVICE_PATH_DEFINITIONS } from './absez-article9-service-paths.data';

export interface AbsezArticle9ServicePathMatrixRow {
  departmentCode: string;
  departmentConfigured: boolean;
  servicePathKey: string;
  heartstoneModule: string;
  servicePackId?: string;
  servicePackReadiness: AbsezArticle9ServicePackReadinessStatus;
  authorityDependencyCode?: string;
  authorityLifecycleStatus?: FunctionAuthorityLifecycleStatus;
  governingSourceCode?: string;
  governingSourceState?: GoverningSourceStatus;
  operationalDependency?: string;
  isConfigured: boolean;
  isInstitutionallyActive: boolean;
  isOperationallyActive: boolean;
  appearsOperational: boolean;
}

@Injectable()
export class AbsezArticle9ServicePathMatrixService {
  constructor(private readonly prisma: PrismaService) {}

  async buildMatrix(institutionCode: string = ABSEZ_INSTITUTION_CODE): Promise<{
    rows: AbsezArticle9ServicePathMatrixRow[];
    disclaimer: string;
  }> {
    const institution = await this.prisma.institution.findFirst({
      where: { code: institutionCode },
      include: { departments: true },
    });

    const departmentCodes = new Set(institution?.departments.map((d) => d.code) ?? []);

    const rows: AbsezArticle9ServicePathMatrixRow[] = [];

    for (const definition of ABSEZ_ARTICLE9_SERVICE_PATH_DEFINITIONS) {
      const departmentConfigured = departmentCodes.has(definition.departmentCode);

      let authorityLifecycleStatus: FunctionAuthorityLifecycleStatus | undefined;
      if (definition.delegatedFunctionCode) {
        const authority = await this.prisma.functionAuthorityRecord.findUnique({
          where: { code: definition.delegatedFunctionCode },
        });
        authorityLifecycleStatus = authority?.lifecycleStatus;
      }

      let governingSourceState: GoverningSourceStatus | undefined;
      if (definition.governingSourceCode) {
        const source = await this.prisma.governingSource.findUnique({
          where: { code: definition.governingSourceCode },
        });
        governingSourceState = source?.status;
      }

      const persisted = await this.prisma.absezArticle9ServicePathState.findUnique({
        where: {
          departmentCode_servicePathKey: {
            departmentCode: definition.departmentCode,
            servicePathKey: definition.servicePathKey,
          },
        },
      });

      const isConfigured = departmentConfigured && Boolean(definition.servicePathKey);
      const authorityActive =
        !definition.delegatedFunctionCode ||
        authorityLifecycleStatus === FunctionAuthorityLifecycleStatus.ACTIVE;
      const governingAuthenticated =
        !definition.governingSourceCode ||
        governingSourceState === GoverningSourceStatus.AUTHENTICATED;

      const isInstitutionallyActive =
        persisted?.isInstitutionallyActive ??
        (isConfigured && authorityActive && governingAuthenticated);
      const isOperationallyActive =
        persisted?.isOperationallyActive ??
        (isInstitutionallyActive && !definition.retainedNationalAuthority);

      const appearsOperational = isOperationallyActive && isInstitutionallyActive && isConfigured;

      rows.push({
        departmentCode: definition.departmentCode,
        departmentConfigured,
        servicePathKey: definition.servicePathKey,
        heartstoneModule: definition.heartstoneModule,
        servicePackId: definition.servicePackId,
        servicePackReadiness:
          persisted?.servicePackReadiness ??
          AbsezArticle9ServicePackReadinessStatus.COMPILED_NON_PRODUCTION,
        authorityDependencyCode: definition.delegatedFunctionCode,
        authorityLifecycleStatus,
        governingSourceCode: definition.governingSourceCode,
        governingSourceState,
        operationalDependency: definition.operationalDependencySummary,
        isConfigured,
        isInstitutionallyActive,
        isOperationallyActive,
        appearsOperational,
      });
    }

    return {
      rows,
      disclaimer: S18F_BOUNDARY_DISCLAIMERS.configuredNotOperational,
    };
  }

  async syncPersistedStates(): Promise<number> {
    let count = 0;
    for (const definition of ABSEZ_ARTICLE9_SERVICE_PATH_DEFINITIONS) {
      await this.prisma.absezArticle9ServicePathState.upsert({
        where: {
          departmentCode_servicePathKey: {
            departmentCode: definition.departmentCode,
            servicePathKey: definition.servicePathKey,
          },
        },
        create: {
          id: randomUUID(),
          departmentCode: definition.departmentCode,
          servicePathKey: definition.servicePathKey,
          delegatedFunctionCode: definition.delegatedFunctionCode,
          governingSourceCode: definition.governingSourceCode,
          operationalDependencySummary: definition.operationalDependencySummary,
          isConfigured: true,
          isInstitutionallyActive: false,
          isOperationallyActive: false,
          servicePackReadiness: AbsezArticle9ServicePackReadinessStatus.COMPILED_NON_PRODUCTION,
        },
        update: {
          delegatedFunctionCode: definition.delegatedFunctionCode,
          governingSourceCode: definition.governingSourceCode,
          operationalDependencySummary: definition.operationalDependencySummary,
          isConfigured: true,
        },
      });
      count += 1;
    }
    return count;
  }
}

import {
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import { type ServicePackManifest } from './service-pack.types';
import { SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES } from './service-pack-runtime-compiler.constants';
import { type ResolvedCompileScope } from './service-pack-runtime-compiler.types';
import { parseServicePackManifest, validateServicePackManifest } from './validate-service-pack';

export interface CompileValidationIssue {
  code: string;
  path: string;
  message: string;
}

export function extractAuthoringManifest(manifestValue: unknown): ServicePackManifest | null {
  if (!manifestValue || typeof manifestValue !== 'object') {
    return null;
  }

  const record = manifestValue as Record<string, unknown>;

  if (record.schemaVersion === '1.0.0' && Array.isArray(record.services)) {
    try {
      return parseServicePackManifest(record);
    } catch {
      return null;
    }
  }

  if (record.authoringManifest && typeof record.authoringManifest === 'object') {
    try {
      return parseServicePackManifest(record.authoringManifest);
    } catch {
      return null;
    }
  }

  return null;
}

export async function validateAuthoringManifestForCompilation(
  prisma: PrismaService,
  authoringManifest: ServicePackManifest,
): Promise<{ issues: CompileValidationIssue[] }> {
  const issues: CompileValidationIssue[] = [];

  const structural = validateServicePackManifest(authoringManifest);
  if (!structural.valid) {
    for (const issue of structural.issues) {
      issues.push({
        code: SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.VALIDATION_FAILED,
        path: issue.path,
        message: issue.message,
      });
    }
    return { issues };
  }

  const institution = await prisma.institution.findFirst({
    where: { code: authoringManifest.institutionCode },
    select: { id: true, code: true, status: true },
  });
  if (institution?.status !== StructuralLifecycleStatus.ACTIVE) {
    issues.push({
      code: SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.INSTITUTION_NOT_FOUND,
      path: 'institutionCode',
      message: `Active institution "${authoringManifest.institutionCode}" was not found`,
    });
  }

  const departmentCode = authoringManifest.departmentCode;
  if (departmentCode && institution) {
    const department = await prisma.department.findFirst({
      where: { institutionId: institution.id, code: departmentCode },
      select: { id: true, status: true },
    });
    if (department?.status !== StructuralLifecycleStatus.ACTIVE) {
      issues.push({
        code: SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.DEPARTMENT_NOT_FOUND,
        path: 'departmentCode',
        message: `Active department "${departmentCode}" was not found for institution "${authoringManifest.institutionCode}"`,
      });
    }
  }

  const authorityCodes = new Set<string>();
  for (const service of authoringManifest.services) {
    for (const fn of service.authorityFunctions) {
      authorityCodes.add(fn.functionCode);
    }
    for (const stage of service.workflowStages) {
      if (stage.authorityFunctionCode) {
        authorityCodes.add(stage.authorityFunctionCode);
      }
    }
    authorityCodes.add(service.issuance.issuanceFunctionCode);
    for (const decisionStage of service.decisionStages) {
      authorityCodes.add(decisionStage.decisionActorFunctionCode);
    }
  }

  for (const functionCode of authorityCodes) {
    const far = await prisma.functionAuthorityRecord.findUnique({
      where: { code: functionCode },
      include: {
        governingSources: {
          include: { governingSource: true },
        },
      },
    });

    if (far?.lifecycleStatus !== FunctionAuthorityLifecycleStatus.ACTIVE) {
      issues.push({
        code: SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.AUTHORITY_NOT_RESOLVABLE,
        path: `authority.${functionCode}`,
        message: `FunctionAuthorityRecord "${functionCode}" must exist and be ACTIVE`,
      });
      continue;
    }

    const hasAuthenticatedSource = far.governingSources.some(
      (link) => link.governingSource.status === GoverningSourceStatus.AUTHENTICATED,
    );
    if (!hasAuthenticatedSource) {
      issues.push({
        code: SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.GOVERNING_SOURCE_NOT_EFFECTIVE,
        path: `authority.${functionCode}`,
        message: `FunctionAuthorityRecord "${functionCode}" requires an authenticated governing source`,
      });
    }
  }

  const familyCodes = [...new Set(authoringManifest.services.map((s) => s.serviceFamilyCode))];
  for (const familyCode of familyCodes) {
    const family = await prisma.serviceFamily.findFirst({
      where: { code: familyCode },
      select: { id: true, status: true },
    });
    if (family?.status !== StructuralLifecycleStatus.ACTIVE) {
      issues.push({
        code: SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.SERVICE_FAMILY_NOT_FOUND,
        path: `serviceFamily.${familyCode}`,
        message: `Active service family "${familyCode}" was not found`,
      });
    }
  }

  return { issues };
}

export async function resolveCompileScope(
  prisma: PrismaService,
  authoringManifest: ServicePackManifest,
): Promise<ResolvedCompileScope> {
  const institution = await prisma.institution.findFirstOrThrow({
    where: { code: authoringManifest.institutionCode },
  });

  const departmentCode =
    authoringManifest.departmentCode ?? authoringManifest.services[0]?.serviceCode ?? 'DEFAULT';

  const department =
    (await prisma.department.findFirst({
      where: { institutionId: institution.id, code: departmentCode },
    })) ??
    (await prisma.department.findFirst({
      where: { institutionId: institution.id },
      orderBy: { createdAt: 'asc' },
    }));

  if (!department) {
    throw new Error(SERVICE_PACK_RUNTIME_COMPILER_REASON_CODES.DEPARTMENT_NOT_FOUND);
  }

  return {
    institutionId: institution.id,
    departmentId: department.id,
    institutionCode: institution.code,
    departmentCode: department.code,
  };
}

import { type PrismaClient, TechnicalAccessLevel, TechnicalAccessScopeType } from '@prisma/client';

import { TechnicalRoleCodes } from '../../src/technical-access/config/technical-access-bootstrap.config';

export async function assignTechnicalRole(
  prisma: PrismaClient,
  input: {
    identityId: string;
    roleCode: string;
    scopeType?: TechnicalAccessScopeType;
    institutionId?: string;
    jurisdictionId?: string;
  },
): Promise<void> {
  const role = await prisma.technicalRole.findUniqueOrThrow({
    where: { code: input.roleCode },
  });

  const scopeType = input.scopeType ?? TechnicalAccessScopeType.PLATFORM;
  const existing = await prisma.technicalRoleAssignment.findFirst({
    where: {
      identityId: input.identityId,
      roleId: role.id,
      scopeType,
      institutionId: input.institutionId ?? null,
      jurisdictionId: input.jurisdictionId ?? null,
    },
  });
  if (existing) {
    return;
  }

  await prisma.technicalRoleAssignment.create({
    data: {
      identityId: input.identityId,
      roleId: role.id,
      scopeType,
      institutionId: input.institutionId,
      jurisdictionId: input.jurisdictionId,
    },
  });
}

export async function ensureIntegrationAdminTechnicalRoles(
  prisma: PrismaClient,
  identityId: string,
): Promise<void> {
  await grantIdentityPlatformAdministrator(prisma, identityId);
  await grantGovernmentStructureAdministrator(prisma, identityId);
}

/** Grants platform integration roles plus optional institution-scoped operator assignments. */
export async function ensureIntegrationTestTechnicalRoles(
  prisma: PrismaClient,
  identityId: string,
  options?: { institutionIds?: string[] },
): Promise<void> {
  await ensureIntegrationAdminTechnicalRoles(prisma, identityId);

  for (const institutionId of options?.institutionIds ?? []) {
    await assignTechnicalRole(prisma, {
      identityId,
      roleCode: TechnicalRoleCodes.INSTITUTION_SCOPED_OPERATOR,
      scopeType: TechnicalAccessScopeType.INSTITUTION,
      institutionId,
    });
  }
}

export async function grantIdentityPlatformAdministrator(
  prisma: PrismaClient,
  identityId: string,
): Promise<void> {
  await assignTechnicalRole(prisma, {
    identityId,
    roleCode: TechnicalRoleCodes.IDENTITY_PLATFORM_ADMINISTRATOR,
    scopeType: TechnicalAccessScopeType.PLATFORM,
  });
}

export async function grantGovernmentStructureAdministrator(
  prisma: PrismaClient,
  identityId: string,
): Promise<void> {
  await assignTechnicalRole(prisma, {
    identityId,
    roleCode: TechnicalRoleCodes.GOVERNMENT_STRUCTURE_ADMINISTRATOR,
    scopeType: TechnicalAccessScopeType.PLATFORM,
  });
}

const AUTHORITY_LIFECYCLE_E2E_ROLE_CODE = 'authority-lifecycle-e2e-operator';

/** Level-F technical access for authority function activate/suspend route tests. */
export async function grantAuthorityFunctionLifecycleOperator(
  prisma: PrismaClient,
  identityId: string,
): Promise<void> {
  await prisma.technicalRole.upsert({
    where: { code: AUTHORITY_LIFECYCLE_E2E_ROLE_CODE },
    create: {
      code: AUTHORITY_LIFECYCLE_E2E_ROLE_CODE,
      name: 'Authority lifecycle e2e operator',
      accessLevel: TechnicalAccessLevel.F,
      isSystemRole: false,
    },
    update: {
      accessLevel: TechnicalAccessLevel.F,
    },
  });

  await assignTechnicalRole(prisma, {
    identityId,
    roleCode: AUTHORITY_LIFECYCLE_E2E_ROLE_CODE,
    scopeType: TechnicalAccessScopeType.PLATFORM,
  });
}

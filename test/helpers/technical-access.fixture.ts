import { type PrismaClient,TechnicalAccessScopeType } from '@prisma/client';

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

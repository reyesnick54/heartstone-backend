import { type PrismaService } from '../../src/database/prisma.service';
import { type AuthenticatedPrincipal } from '../../src/identity/auth/domain/authenticated-principal';
import { sessionPrincipalForIdentity } from './identity-provisioning.fixture';

export async function toDashboardActor(
  prisma: PrismaService,
  identityId: string,
  userAccountId?: string | null,
): Promise<AuthenticatedPrincipal> {
  const principal = await sessionPrincipalForIdentity(prisma, identityId);
  if (userAccountId !== undefined) {
    return { ...principal, userAccountId };
  }
  return principal;
}

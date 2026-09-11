import { type UserAccountKind } from '@prisma/client';

export type AuthenticatedPrincipalKind = 'USER_ACCOUNT' | 'SERVICE_IDENTITY';
export type SystemPrincipalKind = 'SYSTEM';

export interface AuthenticatedPrincipal {
  kind: AuthenticatedPrincipalKind;
  accountId: string;
  personId?: string;
  username?: string;
  accountKind?: UserAccountKind;
  sessionId: string;
  correlationId?: string;
  verifiedOfficeholderLinkId?: string;
  verifiedOfficeholderId?: string;
}

export interface SystemPrincipal {
  kind: SystemPrincipalKind;
  correlationId?: string;
}

export type ActorPrincipal = AuthenticatedPrincipal | SystemPrincipal;

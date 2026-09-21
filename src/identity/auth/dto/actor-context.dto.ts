import { type AssuranceLevel, type IdentityType } from '@prisma/client';

import { type InstitutionalScopeEntry } from '../types/institutional-scope.types';

export class ActorContextDto {
  sessionId!: string;
  identityId!: string;
  userAccountId?: string;
  assuranceLevel!: AssuranceLevel;
  identityType!: IdentityType;
  institutionalScopes!: InstitutionalScopeEntry[];
  isAiActor!: boolean;
  isSuspendedAiAgent!: boolean;
}

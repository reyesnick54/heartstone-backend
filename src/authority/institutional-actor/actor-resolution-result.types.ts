import { type AuthorityActionType } from '@prisma/client';

import { type AuthorityExplanationCode } from '../authority.constants';

export interface ActorResolutionResult {
  resolved: boolean;
  identityId: string | null;
  officeholderLinkId: string | null;
  officeholderId: string | null;
  appointmentId: string | null;
  delegationId: string | null;
  officeId: string | null;
  departmentId: string | null;
  institutionId: string | null;
  assignmentId: string | null;
  requestedAction: AuthorityActionType;
  grantedActionTypes: AuthorityActionType[];
  failureReasons: AuthorityExplanationCode[];
}

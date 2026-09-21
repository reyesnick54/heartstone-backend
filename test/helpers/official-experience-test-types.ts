export interface OfficialMeBody {
  identityId: string;
  hasUniversalAuthority: false;
  technicalCapabilities: {
    substantiveAccessAllowed: boolean;
    hasActiveAppointment: boolean;
    hasOfficeholderLink: boolean;
    isServiceIdentity: boolean;
  };
  authorityDisclaimer: string;
}

export interface OfficialWorkQueueBody {
  items: { queueItemType: string; caseId: string | null; reason: string }[];
  totalCount: number;
}

export interface OfficialCasesListBody {
  items: { caseId: string; accessKind: string }[];
  totalCount: number;
}

export interface OfficialAvailableActionsBody {
  caseId: string;
  actions: {
    actionKey: string;
    available: boolean;
    isConsequential: boolean;
    unavailableReason: string | null;
    evaluationOutcome: string | null;
    requiresExecutionTimeRevalidation: true;
  }[];
  executionRequiresAuthorityRevalidation: true;
}

export function asOfficialMeBody(body: unknown): OfficialMeBody {
  return body as OfficialMeBody;
}

export function asOfficialWorkQueueBody(body: unknown): OfficialWorkQueueBody {
  return body as OfficialWorkQueueBody;
}

export function asOfficialCasesListBody(body: unknown): OfficialCasesListBody {
  return body as OfficialCasesListBody;
}

export function asOfficialAvailableActionsBody(body: unknown): OfficialAvailableActionsBody {
  return body as OfficialAvailableActionsBody;
}

export interface PlatformAdminHomeBody {
  hasSubstantiveGovernmentAuthority: false;
  authorityDisclaimer: string;
  summaryCounts: { label: string; count: number; status?: string }[];
}

export interface PlatformAdminListBody {
  totalCount: number;
  items: { id: string; code: string; name: string; status?: string }[];
}

export interface PlatformAdminActionsBody {
  actions: { actionKey: string; requiresGovernedWorkflow: boolean }[];
}

export function asPlatformAdminHomeBody(body: unknown): PlatformAdminHomeBody {
  return body as PlatformAdminHomeBody;
}

export function asPlatformAdminListBody(body: unknown): PlatformAdminListBody {
  return body as PlatformAdminListBody;
}

export function asPlatformAdminActionsBody(body: unknown): PlatformAdminActionsBody {
  return body as PlatformAdminActionsBody;
}

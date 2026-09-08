export type DelegationTargetType = 'institution' | 'office' | 'officeholder';

export interface DelegationTargetInput {
  institutionId?: string;
  officeId?: string;
  officeholderId?: string;
}

export interface DelegationTargetRef {
  type: DelegationTargetType;
  id: string;
}

export function countDelegationTargets(target: DelegationTargetInput): number {
  return [target.institutionId, target.officeId, target.officeholderId].filter(
    (value) => value !== undefined && value !== '',
  ).length;
}

export function resolveDelegationTarget(target: DelegationTargetInput): DelegationTargetRef | null {
  if (target.institutionId) {
    return { type: 'institution', id: target.institutionId };
  }
  if (target.officeId) {
    return { type: 'office', id: target.officeId };
  }
  if (target.officeholderId) {
    return { type: 'officeholder', id: target.officeholderId };
  }
  return null;
}

export function delegationTargetsAreSame(
  delegator: DelegationTargetRef,
  recipient: DelegationTargetRef,
): boolean {
  return delegator.type === recipient.type && delegator.id === recipient.id;
}

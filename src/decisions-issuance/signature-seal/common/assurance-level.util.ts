import { AssuranceLevel } from '@prisma/client';

const ASSURANCE_RANK: Record<AssuranceLevel, number> = {
  [AssuranceLevel.NONE]: 0,
  [AssuranceLevel.LOW]: 1,
  [AssuranceLevel.MEDIUM]: 2,
  [AssuranceLevel.HIGH]: 3,
};

export function meetsAssuranceLevel(actual: AssuranceLevel, required: AssuranceLevel): boolean {
  return ASSURANCE_RANK[actual] >= ASSURANCE_RANK[required];
}

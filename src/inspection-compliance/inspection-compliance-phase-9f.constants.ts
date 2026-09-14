export interface Phase9FInvariant {
  id: number;
  description: string;
  category: string;
}

export const PHASE_9F_INVARIANTS: readonly Phase9FInvariant[] = [
  { id: 1, category: 'boundary', description: 'Overdue obligation does not equal violation' },
  { id: 2, category: 'boundary', description: 'Risk score does not equal violation' },
  { id: 3, category: 'boundary', description: 'AI alert does not equal violation' },
  { id: 4, category: 'authority', description: 'Finding requires authorized human action' },
  { id: 5, category: 'boundary', description: 'Referral does not equal prosecution' },
  { id: 6, category: 'boundary', description: 'Referral does not equal government decision' },
  { id: 7, category: 'boundary', description: 'Criminal referral preserves national authority' },
  {
    id: 8,
    category: 'boundary',
    description: 'Protective recommendation cannot change instrument',
  },
  { id: 9, category: 'phase8', description: 'Actual suspension invokes Phase 8' },
  { id: 10, category: 'phase8', description: 'Actual revocation invokes Phase 8' },
  {
    id: 11,
    category: 'emergency',
    description: 'Emergency interim action is time-limited and separately reviewed',
  },
  { id: 12, category: 'authority', description: 'Technical admin cannot impose sanction' },
  {
    id: 13,
    category: 'authority',
    description: 'CaseAssignment cannot create enforcement authority',
  },
];

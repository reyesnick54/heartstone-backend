export interface Phase13FInvariant {
  id: number;
  description: string;
}

export const PHASE_13F_INVARIANTS: Phase13FInvariant[] = [
  { id: 1, description: 'Attendance at training cannot set QUALIFIED status' },
  { id: 2, description: 'Expired training can block configured high-consequence function access' },
  { id: 3, description: 'Expired professional qualification blocks reserved activity' },
  { id: 4, description: 'Technical system role cannot replace appointment' },
  { id: 5, description: 'Alternate cannot assume office automatically' },
  { id: 6, description: 'Revoked delegation triggers access review' },
  { id: 7, description: 'Qualification scope is enforced for function access' },
  { id: 8, description: 'Operator cannot perform outside assessed role' },
  { id: 9, description: 'Support coverage gap is visible when detected' },
  { id: 10, description: 'Staffing shortage prevents readiness when mandatory control cannot operate' },
  { id: 11, description: 'System cannot fabricate competence' },
  { id: 12, description: 'AI cannot qualify operator' },
  { id: 13, description: 'Department readiness cannot equal institutional acceptance' },
  { id: 14, description: 'Ready department cannot activate itself' },
  { id: 15, description: 'Course completion alone does not establish qualification' },
  { id: 16, description: 'Training provider cannot self-assign governmental authority' },
  { id: 17, description: 'Named owner does not equal operational coverage' },
];

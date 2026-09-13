export interface Phase8GInvariant {
  id: number;
  description: string;
}

export const PHASE_8G_INVARIANTS: Phase8GInvariant[] = [
  { id: 1, description: 'Ordinary PATCH cannot change legal instrument status' },
  { id: 2, description: 'Clerical correction cannot change decision substance' },
  { id: 3, description: 'Amendment preserves original version' },
  { id: 4, description: 'Renewal requires current evidence' },
  { id: 5, description: 'Prior approval does not establish automatic renewal' },
  { id: 6, description: 'Payment does not equal renewal' },
  { id: 7, description: 'Technical admin cannot decide suspension' },
  { id: 8, description: 'Suspension preserves historical instrument' },
  { id: 9, description: 'Suspension may be scoped where authorized' },
  { id: 10, description: 'Revocation requires decision and authority' },
  { id: 11, description: 'ABSEZ revocation cannot masquerade as national revocation' },
  { id: 12, description: 'Expired suspension does not auto-reinstate' },
  { id: 13, description: 'Reinstatement requires new decision' },
  { id: 14, description: 'Expiration preserves record' },
  { id: 15, description: 'Surrender preserves obligations' },
  { id: 16, description: 'Appeal filing does not auto-stay' },
  { id: 17, description: 'Explicit authorized stay is represented' },
  { id: 18, description: 'Public verification updates after lifecycle change' },
  { id: 19, description: 'Historical replay reconstructs each prior status' },
  { id: 20, description: 'Consequential lifecycle event requires controlling decision' },
];

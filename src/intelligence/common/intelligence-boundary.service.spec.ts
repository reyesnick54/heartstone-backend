import { IntelligenceBoundaryService } from './intelligence-boundary.service';

describe('IntelligenceBoundaryService privacy', () => {
  const boundary = new IntelligenceBoundaryService();

  it('allows forbidden subject monitoring when fully authorized', () => {
    expect(() => {
      boundary.assertMonitoringPrivacyAuthorized({
        subjectType: 'PERSON',
        institutionalPurpose: 'Oversight of licensed activity',
        lawfulBasis: 'Statutory authority section 12',
        accessApprovalRef: 'APPROVAL-2026-001',
        proportionateSafeguards: 'Role-based access with audit logging',
      });
    }).not.toThrow();
  });

  it('preserves conflicting source values in a group', () => {
    expect(() => {
      boundary.assertSourceConflictsPreserved([
        {
          conflictGroupId: 'cg-1',
          exactValue: { value: 10 },
          sourceReference: 'source-a',
        },
        {
          conflictGroupId: 'cg-1',
          exactValue: { value: 20 },
          sourceReference: 'source-b',
        },
      ]);
    }).not.toThrow();
  });
});

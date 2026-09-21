import { CaseAssignmentStatus } from '@prisma/client';

import { OfficialScopeService } from './official-scope.service';

describe('OfficialScopeService', () => {
  const service = new OfficialScopeService({} as never);

  const scope = {
    identityId: 'identity-1',
    officeholderIds: ['oh-1'],
    institutionIds: ['inst-1'],
    departmentIds: ['dept-1'],
    officeIds: ['office-1'],
    appointmentIds: ['appt-1'],
    activeDelegations: [],
    primaryAppointment: null,
  };

  it('allows assigned case access', () => {
    const result = service.evaluateCaseAccess(scope, {
      id: 'case-1',
      responsibleDepartmentId: 'dept-1',
      responsibleInstitutionId: 'inst-1',
      currentCaseManagerOfficeholderId: null,
      assignments: [
        {
          assigneeIdentityId: 'identity-1',
          assigneeOfficeholderId: 'oh-1',
          status: CaseAssignmentStatus.ACTIVE,
        },
      ],
    });

    expect(result.allowed).toBe(true);
    expect(result.accessKind).toBe('ASSIGNED');
  });

  it('denies case assigned to another official', () => {
    const result = service.evaluateCaseAccess(scope, {
      id: 'case-1',
      responsibleDepartmentId: 'dept-1',
      responsibleInstitutionId: 'inst-1',
      currentCaseManagerOfficeholderId: null,
      assignments: [
        {
          assigneeIdentityId: 'identity-2',
          assigneeOfficeholderId: 'oh-2',
          status: CaseAssignmentStatus.ACTIVE,
        },
      ],
    });

    expect(result.allowed).toBe(false);
    expect(result.accessKind).toBe('DENIED');
  });

  it('allows department pool access for unassigned cases', () => {
    const result = service.evaluateCaseAccess(scope, {
      id: 'case-1',
      responsibleDepartmentId: 'dept-1',
      responsibleInstitutionId: 'inst-1',
      currentCaseManagerOfficeholderId: null,
      assignments: [],
    });

    expect(result.allowed).toBe(true);
    expect(result.accessKind).toBe('DEPARTMENT_POOL');
  });

  it('denies cases outside department scope', () => {
    const result = service.evaluateCaseAccess(scope, {
      id: 'case-1',
      responsibleDepartmentId: 'dept-2',
      responsibleInstitutionId: 'inst-1',
      currentCaseManagerOfficeholderId: null,
      assignments: [],
    });

    expect(result.allowed).toBe(false);
    expect(result.accessKind).toBe('DENIED');
  });
});

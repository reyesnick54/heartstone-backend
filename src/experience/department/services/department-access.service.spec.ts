import {
  AssuranceLevel,
  DashboardAccessPurpose,
  IdentityType,
  SessionStatus,
} from '@prisma/client';

import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { DepartmentAccessDeniedException } from '../exceptions/department-access-denied.exception';
import { DepartmentAccessService } from './department-access.service';

describe('DepartmentAccessService', () => {
  const prisma = {
    dashboardAccessPolicy: {
      findFirst: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
  };

  const service = new DepartmentAccessService(prisma as never);

  const baseActor: ActorContext = {
    identityId: 'identity-1',
    userAccountId: 'account-1',
    personId: 'person-1',
    sessionId: 'session-1',
    identityType: IdentityType.INDIVIDUAL,
    assuranceLevel: AssuranceLevel.HIGH,
    session: {
      sessionId: 'session-1',
      status: SessionStatus.ACTIVE,
      assuranceLevel: AssuranceLevel.HIGH,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
      lastUsedAt: null,
      ipAddress: null,
      userAgent: null,
    },
    organizationMemberships: [],
    representativeAuthorities: [],
    officeholderLinks: [
      { linkId: 'link-1', officeholderId: 'oh-1', status: 'ACTIVE', linkedAt: new Date() },
    ],
    activeAppointments: [
      {
        appointmentId: 'appt-1',
        officeholderId: 'oh-1',
        officeId: 'office-1',
        departmentId: 'dept-1',
        institutionId: 'inst-1',
        status: 'ACTIVE',
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: null,
      },
    ],
    activeDelegations: [],
    institutionContexts: [
      { institutionId: 'inst-1', departmentIds: ['dept-1'], officeIds: ['office-1'] },
    ],
    hasInstitutionalRelationships: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('denies actors without institutional relationships', () => {
    const citizenActor = {
      ...baseActor,
      hasInstitutionalRelationships: false,
      officeholderLinks: [],
      activeAppointments: [],
    };

    expect(() => {
      service.assertActorEligible(citizenActor);
    }).toThrow(DepartmentAccessDeniedException);
  });

  it('requires configured management policy and rejects membership alone', async () => {
    prisma.department.findUnique.mockResolvedValue({
      id: 'dept-1',
      name: 'Dept One',
      code: 'DEPT-1',
      institutionId: 'inst-1',
      institution: { name: 'Inst One' },
    });
    prisma.dashboardAccessPolicy.findFirst.mockResolvedValue(null);

    await expect(service.resolveManagementContext(baseActor, 'dept-1')).rejects.toThrow(
      DepartmentAccessDeniedException,
    );
  });

  it('denies cross-department access without relationship even when policy exists elsewhere', async () => {
    prisma.department.findUnique.mockResolvedValue({
      id: 'dept-2',
      name: 'Dept Two',
      code: 'DEPT-2',
      institutionId: 'inst-1',
      institution: { name: 'Inst One' },
    });
    prisma.dashboardAccessPolicy.findFirst.mockResolvedValue({
      identityId: 'identity-1',
      departmentId: 'dept-2',
      purpose: DashboardAccessPurpose.DEPARTMENT_MANAGEMENT,
    });

    await expect(service.resolveManagementContext(baseActor, 'dept-2')).rejects.toThrow(
      DepartmentAccessDeniedException,
    );
  });

  it('grants access when relationship and management policy both exist', async () => {
    prisma.department.findUnique.mockResolvedValue({
      id: 'dept-1',
      name: 'Dept One',
      code: 'DEPT-1',
      institutionId: 'inst-1',
      institution: { name: 'Inst One' },
    });
    prisma.dashboardAccessPolicy.findFirst.mockResolvedValue({
      identityId: 'identity-1',
      departmentId: 'dept-1',
      purpose: DashboardAccessPurpose.DEPARTMENT_MANAGEMENT,
    });

    const context = await service.resolveManagementContext(baseActor, 'dept-1');

    expect(context.hasManagementPolicy).toBe(true);
    expect(context.hasDepartmentRelationship).toBe(true);
  });
});

import { BadRequestException } from '@nestjs/common';
import { AppointmentStatus, InspectorIndependenceStatus } from '@prisma/client';

import { InspectionAssignmentService } from './inspection-assignment.service';
import { InspectionPlanningBoundaryService } from './inspection-planning-boundary.service';

describe('InspectionAssignmentService', () => {
  const prisma = {
    inspectionPlan: { findUnique: jest.fn() },
    appointment: { findUnique: jest.fn() },
    inspectionAssignment: { create: jest.fn() },
  };
  const boundary = new InspectionPlanningBoundaryService();
  const authorityEvaluation = { evaluate: jest.fn() };

  let service: InspectionAssignmentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InspectionAssignmentService(
      prisma as never,
      boundary,
      authorityEvaluation as never,
    );
  });

  it('blocks expired appointment', async () => {
    prisma.inspectionPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      jurisdictionId: 'jur-1',
      scope: 'Declared scope',
      inspectionTypeDefinition: { requiredAuthorityAction: 'INSPECT' },
    });
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      officeholderId: 'officeholder-1',
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
      effectiveUntil: new Date('2021-01-01'),
    });

    await expect(
      service.assignInspector({
        inspectionPlanId: 'plan-1',
        inspectorIdentityId: 'identity-1',
        officeholderId: 'officeholder-1',
        appointmentId: 'appt-1',
        scope: 'Declared scope',
        jurisdictionId: 'jur-1',
        effectiveFrom: new Date('2025-01-01'),
        assignerIdentityId: 'assigner-1',
        assignerIdentityType: 'INDIVIDUAL',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates assignment without authority evaluation record', async () => {
    prisma.inspectionPlan.findUnique.mockResolvedValue({
      id: 'plan-1',
      jurisdictionId: 'jur-1',
      scope: 'Declared scope',
      inspectionTypeDefinition: { requiredAuthorityAction: 'INSPECT' },
    });
    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appt-1',
      officeholderId: 'officeholder-1',
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
      effectiveUntil: null,
    });
    prisma.inspectionAssignment.create.mockResolvedValue({
      id: 'assignment-1',
      status: 'ACTIVE',
      independenceStatus: InspectorIndependenceStatus.INDEPENDENT,
    });

    const result = await service.assignInspector({
      inspectionPlanId: 'plan-1',
      inspectorIdentityId: 'identity-1',
      officeholderId: 'officeholder-1',
      appointmentId: 'appt-1',
      scope: 'Declared scope',
      jurisdictionId: 'jur-1',
      effectiveFrom: new Date('2025-01-01'),
      assignerIdentityId: 'assigner-1',
      assignerIdentityType: 'INDIVIDUAL',
    });

    expect(result.id).toBe('assignment-1');
    expect(prisma.inspectionAssignment.create).toHaveBeenCalled();
    expect(authorityEvaluation.evaluate).not.toHaveBeenCalled();
  });
});

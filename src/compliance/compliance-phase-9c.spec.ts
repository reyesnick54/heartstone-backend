import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AuthorityEvaluationOutcome,
  IdentityType,
  InspectorIndependenceStatus,
} from '@prisma/client';

import { FORBIDDEN_AI_INSPECTION_ACTIONS } from './compliance.constants';
import { InspectionAssignmentService } from './planning/inspection-assignment.service';
import { InspectionPlanService } from './planning/inspection-plan.service';
import { InspectionPlanningBoundaryService } from './planning/inspection-planning-boundary.service';
import { InspectionScheduleService } from './planning/inspection-schedule.service';
import { InspectorQualificationService } from './planning/inspector-qualification.service';

describe('Phase 9C inspection planning invariants', () => {
  const boundary = new InspectionPlanningBoundaryService();
  const qualification = new InspectorQualificationService({} as never);
  const planService = new InspectionPlanService({} as never, boundary);
  const scheduleService = new InspectionScheduleService({} as never, boundary);

  it('inspection assignment does not create authority', () => {
    const assignment = new InspectionAssignmentService({} as never, boundary, {} as never);
    expect(assignment.assignmentCreatesAuthority()).toBe(false);
    boundary.assertAssignmentDoesNotCreateAuthority();
  });

  it('wrong jurisdiction fails', () => {
    expect(() => {
      boundary.assertJurisdictionMatches('jur-a', 'jur-b');
    }).toThrow(BadRequestException);
  });

  it('expired qualification fails when required', () => {
    expect(() => {
      qualification.assertQualificationCurrent(
        new Date('2020-01-01'),
        new Date('2021-01-01'),
        new Date('2022-01-01'),
      );
    }).toThrow(BadRequestException);
  });

  it('conflicted inspector blocked', () => {
    expect(() => {
      boundary.assertInspectorNotConflicted(InspectorIndependenceStatus.DECLARED_CONFLICT);
    }).toThrow(ForbiddenException);
  });

  it('unannounced inspection unavailable unless explicitly configured', () => {
    expect(() => {
      boundary.assertUnannouncedAllowed(false, true);
    }).toThrow(BadRequestException);
  });

  it('risk score alone cannot create violation or sanction', () => {
    expect(() => {
      boundary.assertRiskScoreNotSoleBasis([], 0.95);
    }).toThrow(BadRequestException);
    expect(planService.riskScoreAloneCannotCreateViolation()).toBe(true);
  });

  it('AI cannot order inspection on its own', () => {
    expect(() => {
      boundary.assertAiCannotOrderInspection(IdentityType.SERVICE);
    }).toThrow(ForbiddenException);
    expect(FORBIDDEN_AI_INSPECTION_ACTIONS).toContain('ORDER_INSPECTION');
  });

  it('scope cannot silently expand during planning', () => {
    expect(() => {
      boundary.assertScopeNotSilentlyExpanded('Site A loading bay', 'Site A and Site B warehouse');
    }).toThrow(BadRequestException);
  });

  it('notice requirements preserved', () => {
    expect(() => {
      scheduleService.assertNoticeRequirementsMet({ authority: 'Inspector General' });
    }).toThrow(BadRequestException);
    expect(scheduleService.getNoticeDetailFields()).toContain('rights');
  });

  it('technical admin cannot self-assign sovereign inspection authority', () => {
    expect(() => {
      boundary.assertTechnicalAdminCannotSelfAssignSovereignAuthority(
        IdentityType.SERVICE,
        'officeholder-1',
        'officeholder-1',
      );
    }).toThrow(ForbiddenException);
  });

  it('requires authority evaluation before consequential inspection action', async () => {
    const prisma = {
      inspectionPlan: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'plan-1',
          functionAuthorityRecordId: 'far-1',
          inspectionTypeDefinition: { requiredAuthorityAction: 'INSPECT' },
        }),
      },
    };
    const authorityEvaluation = {
      evaluate: jest.fn().mockResolvedValue({
        outcome: AuthorityEvaluationOutcome.DENY,
        evaluationId: null,
      }),
    };
    const assignment = new InspectionAssignmentService(
      prisma as never,
      boundary,
      authorityEvaluation as never,
    );

    await expect(
      assignment.authorizeInspectionAction({
        inspectionPlanId: 'plan-1',
        inspectorIdentityId: 'identity-1',
        inspectorOfficeholderId: 'officeholder-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

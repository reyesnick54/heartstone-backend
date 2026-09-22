import { IdentityType } from '@prisma/client';

import { type AuthorityDependencyEvaluator } from '../../../authority/dependencies/authority-dependency-evaluator.service';
import { type AuthorityEvaluationService } from '../../../authority/evaluation/authority-evaluation.service';
import { type PrismaService } from '../../../database/prisma.service';
import { type OfficialScopeService } from '../../../experience/official/services/official-scope.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { ImmigrationExperienceBoundaryService } from '../../boundary/immigration-experience-boundary.service';
import { ImmigrationScopeService } from './immigration-scope.service';
import { OfficialImmigrationProjectionService } from './official-immigration-projection.service';

describe('OfficialImmigrationProjectionService', () => {
  const prisma = {
    case: { findFirst: jest.fn() },
    functionAuthorityRecord: { findFirst: jest.fn() },
    authorityDependency: { findMany: jest.fn() },
  } as unknown as PrismaService;

  const officialScope = {
    assertCaseAccess: jest.fn(),
  } as unknown as OfficialScopeService;

  const authorityEvaluation = {
    evaluate: jest.fn(),
  } as unknown as AuthorityEvaluationService;

  const dependencyEvaluator = {
    evaluate: jest.fn(),
    hasBlockingFailures: jest.fn(),
  } as unknown as AuthorityDependencyEvaluator;

  const service = new OfficialImmigrationProjectionService(
    prisma,
    new ImmigrationScopeService(prisma, {} as never),
    officialScope,
    authorityEvaluation,
    dependencyEvaluator,
    new ImmigrationExperienceBoundaryService(),
  );

  const baseContext: ResolvedOfficialContext = {
    identityId: 'identity-1',
    identityType: IdentityType.INDIVIDUAL,
    displayName: 'Official',
    assuranceLevel: 'STANDARD',
    userAccountId: null,
    officeholderLinks: [],
    activeAppointments: [],
    activeDelegations: [],
    institutionalContext: {
      institutionIds: [],
      departmentIds: ['dept-1'],
      officeIds: [],
      jurisdictionIds: [],
    },
    technicalCapabilities: {
      canAccessOfficialWorkspace: true,
      hasActiveAppointment: false,
      hasOfficeholderLink: true,
      substantiveAccessAllowed: true,
      isServiceIdentity: false,
      isTechnicalAdminOnly: false,
    },
    authorityDisclaimer: 'Test',
    scope: {
      identityId: 'identity-1',
      officeholderIds: [],
      institutionIds: [],
      departmentIds: ['dept-1'],
      officeIds: [],
      appointmentIds: [],
      activeDelegations: [],
      primaryAppointment: null,
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.case.findFirst = jest.fn().mockResolvedValue({ id: 'case-1' });
    prisma.functionAuthorityRecord.findFirst = jest.fn().mockResolvedValue({
      id: 'fn-1',
      lifecycleStatus: 'ACTIVE',
    });
    prisma.authorityDependency.findMany = jest.fn().mockResolvedValue([]);
    dependencyEvaluator.evaluate = jest.fn().mockResolvedValue([]);
    dependencyEvaluator.hasBlockingFailures = jest.fn().mockReturnValue(false);
    authorityEvaluation.evaluate = jest.fn().mockResolvedValue({ outcome: 'ALLOW', summary: null });
  });

  it('removes approve/decide action when appointment and delegation are absent', async () => {
    const result = await service.getAvailableActions(baseContext, 'case-1');
    const decide = result.actions.find((action) => action.actionKey === 'decide');
    expect(decide?.available).toBe(false);
    expect(decide?.unavailableReason).toMatch(/appointment or delegation/i);
  });
});

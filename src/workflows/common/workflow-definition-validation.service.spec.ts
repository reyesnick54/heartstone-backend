import {
  AuthorityActionType,
  FunctionAuthorityLifecycleStatus,
  WorkflowStageType,
  WorkflowStepType,
  WorkflowVersionStatus,
} from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import { WorkflowDefinitionValidationService } from './workflow-definition-validation.service';

describe('WorkflowDefinitionValidationService', () => {
  const prisma = {
    workflowVersion: {
      findUnique: jest.fn(),
    },
    functionAuthorityRecord: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const service = new WorkflowDefinitionValidationService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockGraph(overrides?: {
    steps?: Record<string, unknown>[];
    transitions?: Record<string, unknown>[];
    stages?: Record<string, unknown>[];
  }) {
    const stageId = 'stage-1';
    const stepStartId = 'step-start';
    const stepEndId = 'step-end';

    (prisma.workflowVersion.findUnique as jest.Mock).mockResolvedValue({
      id: 'version-1',
      status: WorkflowVersionStatus.DRAFT,
      stages: overrides?.stages ?? [
        {
          id: stageId,
          stageKey: 'intake',
          stageType: WorkflowStageType.INTAKE,
        },
      ],
      steps: overrides?.steps ?? [
        {
          id: stepStartId,
          stepKey: 'start',
          stageId,
          stepType: WorkflowStepType.ADMINISTRATIVE_TASK,
          isStartingStep: true,
          isConsequential: false,
          permitsCycle: false,
          functionAuthorityRecordId: null,
          requiredAuthorityAction: null,
          stage: { stageType: WorkflowStageType.INTAKE },
        },
        {
          id: stepEndId,
          stepKey: 'end',
          stageId,
          stepType: WorkflowStepType.ADMINISTRATIVE_TASK,
          isStartingStep: false,
          isConsequential: false,
          permitsCycle: false,
          functionAuthorityRecordId: null,
          requiredAuthorityAction: null,
          stage: { stageType: WorkflowStageType.INTAKE },
        },
      ],
      transitions: overrides?.transitions ?? [
        {
          id: 'transition-1',
          fromStepId: stepStartId,
          toStepId: stepEndId,
          conditionConfig: {},
        },
      ],
    });
  }

  it('accepts a valid routing graph', async () => {
    mockGraph();
    const result = await service.validateVersion('version-1');
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects unreachable steps', async () => {
    mockGraph({
      steps: [
        {
          id: 'step-start',
          stepKey: 'start',
          stageId: 'stage-1',
          stepType: WorkflowStepType.ADMINISTRATIVE_TASK,
          isStartingStep: true,
          isConsequential: false,
          permitsCycle: false,
          functionAuthorityRecordId: null,
          requiredAuthorityAction: null,
          stage: { stageType: WorkflowStageType.INTAKE },
        },
        {
          id: 'step-orphan',
          stepKey: 'orphan',
          stageId: 'stage-1',
          stepType: WorkflowStepType.ADMINISTRATIVE_TASK,
          isStartingStep: false,
          isConsequential: false,
          permitsCycle: false,
          functionAuthorityRecordId: null,
          requiredAuthorityAction: null,
          stage: { stageType: WorkflowStageType.INTAKE },
        },
      ],
      transitions: [],
    });

    const result = await service.validateVersion('version-1');
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'UNREACHABLE_STEP')).toBe(true);
  });

  it('rejects transitions to nonexistent steps', async () => {
    mockGraph({
      transitions: [
        {
          id: 'transition-1',
          fromStepId: 'step-start',
          toStepId: 'missing-step',
          conditionConfig: {},
        },
      ],
    });

    const result = await service.validateVersion('version-1');
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'TRANSITION_TO_MISSING')).toBe(true);
  });

  it('rejects consequential steps without authority mapping', async () => {
    mockGraph({
      steps: [
        {
          id: 'step-start',
          stepKey: 'start',
          stageId: 'stage-1',
          stepType: WorkflowStepType.ADMINISTRATIVE_TASK,
          isStartingStep: true,
          isConsequential: true,
          permitsCycle: false,
          functionAuthorityRecordId: null,
          requiredAuthorityAction: null,
          stage: { stageType: WorkflowStageType.INTAKE },
        },
      ],
      transitions: [],
    });

    const result = await service.validateVersion('version-1');
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'CONSEQUENTIAL_WITHOUT_AUTHORITY')).toBe(
      true,
    );
  });

  it('rejects AI as final decision step owner', async () => {
    mockGraph({
      stages: [
        {
          id: 'stage-decision',
          stageKey: 'decision',
          stageType: WorkflowStageType.DECISION_GATE,
        },
      ],
      steps: [
        {
          id: 'step-decision',
          stepKey: 'decide',
          stageId: 'stage-decision',
          stepType: WorkflowStepType.DECISION,
          isStartingStep: true,
          isConsequential: true,
          permitsCycle: false,
          functionAuthorityRecordId: 'authority-ai',
          requiredAuthorityAction: AuthorityActionType.DECIDE,
          stage: { stageType: WorkflowStageType.DECISION_GATE },
        },
      ],
      transitions: [],
    });

    (prisma.functionAuthorityRecord.findUnique as jest.Mock).mockResolvedValue({
      id: 'authority-ai',
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      actionRights: [
        {
          action: AuthorityActionType.DECIDE,
          permitted: true,
          requiresHumanActor: false,
        },
      ],
    });

    const result = await service.validateVersion('version-1');
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'AI_DECISION_OWNER_FORBIDDEN')).toBe(true);
  });

  it('rejects issuance step outside issuance gate', async () => {
    mockGraph({
      stages: [
        {
          id: 'stage-intake',
          stageKey: 'intake',
          stageType: WorkflowStageType.INTAKE,
        },
      ],
      steps: [
        {
          id: 'step-issue',
          stepKey: 'issue',
          stageId: 'stage-intake',
          stepType: WorkflowStepType.ISSUANCE,
          isStartingStep: true,
          isConsequential: false,
          permitsCycle: false,
          functionAuthorityRecordId: null,
          requiredAuthorityAction: null,
          stage: { stageType: WorkflowStageType.INTAKE },
        },
      ],
      transitions: [],
    });

    const result = await service.validateVersion('version-1');
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'ISSUANCE_WITHOUT_GATE')).toBe(true);
  });

  it('rejects unsafe transition condition structures', async () => {
    mockGraph({
      transitions: [
        {
          id: 'transition-1',
          fromStepId: 'step-start',
          toStepId: 'step-end',
          conditionConfig: { eval: 'true' },
        },
      ],
    });

    const result = await service.validateVersion('version-1');
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'UNSAFE_CONDITION_CONFIG')).toBe(true);
  });
});

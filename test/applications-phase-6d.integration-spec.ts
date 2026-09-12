import { type INestApplication } from '@nestjs/common';
import {
  CaseStatus,
  CaseWorkflowInstanceStatus,
  CaseWorkflowStepInstanceStatus,
  WorkflowVersionStatus,
} from '@prisma/client';

import { seedPhase6DWorkflowFixture } from '../src/applications/fixtures/phase-6d-workflow-test-fixtures';
import { WORKFLOW_ORCHESTRATION_ERRORS } from '../src/applications/workflow/workflow-orchestration.constants';
import { WorkflowOrchestrationService } from '../src/applications/workflow/workflow-orchestration.service';
import { FunctionActivationService } from '../src/authority/function-authority-records/function-activation.service';
import { FunctionAuthorityRecordsService } from '../src/authority/function-authority-records/function-authority-records.service';
import { GoverningSourcesService } from '../src/authority/governing-sources/governing-sources.service';
import { PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Phase 6D workflow orchestration (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let orchestration: WorkflowOrchestrationService;
  let governingSources: GoverningSourcesService;
  let functions: FunctionAuthorityRecordsService;
  let activation: FunctionActivationService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    orchestration = app.get(WorkflowOrchestrationService);
    governingSources = app.get(GoverningSourcesService);
    functions = app.get(FunctionAuthorityRecordsService);
    activation = app.get(FunctionActivationService);
  });

  async function seedFixture() {
    return seedPhase6DWorkflowFixture(prisma, governingSources, functions, activation);
  }

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('positive paths', () => {
    it('starts workflow and pins exact workflow version', async () => {
      const fixture = await seedFixture();

      const result = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      expect(result.status).toBe(CaseWorkflowInstanceStatus.ACTIVE);
      expect(result.readyStepKeys).toContain('INTAKE');

      const instance = await prisma.caseWorkflowInstance.findUnique({
        where: { id: result.instanceId },
      });
      expect(instance?.workflowVersionId).toBe(fixture.workflowVersionId);
    });

    it('executes sequential administrative steps', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
      });

      const intakeComplete = await orchestration.completeAdministrativeStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
        idempotencyKey: 'intake-complete-1',
      });

      expect(intakeComplete.status).toBe(CaseWorkflowStepInstanceStatus.COMPLETED);
      expect(intakeComplete.nextReadyStepKeys).toContain('REVIEW');

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'REVIEW',
        actor: fixture.authorizedActor,
      });

      const reviewComplete = await orchestration.completeAdministrativeStep({
        instanceId: started.instanceId,
        stepKey: 'REVIEW',
        actor: fixture.authorizedActor,
        idempotencyKey: 'review-complete-1',
      });

      expect(reviewComplete.status).toBe(CaseWorkflowStepInstanceStatus.COMPLETED);
      expect(reviewComplete.authorityEvaluationRecordId).toBeDefined();
    });

    it('executes parallel fork and join', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.parallelCaseId,
        workflowVersionId: fixture.parallelWorkflowVersionId,
        actor: fixture.authorizedActor,
      });

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'SUBMIT',
        actor: fixture.authorizedActor,
      });

      await orchestration.completeAdministrativeStep({
        instanceId: started.instanceId,
        stepKey: 'SUBMIT',
        actor: fixture.authorizedActor,
        idempotencyKey: 'submit-1',
      });

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'FORK',
        actor: fixture.authorizedActor,
      });
      await orchestration.completeAdministrativeStep({
        instanceId: started.instanceId,
        stepKey: 'FORK',
        actor: fixture.authorizedActor,
        idempotencyKey: 'fork-1',
      });

      const afterFork = await prisma.caseWorkflowStepInstance.findMany({
        where: { caseWorkflowInstanceId: started.instanceId },
      });

      const branchA = afterFork.find((s) => s.stepKey === 'REVIEW_A');
      const branchB = afterFork.find((s) => s.stepKey === 'REVIEW_B');
      expect(branchA?.status).toBe(CaseWorkflowStepInstanceStatus.READY);
      expect(branchB?.status).toBe(CaseWorkflowStepInstanceStatus.READY);

      for (const branch of ['REVIEW_A', 'REVIEW_B'] as const) {
        await orchestration.startAuthorizedStep({
          instanceId: started.instanceId,
          stepKey: branch,
          actor: fixture.authorizedActor,
        });
        await orchestration.completeAdministrativeStep({
          instanceId: started.instanceId,
          stepKey: branch,
          actor: fixture.authorizedActor,
          idempotencyKey: `${branch}-complete`,
        });
      }

      const allSteps = await prisma.caseWorkflowStepInstance.findMany({
        where: { caseWorkflowInstanceId: started.instanceId },
        orderBy: { stepKey: 'asc' },
      });

      expect(allSteps.find((s) => s.stepKey === 'REVIEW_A')?.status).toBe(
        CaseWorkflowStepInstanceStatus.COMPLETED,
      );
      expect(allSteps.find((s) => s.stepKey === 'REVIEW_B')?.status).toBe(
        CaseWorkflowStepInstanceStatus.COMPLETED,
      );

      await orchestration.determineReadySteps(started.instanceId);

      const refreshedJoin = await prisma.caseWorkflowStepInstance.findFirst({
        where: {
          caseWorkflowInstanceId: started.instanceId,
          stepKey: 'JOIN',
        },
      });
      expect(refreshedJoin?.status).toBe(CaseWorkflowStepInstanceStatus.READY);
    });

    it('supports return for correction', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
      });
      await orchestration.completeAdministrativeStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
        idempotencyKey: 'intake-1',
      });

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'REVIEW',
        actor: fixture.authorizedActor,
      });

      await orchestration.returnForCorrection({
        instanceId: started.instanceId,
        fromStepKey: 'REVIEW',
        toStepKey: 'INTAKE',
        actor: fixture.authorizedActor,
        reason: 'Missing documentation',
      });

      const intakeStep = await prisma.caseWorkflowStepInstance.findFirst({
        where: {
          caseWorkflowInstanceId: started.instanceId,
          stepKey: 'INTAKE',
        },
      });
      expect(intakeStep?.status).toBe(CaseWorkflowStepInstanceStatus.READY);
    });

    it('supports pause and resume', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      await orchestration.pauseWorkflow({
        instanceId: started.instanceId,
        actor: fixture.authorizedActor,
        reason: 'Awaiting external input',
      });

      const paused = await prisma.caseWorkflowInstance.findUnique({
        where: { id: started.instanceId },
      });
      expect(paused?.status).toBe(CaseWorkflowInstanceStatus.PAUSED);

      await orchestration.resumeWorkflow({
        instanceId: started.instanceId,
        actor: fixture.authorizedActor,
      });

      const resumed = await prisma.caseWorkflowInstance.findUnique({
        where: { id: started.instanceId },
      });
      expect(resumed?.status).toBe(CaseWorkflowInstanceStatus.ACTIVE);
    });

    it('reaches DECISION_PENDING at decision gate without creating decision', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
      });
      await orchestration.completeAdministrativeStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
        idempotencyKey: 'intake-dg-1',
      });

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'REVIEW',
        actor: fixture.authorizedActor,
      });
      await orchestration.completeAdministrativeStep({
        instanceId: started.instanceId,
        stepKey: 'REVIEW',
        actor: fixture.authorizedActor,
        idempotencyKey: 'review-dg-1',
      });

      await orchestration.evaluateDeterministicTransitions(started.instanceId, 'REVIEW');

      const caseRecord = await prisma.caseRecord.findUnique({
        where: { id: fixture.caseId },
      });
      expect(caseRecord?.status).toBe(CaseStatus.DECISION_PENDING);

      const decisionStep = await prisma.caseWorkflowStepInstance.findFirst({
        where: {
          caseWorkflowInstanceId: started.instanceId,
          stepKey: 'DECISION_GATE',
        },
      });
      expect(decisionStep?.status).toBe(CaseWorkflowStepInstanceStatus.WAITING);

      const decisionCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count FROM information_schema.tables
        WHERE table_name = 'government_decisions'
      `;
      expect(Number(decisionCount[0].count)).toBe(0);
    });
  });

  describe('must-fail invariants', () => {
    it('rejects inactive workflow start', async () => {
      const fixture = await seedFixture();

      await prisma.workflowVersion.update({
        where: { id: fixture.workflowVersionId },
        data: { status: WorkflowVersionStatus.DRAFT },
      });

      await expect(
        orchestration.startWorkflow({
          caseId: fixture.caseId,
          workflowVersionId: fixture.workflowVersionId,
          actor: fixture.authorizedActor,
        }),
      ).rejects.toThrow(WORKFLOW_ORCHESTRATION_ERRORS.INACTIVE_WORKFLOW);
    });

    it('rejects wrong service workflow attachment', async () => {
      const fixture = await seedFixture();

      const otherService = await prisma.governmentService.create({
        data: {
          code: 'OTHER-SERVICE-6D',
          slug: 'other-service-6d',
          officialName: 'Other Service',
          publicName: 'Other Service',
          responsibleInstitutionId: fixture.institutionId,
          responsibleDepartmentId: fixture.departmentId,
          serviceFamilyId: (
            await prisma.serviceFamily.findFirstOrThrow({
              where: { code: { contains: 'NON_PRODUCTION' } },
            })
          ).id,
        },
      });

      const otherVersion = await prisma.governmentServiceVersion.create({
        data: {
          governmentServiceId: otherService.id,
          version: '1.0.0',
        },
      });

      const otherWorkflowDef = await prisma.workflowDefinition.create({
        data: {
          code: 'OTHER-WF-6D',
          name: 'Other Workflow',
          governmentServiceVersionId: otherVersion.id,
        },
      });

      const otherWorkflowVersion = await prisma.workflowVersion.create({
        data: {
          workflowDefinitionId: otherWorkflowDef.id,
          version: 1,
          status: WorkflowVersionStatus.ACTIVE,
        },
      });

      await expect(
        orchestration.startWorkflow({
          caseId: fixture.caseId,
          workflowVersionId: otherWorkflowVersion.id,
          actor: fixture.authorizedActor,
        }),
      ).rejects.toThrow(WORKFLOW_ORCHESTRATION_ERRORS.SERVICE_MISMATCH);
    });

    it('rejects user without authority on consequential step', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
      });
      await orchestration.completeAdministrativeStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
        idempotencyKey: 'intake-auth-1',
      });

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'REVIEW',
        actor: fixture.unauthorizedActor,
      });

      await expect(
        orchestration.completeAdministrativeStep({
          instanceId: started.instanceId,
          stepKey: 'REVIEW',
          actor: fixture.unauthorizedActor,
          idempotencyKey: 'review-unauth-1',
        }),
      ).rejects.toThrow(WORKFLOW_ORCHESTRATION_ERRORS.AUTHORITY_DENIED);
    });

    it('rejects service identity completing human-required step', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      await expect(
        orchestration.startAuthorizedStep({
          instanceId: started.instanceId,
          stepKey: 'INTAKE',
          actor: fixture.serviceIdentityActor,
        }),
      ).rejects.toThrow(WORKFLOW_ORCHESTRATION_ERRORS.SERVICE_IDENTITY_HUMAN_STEP);
    });

    it('rejects client arbitrary next step via return for correction', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      await expect(
        orchestration.returnForCorrection({
          instanceId: started.instanceId,
          fromStepKey: 'INTAKE',
          toStepKey: 'DECISION_GATE',
          actor: fixture.authorizedActor,
          reason: 'Arbitrary jump',
        }),
      ).rejects.toThrow(WORKFLOW_ORCHESTRATION_ERRORS.ARBITRARY_TRANSITION);
    });

    it('rejects duplicate step completion via idempotency', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      await orchestration.startAuthorizedStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
      });

      const first = await orchestration.completeAdministrativeStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
        idempotencyKey: 'dup-key-1',
      });

      const second = await orchestration.completeAdministrativeStep({
        instanceId: started.instanceId,
        stepKey: 'INTAKE',
        actor: fixture.authorizedActor,
        idempotencyKey: 'dup-key-1',
      });

      expect(first.alreadyCompleted).toBe(false);
      expect(second.alreadyCompleted).toBe(true);
    });

    it('rejects decision gate administrative completion', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      await orchestration.reachDecisionGate(started.instanceId, 'DECISION_GATE');

      await expect(
        orchestration.completeAdministrativeStep({
          instanceId: started.instanceId,
          stepKey: 'DECISION_GATE',
          actor: fixture.authorizedActor,
          idempotencyKey: 'decision-attempt-1',
        }),
      ).rejects.toThrow(WORKFLOW_ORCHESTRATION_ERRORS.DECISION_GATE_NO_CREATE);
    });

    it('blocks safe-halted workflow from continuing normally', async () => {
      const fixture = await seedFixture();

      const started = await orchestration.startWorkflow({
        caseId: fixture.caseId,
        workflowVersionId: fixture.workflowVersionId,
        actor: fixture.authorizedActor,
      });

      await orchestration.safeHalt({
        instanceId: started.instanceId,
        reason: 'AUTHORITY_CANNOT_BE_ESTABLISHED',
        actor: fixture.authorizedActor,
      });

      await expect(
        orchestration.startAuthorizedStep({
          instanceId: started.instanceId,
          stepKey: 'INTAKE',
          actor: fixture.authorizedActor,
        }),
      ).rejects.toThrow(WORKFLOW_ORCHESTRATION_ERRORS.SAFE_HALTED);
    });
  });
});

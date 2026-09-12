import { type INestApplication } from '@nestjs/common';
import { WorkflowStageType, WorkflowStepType, WorkflowVersionStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedServiceCatalogFixture } from './helpers/service-catalog-test-fixtures';
import { seedWorkflowFixture } from './helpers/workflow-test-fixtures';
import {
  asWorkflowDefinitionBody,
  asWorkflowReconstructBody,
  asWorkflowStageBody,
  asWorkflowStageListBody,
  asWorkflowStepBody,
  asWorkflowStepListBody,
  asWorkflowValidationResultBody,
  asWorkflowVersionBody,
  asWorkflowVersionListBody,
} from './helpers/workflow-test-types';

describe('Workflow definition engine (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let sessionToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    const fixture = await seedServiceCatalogFixture(app, prisma);
    sessionToken = fixture.sessionToken;
  });

  afterAll(async () => {
    await app.close();
  });

  function authRequest() {
    return {
      get: (url: string) =>
        request(app.getHttpServer()).get(url).set('Authorization', `Bearer ${sessionToken}`),
      post: (url: string) =>
        request(app.getHttpServer()).post(url).set('Authorization', `Bearer ${sessionToken}`),
      patch: (url: string) =>
        request(app.getHttpServer()).patch(url).set('Authorization', `Bearer ${sessionToken}`),
    };
  }

  async function seedServiceForWorkflow() {
    return seedWorkflowFixture(prisma);
  }

  async function createMinimalWorkflowGraph(options?: { includeIssuance?: boolean }) {
    const fixture = await seedServiceForWorkflow();

    const definitionResponse = await authRequest()
      .post('/api/v1/workflows/definitions')
      .send({
        code: 'NON_PRODUCTION-test-workflow',
        name: 'Test Workflow',
        serviceId: fixture.serviceId,
        responsibleDepartmentId: fixture.departmentId,
      })
      .expect(201);

    const definition = asWorkflowDefinitionBody(definitionResponse.body);

    const versionResponse = await authRequest()
      .post(`/api/v1/workflows/definitions/${definition.id}/versions`)
      .send({
        version: '1.0.0',
        serviceVersionId: fixture.serviceVersionId,
      })
      .expect(201);

    const version = asWorkflowVersionBody(versionResponse.body);

    const intakeStageResponse = await authRequest()
      .post(`/api/v1/workflows/versions/${version.id}/stages`)
      .send({
        stageKey: 'intake',
        name: 'Intake',
        sequence: 1,
        stageType: WorkflowStageType.INTAKE,
      })
      .expect(201);
    const intakeStage = asWorkflowStageBody(intakeStageResponse.body);

    const reviewStageResponse = await authRequest()
      .post(`/api/v1/workflows/versions/${version.id}/stages`)
      .send({
        stageKey: 'review',
        name: 'Review',
        sequence: 2,
        stageType: WorkflowStageType.SUBSTANTIVE_REVIEW,
      })
      .expect(201);
    const reviewStage = asWorkflowStageBody(reviewStageResponse.body);

    const decisionStageResponse = await authRequest()
      .post(`/api/v1/workflows/versions/${version.id}/stages`)
      .send({
        stageKey: 'decision',
        name: 'Decision',
        sequence: 3,
        stageType: WorkflowStageType.DECISION_GATE,
      })
      .expect(201);
    const decisionStage = asWorkflowStageBody(decisionStageResponse.body);

    let issuanceStageId: string | undefined;
    if (options?.includeIssuance) {
      const issuanceStageResponse = await authRequest()
        .post(`/api/v1/workflows/versions/${version.id}/stages`)
        .send({
          stageKey: 'issuance',
          name: 'Issuance',
          sequence: 4,
          stageType: WorkflowStageType.ISSUANCE_GATE,
        })
        .expect(201);
      issuanceStageId = asWorkflowStageBody(issuanceStageResponse.body).id;
    }

    const startStepResponse = await authRequest()
      .post(`/api/v1/workflows/versions/${version.id}/steps`)
      .send({
        stageId: intakeStage.id,
        stepKey: 'start',
        name: 'Start',
        stepType: WorkflowStepType.ADMINISTRATIVE_TASK,
        sequence: 1,
        isStartingStep: true,
      })
      .expect(201);
    const startStep = asWorkflowStepBody(startStepResponse.body);

    const reviewStepResponse = await authRequest()
      .post(`/api/v1/workflows/versions/${version.id}/steps`)
      .send({
        stageId: reviewStage.id,
        stepKey: 'review',
        name: 'Review',
        stepType: WorkflowStepType.REVIEW,
        sequence: 2,
      })
      .expect(201);
    const reviewStep = asWorkflowStepBody(reviewStepResponse.body);

    const decisionStepResponse = await authRequest()
      .post(`/api/v1/workflows/versions/${version.id}/steps`)
      .send({
        stageId: decisionStage.id,
        stepKey: 'decide',
        name: 'Decide',
        stepType: WorkflowStepType.DECISION,
        sequence: 3,
        isConsequential: true,
        functionAuthorityRecordId: fixture.humanDecisionAuthorityId,
        requiredAuthorityAction: 'DECIDE',
      })
      .expect(201);
    const decisionStep = asWorkflowStepBody(decisionStepResponse.body);

    let issuanceStepId: string | undefined;
    if (options?.includeIssuance && issuanceStageId) {
      const issuanceStepResponse = await authRequest()
        .post(`/api/v1/workflows/versions/${version.id}/steps`)
        .send({
          stageId: issuanceStageId,
          stepKey: 'issue',
          name: 'Issue',
          stepType: WorkflowStepType.ISSUANCE,
          sequence: 4,
          isConsequential: true,
          functionAuthorityRecordId: fixture.humanDecisionAuthorityId,
          requiredAuthorityAction: 'ISSUE',
        })
        .expect(201);
      issuanceStepId = asWorkflowStepBody(issuanceStepResponse.body).id;
    }

    await authRequest()
      .post(`/api/v1/workflows/versions/${version.id}/transitions`)
      .send({ fromStepId: startStep.id, toStepId: reviewStep.id })
      .expect(201);

    await authRequest()
      .post(`/api/v1/workflows/versions/${version.id}/transitions`)
      .send({ fromStepId: reviewStep.id, toStepId: decisionStep.id })
      .expect(201);

    if (issuanceStepId) {
      await authRequest()
        .post(`/api/v1/workflows/versions/${version.id}/transitions`)
        .send({ fromStepId: decisionStep.id, toStepId: issuanceStepId })
        .expect(201);
    }

    return {
      fixture,
      definitionId: definition.id,
      versionId: version.id,
      startStepId: startStep.id,
      reviewStepId: reviewStep.id,
      decisionStepId: decisionStep.id,
      issuanceStepId,
    };
  }

  it('creates workflow versions without creating cases or granting authority', async () => {
    const fixture = await seedServiceForWorkflow();
    const assignmentsBefore = await prisma.functionAuthorityAssignment.count();
    const authorityRecordsBefore = await prisma.functionAuthorityRecord.count();

    const definitionResponse = await authRequest()
      .post('/api/v1/workflows/definitions')
      .send({
        code: 'NON_PRODUCTION-authority-isolation-workflow',
        name: 'Authority Isolation Workflow',
        serviceId: fixture.serviceId,
        responsibleDepartmentId: fixture.departmentId,
      })
      .expect(201);
    const definition = asWorkflowDefinitionBody(definitionResponse.body);

    const versionResponse = await authRequest()
      .post(`/api/v1/workflows/definitions/${definition.id}/versions`)
      .send({
        version: '1.0.0',
        serviceVersionId: fixture.serviceVersionId,
      })
      .expect(201);
    const version = asWorkflowVersionBody(versionResponse.body);

    expect('case' in prisma).toBe(false);

    const assignmentsAfter = await prisma.functionAuthorityAssignment.count();
    const authorityRecordsAfter = await prisma.functionAuthorityRecord.count();

    expect(assignmentsAfter).toBe(assignmentsBefore);
    expect(authorityRecordsAfter).toBe(authorityRecordsBefore);

    const definitionId = definition.id;
    const versionId = version.id;

    const versionsResponse = await authRequest()
      .get(`/api/v1/workflows/definitions/${definitionId}/versions`)
      .expect(200);

    const versions = asWorkflowVersionListBody(versionsResponse.body);
    expect(versions).toHaveLength(1);
    const createdVersion = versions[0];
    expect(createdVersion).toBeDefined();
    expect(createdVersion?.id).toBe(versionId);
    expect(createdVersion?.status).toBe(WorkflowVersionStatus.DRAFT);
  });

  it('validates a complete routing graph', async () => {
    const { versionId } = await createMinimalWorkflowGraph({ includeIssuance: true });

    const validationResponse = await authRequest()
      .post(`/api/v1/workflows/versions/${versionId}/validate`)
      .expect(201);

    const validation = asWorkflowValidationResultBody(validationResponse.body);
    expect(validation.valid).toBe(true);
    expect(validation.issues).toHaveLength(0);
  });

  it('rejects bad edges and unreachable steps', async () => {
    const { versionId, startStepId } = await createMinimalWorkflowGraph();

    const orphanStageResponse = await authRequest()
      .post(`/api/v1/workflows/versions/${versionId}/stages`)
      .send({
        stageKey: 'orphan',
        name: 'Orphan',
        sequence: 99,
        stageType: WorkflowStageType.CLOSURE,
      })
      .expect(201);
    const orphanStage = asWorkflowStageBody(orphanStageResponse.body);

    await authRequest()
      .post(`/api/v1/workflows/versions/${versionId}/steps`)
      .send({
        stageId: orphanStage.id,
        stepKey: 'orphan',
        name: 'Orphan',
        stepType: WorkflowStepType.ADMINISTRATIVE_TASK,
        sequence: 99,
      })
      .expect(201);

    await authRequest()
      .post(`/api/v1/workflows/versions/${versionId}/transitions`)
      .send({
        fromStepId: startStepId,
        toStepId: '00000000-0000-4000-8000-000000000099',
      })
      .expect(400);

    const validationResponse = await authRequest()
      .post(`/api/v1/workflows/versions/${versionId}/validate`)
      .expect(201);

    const validation = asWorkflowValidationResultBody(validationResponse.body);
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((issue) => issue.code === 'UNREACHABLE_STEP')).toBe(true);
  });

  it('rejects AI as final decision step owner', async () => {
    const graph = await createMinimalWorkflowGraph();

    const stagesResponse = await authRequest()
      .get(`/api/v1/workflows/versions/${graph.versionId}/stages`)
      .expect(200);
    const stages = asWorkflowStageListBody(stagesResponse.body);
    const decisionStage = stages.find((stage) => stage.stageKey === 'decision');
    expect(decisionStage).toBeDefined();

    await authRequest()
      .post(`/api/v1/workflows/versions/${graph.versionId}/steps`)
      .send({
        stageId: decisionStage?.id,
        stepKey: 'ai-decide',
        name: 'AI Decide',
        stepType: WorkflowStepType.DECISION,
        sequence: 99,
        isConsequential: true,
        functionAuthorityRecordId: graph.fixture.automatedDecisionAuthorityId,
        requiredAuthorityAction: 'DECIDE',
      })
      .expect(201);

    const validationResponse = await authRequest()
      .post(`/api/v1/workflows/versions/${graph.versionId}/validate`)
      .expect(201);

    const validation = asWorkflowValidationResultBody(validationResponse.body);
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((issue) => issue.code === 'AI_DECISION_OWNER_FORBIDDEN')).toBe(
      true,
    );
  });

  it('distinguishes decision gate from issuance gate', async () => {
    const { versionId } = await createMinimalWorkflowGraph({ includeIssuance: true });

    const stagesResponse = await authRequest()
      .get(`/api/v1/workflows/versions/${versionId}/stages`)
      .expect(200);
    const stages = asWorkflowStageListBody(stagesResponse.body);

    const decisionStage = stages.find((stage) => stage.stageType === 'DECISION_GATE');
    const issuanceStage = stages.find((stage) => stage.stageType === 'ISSUANCE_GATE');

    expect(decisionStage).toBeDefined();
    expect(issuanceStage).toBeDefined();
    expect(decisionStage?.stageType).not.toBe(issuanceStage?.stageType);

    const stepsResponse = await authRequest()
      .get(`/api/v1/workflows/versions/${versionId}/steps`)
      .expect(200);
    const steps = asWorkflowStepListBody(stepsResponse.body);

    const decisionStep = steps.find((step) => step.stepKey === 'decide');
    const issuanceStep = steps.find((step) => step.stepKey === 'issue');

    expect(decisionStep?.stepType).toBe(WorkflowStepType.DECISION);
    expect(issuanceStep?.stepType).toBe(WorkflowStepType.ISSUANCE);
  });

  it('keeps workflow version status distinct from case lifecycle (no case table yet)', async () => {
    const { versionId } = await createMinimalWorkflowGraph();

    const versionResponse = await authRequest()
      .get(`/api/v1/workflows/versions/${versionId}`)
      .expect(200);
    const version = asWorkflowVersionBody(versionResponse.body);

    expect(Object.values(WorkflowVersionStatus)).toContain(version.status);
    expect(version.status).toBe(WorkflowVersionStatus.DRAFT);

    const workflowStatuses = new Set(Object.values(WorkflowVersionStatus));
    const hypotheticalCaseStatuses = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
    for (const caseStatus of hypotheticalCaseStatuses) {
      expect(workflowStatuses.has(caseStatus as WorkflowVersionStatus)).toBe(false);
    }
  });

  it('enforces immutable active versions and supports supersession', async () => {
    const { fixture, definitionId, versionId } = await createMinimalWorkflowGraph({
      includeIssuance: true,
    });

    await prisma.workflowVersion.update({
      where: { id: versionId },
      data: { status: WorkflowVersionStatus.ACTIVE },
    });

    await authRequest()
      .patch(`/api/v1/workflows/versions/${versionId}`)
      .send({ manualFallbackReference: 'should-fail' })
      .expect(400);

    const serviceVersion2 = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: fixture.serviceId,
        version: '2.0.0',
      },
    });

    const newVersionResponse = await authRequest()
      .post(`/api/v1/workflows/definitions/${definitionId}/versions/next`)
      .send({
        version: '2.0.0',
        serviceVersionId: serviceVersion2.id,
      })
      .expect(201);
    const newVersion = asWorkflowVersionBody(newVersionResponse.body);

    const oldVersionResponse = await authRequest()
      .get(`/api/v1/workflows/versions/${versionId}`)
      .expect(200);
    const oldVersion = asWorkflowVersionBody(oldVersionResponse.body);

    expect(oldVersion.status).toBe(WorkflowVersionStatus.SUPERSEDED);
    expect(oldVersion.supersededByVersionId).toBe(newVersion.id);

    const reconstructedResponse = await authRequest()
      .get(`/api/v1/workflows/versions/${versionId}/reconstruct`)
      .expect(200);
    const reconstructed = asWorkflowReconstructBody(reconstructedResponse.body);

    expect(reconstructed.steps.length).toBeGreaterThan(0);
    expect(reconstructed.transitions.length).toBeGreaterThan(0);
    expect(reconstructed.version).toBe('1.0.0');
  });
});

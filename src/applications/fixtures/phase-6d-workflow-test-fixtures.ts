/**
 * NON_PRODUCTION SAMPLE TEST_ONLY
 * Fixtures for Phase 6D workflow runtime tests.
 */
import {
  AuthorityActionType,
  AuthorityClassification,
  CaseStatus,
  IdentityType,
  WorkflowStepType,
  WorkflowTransitionConditionType,
  WorkflowVersionStatus,
} from '@prisma/client';

import { Phase4TestFixtures } from '../../authority/fixtures/phase-4-test-fixtures';
import { type FunctionActivationService } from '../../authority/function-authority-records/function-activation.service';
import { type FunctionAuthorityRecordsService } from '../../authority/function-authority-records/function-authority-records.service';
import { type GoverningSourcesService } from '../../authority/governing-sources/governing-sources.service';
import { type PrismaService } from '../../database/prisma.service';
import { NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER } from '../applications-schema.constants';
import { type WorkflowActorContext } from '../common/workflow-actor.types';

export interface Phase6DWorkflowFixtureContext {
  jurisdictionId: string;
  institutionId: string;
  departmentId: string;
  officeId: string;
  officeholderId: string;
  appointmentId: string;
  authorizedActor: WorkflowActorContext;
  unauthorizedActor: WorkflowActorContext;
  serviceIdentityActor: WorkflowActorContext;
  governmentServiceVersionId: string;
  workflowVersionId: string;
  reviewFunctionId: string;
  decisionFunctionId: string;
  caseId: string;
  parallelWorkflowVersionId: string;
  parallelCaseId: string;
}

export async function seedPhase6DWorkflowFixture(
  prisma: PrismaService,
  governingSources: GoverningSourcesService,
  functions: FunctionAuthorityRecordsService,
  activation: FunctionActivationService,
): Promise<Phase6DWorkflowFixtureContext> {
  const marker = NON_PRODUCTION_APPLICATIONS_FIXTURE_MARKER;
  const phase4 = new Phase4TestFixtures(prisma, governingSources, functions, activation);

  const ctx = await phase4.seedStructuralContext();
  const classifications = await phase4.seedEightClassifications(ctx);

  const ownedFunction = classifications.find(
    (c) => c.classification === AuthorityClassification.ABSEZ_OWNED,
  );
  if (!ownedFunction) {
    throw new Error('Missing ABSEZ_OWNED classification fixture');
  }

  const adminSupport = classifications.find(
    (c) => c.classification === AuthorityClassification.ADMINISTRATIVE_SUPPORT,
  );
  if (!adminSupport) {
    throw new Error('Missing ADMINISTRATIVE_SUPPORT classification fixture');
  }

  const unauthorizedPerson = await prisma.person.create({
    data: { givenName: 'Unauthorized', familyName: 'User' },
  });

  const unauthorizedIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      personId: unauthorizedPerson.id,
      displayName: 'NON_PRODUCTION Unauthorized User',
    },
  });

  const serviceIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.SERVICE,
      displayName: 'NON_PRODUCTION Service Identity',
    },
  });

  const serviceFamily = await prisma.serviceFamily.create({
    data: {
      code: `${marker}-FAMILY`,
      name: 'NON_PRODUCTION Service Family',
    },
  });

  const governmentService = await prisma.governmentService.create({
    data: {
      code: `${marker}-SERVICE`,
      slug: `${marker.toLowerCase()}-service`,
      officialName: 'NON_PRODUCTION Test Service',
      publicName: 'NON_PRODUCTION Test Service',
      responsibleInstitutionId: ctx.institutionId,
      responsibleDepartmentId: (
        await prisma.department.findFirstOrThrow({
          where: { institutionId: ctx.institutionId },
        })
      ).id,
      serviceFamilyId: serviceFamily.id,
    },
  });

  const department = await prisma.department.findFirstOrThrow({
    where: { institutionId: ctx.institutionId },
  });

  const serviceVersion = await prisma.governmentServiceVersion.create({
    data: {
      governmentServiceId: governmentService.id,
      version: '1.0.0',
      maturityStatus: 'ACTIVE',
      publicAvailability: 'ACTIVE',
    },
  });

  const workflowDefinition = await prisma.workflowDefinition.create({
    data: {
      code: `${marker}-WF`,
      name: 'NON_PRODUCTION Sequential Workflow',
      governmentServiceVersionId: serviceVersion.id,
    },
  });

  const workflowVersion = await prisma.workflowVersion.create({
    data: {
      workflowDefinitionId: workflowDefinition.id,
      version: 1,
      status: WorkflowVersionStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  await prisma.workflowStep.createMany({
    data: [
      {
        workflowVersionId: workflowVersion.id,
        stepKey: 'INTAKE',
        label: 'Intake Review',
        stepType: WorkflowStepType.ADMINISTRATIVE,
        stageKey: 'INTAKE',
        sequenceOrder: 0,
        isConsequential: false,
        isHumanRequired: true,
      },
      {
        workflowVersionId: workflowVersion.id,
        stepKey: 'REVIEW',
        label: 'Administrative Review',
        stepType: WorkflowStepType.ADMINISTRATIVE,
        stageKey: 'REVIEW',
        sequenceOrder: 1,
        functionAuthorityRecordId: adminSupport.functionId,
        authorityAction: AuthorityActionType.CHECK,
        isConsequential: true,
        isHumanRequired: true,
        dependsOnStepKeys: ['INTAKE'],
      },
      {
        workflowVersionId: workflowVersion.id,
        stepKey: 'DECISION_GATE',
        label: 'Decision Gate',
        stepType: WorkflowStepType.DECISION_GATE,
        stageKey: 'DECISION',
        sequenceOrder: 2,
        functionAuthorityRecordId: ownedFunction.functionId,
        authorityAction: AuthorityActionType.DECIDE,
        isConsequential: true,
        isHumanRequired: true,
        dependsOnStepKeys: ['REVIEW'],
      },
    ],
  });

  await prisma.workflowTransition.createMany({
    data: [
      {
        workflowVersionId: workflowVersion.id,
        fromStepKey: 'INTAKE',
        toStepKey: 'REVIEW',
        transitionKey: 'INTAKE_TO_REVIEW',
        conditionType: WorkflowTransitionConditionType.STEP_COMPLETED,
        isDefault: true,
      },
      {
        workflowVersionId: workflowVersion.id,
        fromStepKey: 'REVIEW',
        toStepKey: 'DECISION_GATE',
        transitionKey: 'REVIEW_TO_DECISION',
        conditionType: WorkflowTransitionConditionType.STEP_COMPLETED,
        isDefault: true,
      },
      {
        workflowVersionId: workflowVersion.id,
        fromStepKey: 'REVIEW',
        toStepKey: 'INTAKE',
        transitionKey: 'REVIEW_RETURN_CORRECTION',
        conditionType: WorkflowTransitionConditionType.CORRECTION_RETURN,
      },
      {
        workflowVersionId: workflowVersion.id,
        fromStepKey: 'REVIEW',
        toStepKey: 'DECISION_GATE',
        transitionKey: 'REVIEW_ESCALATE',
        conditionType: WorkflowTransitionConditionType.ESCALATION,
      },
    ],
  });

  const caseRecord = await prisma.caseRecord.create({
    data: {
      caseReference: `${marker}-CASE-001`,
      governmentServiceVersionId: serviceVersion.id,
      status: CaseStatus.OPEN,
    },
  });

  const parallelWorkflowDef = await prisma.workflowDefinition.create({
    data: {
      code: `${marker}-PARALLEL-WF`,
      name: 'NON_PRODUCTION Parallel Workflow',
      governmentServiceVersionId: serviceVersion.id,
    },
  });

  const parallelWorkflowVersion = await prisma.workflowVersion.create({
    data: {
      workflowDefinitionId: parallelWorkflowDef.id,
      version: 1,
      status: WorkflowVersionStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  await prisma.workflowStep.createMany({
    data: [
      {
        workflowVersionId: parallelWorkflowVersion.id,
        stepKey: 'SUBMIT',
        label: 'Submit',
        stepType: WorkflowStepType.ADMINISTRATIVE,
        stageKey: 'SUBMIT',
        sequenceOrder: 0,
        isConsequential: false,
        isHumanRequired: true,
      },
      {
        workflowVersionId: parallelWorkflowVersion.id,
        stepKey: 'FORK',
        label: 'Parallel Fork',
        stepType: WorkflowStepType.PARALLEL_FORK,
        stageKey: 'PARALLEL',
        sequenceOrder: 1,
        parallelGroupKey: 'REVIEW_GROUP',
        dependsOnStepKeys: ['SUBMIT'],
        isConsequential: false,
        isHumanRequired: false,
      },
      {
        workflowVersionId: parallelWorkflowVersion.id,
        stepKey: 'REVIEW_A',
        label: 'Review Branch A',
        stepType: WorkflowStepType.ADMINISTRATIVE,
        stageKey: 'REVIEW_A',
        sequenceOrder: 2,
        parallelGroupKey: 'BRANCH_A',
        functionAuthorityRecordId: adminSupport.functionId,
        authorityAction: AuthorityActionType.CHECK,
        isConsequential: true,
        isHumanRequired: true,
      },
      {
        workflowVersionId: parallelWorkflowVersion.id,
        stepKey: 'REVIEW_B',
        label: 'Review Branch B',
        stepType: WorkflowStepType.ADMINISTRATIVE,
        stageKey: 'REVIEW_B',
        sequenceOrder: 3,
        parallelGroupKey: 'BRANCH_B',
        functionAuthorityRecordId: adminSupport.functionId,
        authorityAction: AuthorityActionType.CHECK,
        isConsequential: true,
        isHumanRequired: true,
      },
      {
        workflowVersionId: parallelWorkflowVersion.id,
        stepKey: 'JOIN',
        label: 'Parallel Join',
        stepType: WorkflowStepType.PARALLEL_JOIN,
        stageKey: 'JOIN',
        sequenceOrder: 4,
        requiredJoinBranchKeys: ['BRANCH_A', 'BRANCH_B'],
        isConsequential: false,
        isHumanRequired: false,
      },
    ],
  });

  await prisma.workflowTransition.createMany({
    data: [
      {
        workflowVersionId: parallelWorkflowVersion.id,
        fromStepKey: 'SUBMIT',
        toStepKey: 'FORK',
        transitionKey: 'SUBMIT_TO_FORK',
        conditionType: WorkflowTransitionConditionType.STEP_COMPLETED,
        isDefault: true,
      },
      {
        workflowVersionId: parallelWorkflowVersion.id,
        fromStepKey: 'FORK',
        toStepKey: 'JOIN',
        transitionKey: 'FORK_TO_JOIN',
        conditionType: WorkflowTransitionConditionType.ALL_JOIN_BRANCHES_COMPLETE,
        isDefault: true,
      },
    ],
  });

  const parallelCase = await prisma.caseRecord.create({
    data: {
      caseReference: `${marker}-CASE-PARALLEL`,
      governmentServiceVersionId: serviceVersion.id,
      status: CaseStatus.OPEN,
    },
  });

  return {
    jurisdictionId: (
      await prisma.jurisdiction.findFirstOrThrow({
        where: { institutions: { some: { id: ctx.institutionId } } },
      })
    ).id,
    institutionId: ctx.institutionId,
    departmentId: department.id,
    officeId: ctx.officeId,
    officeholderId: ctx.officeholderId,
    appointmentId: ctx.appointmentId,
    authorizedActor: {
      identityId: ctx.identityId,
      identityType: IdentityType.INDIVIDUAL,
      officeholderId: ctx.officeholderId,
      officeId: ctx.officeId,
      appointmentId: ctx.appointmentId,
    },
    unauthorizedActor: {
      identityId: unauthorizedIdentity.id,
      identityType: IdentityType.INDIVIDUAL,
    },
    serviceIdentityActor: {
      identityId: serviceIdentity.id,
      identityType: IdentityType.SERVICE,
    },
    governmentServiceVersionId: serviceVersion.id,
    workflowVersionId: workflowVersion.id,
    reviewFunctionId: adminSupport.functionId,
    decisionFunctionId: ownedFunction.functionId,
    caseId: caseRecord.id,
    parallelWorkflowVersionId: parallelWorkflowVersion.id,
    parallelCaseId: parallelCase.id,
  };
}

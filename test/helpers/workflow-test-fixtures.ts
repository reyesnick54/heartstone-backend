import {
  AuthorityActionType,
  AuthorityClassification,
  CatalogServiceType,
  ControlledFunctionClass,
  FunctionAuthorityLifecycleStatus,
  JurisdictionType,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { type PrismaService } from '../../src/database/prisma.service';
import { NON_PRODUCTION_WORKFLOW_FIXTURE_MARKER } from '../../src/workflows/workflow.constants';

export interface WorkflowFixtureContext {
  departmentId: string;
  serviceId: string;
  serviceVersionId: string;
  humanDecisionAuthorityId: string;
  automatedDecisionAuthorityId: string;
}

export async function seedWorkflowFixture(prisma: PrismaService): Promise<WorkflowFixtureContext> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: {
      code: `${NON_PRODUCTION_WORKFLOW_FIXTURE_MARKER}-JUR`,
      name: 'Workflow Test Jurisdiction',
      type: JurisdictionType.NATIONAL,
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: `${NON_PRODUCTION_WORKFLOW_FIXTURE_MARKER}-INST`,
      name: 'Workflow Test Institution',
      type: 'AGENCY',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const department = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: `${NON_PRODUCTION_WORKFLOW_FIXTURE_MARKER}-DEPT`,
      name: 'Workflow Test Department',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const serviceFamily = await prisma.serviceFamily.create({
    data: {
      code: `${NON_PRODUCTION_WORKFLOW_FIXTURE_MARKER}-FAMILY`,
      name: 'Workflow Test Family',
      status: StructuralLifecycleStatus.ACTIVE,
    },
  });

  const service = await prisma.governmentService.create({
    data: {
      code: `${NON_PRODUCTION_WORKFLOW_FIXTURE_MARKER}-SERVICE`,
      slug: 'non-production-workflow-service',
      officialName: 'Workflow Test Service',
      publicName: 'Workflow Test Service',
      responsibleInstitutionId: institution.id,
      responsibleDepartmentId: department.id,
      serviceFamilyId: serviceFamily.id,
      catalogServiceType: CatalogServiceType.APPLICATION,
    },
  });

  const serviceVersion = await prisma.governmentServiceVersion.create({
    data: {
      governmentServiceId: service.id,
      version: '1.0.0',
      purpose: 'Workflow test service version',
    },
  });

  const humanDecisionAuthority = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${NON_PRODUCTION_WORKFLOW_FIXTURE_MARKER}-HUMAN-DECIDE`,
      name: 'Human Decision Authority',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.LICENSING,
      institutionId: institution.id,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      actionRights: {
        create: [
          {
            action: AuthorityActionType.DECIDE,
            permitted: true,
            requiresHumanActor: true,
          },
          {
            action: AuthorityActionType.ISSUE,
            permitted: true,
            requiresHumanActor: true,
          },
        ],
      },
    },
  });

  const automatedDecisionAuthority = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${NON_PRODUCTION_WORKFLOW_FIXTURE_MARKER}-AI-DECIDE`,
      name: 'Automated Decision Authority',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.LICENSING,
      institutionId: institution.id,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      actionRights: {
        create: [
          {
            action: AuthorityActionType.DECIDE,
            permitted: true,
            requiresHumanActor: false,
          },
        ],
      },
    },
  });

  return {
    departmentId: department.id,
    serviceId: service.id,
    serviceVersionId: serviceVersion.id,
    humanDecisionAuthorityId: humanDecisionAuthority.id,
    automatedDecisionAuthorityId: automatedDecisionAuthority.id,
  };
}

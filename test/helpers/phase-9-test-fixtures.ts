import { type INestApplication } from '@nestjs/common';
import {
  AuthorityActionType,
  FunctionAssignmentStatus,
  InspectionType,
  OfficialInstrumentStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { NON_PRODUCTION_COMPLIANCE_FIXTURE_MARKER } from '../../src/compliance/compliance.constants';
import {
  issueInstrumentForDecision,
  requirePreRecordedDecision,
  seedPhase8Fixture,
  type Phase8FixtureContext,
} from './phase-8-test-fixtures';

export interface Phase9FixtureContext extends Phase8FixtureContext {
  inspectFunctionAuthorityRecordId: string;
  officialInstrumentId: string;
  complianceMatterId?: string;
  continuingObligationId?: string;
  inspectionTypeDefinitionId?: string;
  inspectionPlanId?: string;
  inspectionSessionId?: string;
}

export async function seedPhase9Fixture(
  app: INestApplication<App>,
  prisma: PrismaService,
  options?: { includeComplianceGraph?: boolean },
): Promise<Phase9FixtureContext> {
  const phase8 = await seedPhase8Fixture(app, prisma, { includePreRecordedDecision: true });

  const issued = await issueInstrumentForDecision(app, phase8, requirePreRecordedDecision(phase8), {
    sealDocumentVersionId: phase8.sealDocumentVersionId,
  });

  const inspectAuthority = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${NON_PRODUCTION_COMPLIANCE_FIXTURE_MARKER}-INSPECT`,
      name: 'Compliance Inspection',
      classification: 'ABSEZ_OWNED',
      functionClass: 'INSPECTION',
      lifecycleStatus: 'ACTIVE',
      institutionId: phase8.institutionId,
      officeId: phase8.officeId,
      actionRights: {
        create: [{ action: AuthorityActionType.INSPECT, permitted: true }],
      },
    },
  });

  await prisma.functionAuthorityAssignment.create({
    data: {
      functionAuthorityRecordId: inspectAuthority.id,
      officeholderId: phase8.officialOfficeholderId,
      officeId: phase8.officeId,
      institutionId: phase8.institutionId,
      status: FunctionAssignmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const base: Phase9FixtureContext = {
    ...phase8,
    inspectFunctionAuthorityRecordId: inspectAuthority.id,
    officialInstrumentId: issued.instrument.id,
  };

  if (!options?.includeComplianceGraph) {
    return base;
  }

  const matter = await prisma.complianceMatter.create({
    data: {
      matterNumber: `${NON_PRODUCTION_COMPLIANCE_FIXTURE_MARKER}-CM-001`,
      subject: 'Continuing compliance monitoring',
      caseId: phase8.caseId,
      officialInstrumentId: issued.instrument.id,
      masterAdministrativeFileId: phase8.masterAdministrativeFileId,
      holderIdentityId: phase8.applicantIdentityId,
      status: 'OPEN',
    },
  });

  const obligation = await prisma.continuingObligation.create({
    data: {
      complianceMatterId: matter.id,
      officialInstrumentId: issued.instrument.id,
      description: 'Submit quarterly compliance report',
      obligationType: 'REPORTING',
      effectiveFrom: new Date('2026-01-01'),
      status: 'ACTIVE',
      schedules: {
        create: {
          frequency: 'QUARTERLY',
          nextDueAt: new Date('2026-04-01'),
        },
      },
    },
  });

  const typeDef = await prisma.inspectionTypeDefinition.create({
    data: {
      code: `${NON_PRODUCTION_COMPLIANCE_FIXTURE_MARKER}-ROUTINE`,
      name: 'Routine compliance inspection',
      inspectionType: InspectionType.COMPLIANCE,
      lifecycleStatus: 'ACTIVE',
    },
  });

  const plan = await prisma.inspectionPlan.create({
    data: {
      planNumber: `${NON_PRODUCTION_COMPLIANCE_FIXTURE_MARKER}-IP-001`,
      complianceMatterId: matter.id,
      officialInstrumentId: issued.instrument.id,
      inspectionTypeDefinitionId: typeDef.id,
      scheduledFor: new Date('2026-05-01'),
      scope: 'Verify quarterly reporting compliance',
      status: 'SCHEDULED',
    },
  });

  const session = await prisma.inspectionSession.create({
    data: {
      sessionNumber: `${NON_PRODUCTION_COMPLIANCE_FIXTURE_MARKER}-IS-001`,
      inspectionPlanId: plan.id,
      complianceMatterId: matter.id,
      caseId: phase8.caseId,
      officialInstrumentId: issued.instrument.id,
      inspectionTypeDefinitionId: typeDef.id,
      functionAuthorityRecordId: inspectAuthority.id,
      status: 'PLANNED',
    },
  });

  await prisma.officialInstrument.update({
    where: { id: issued.instrument.id },
    data: { status: OfficialInstrumentStatus.ISSUED },
  });

  return {
    ...base,
    complianceMatterId: matter.id,
    continuingObligationId: obligation.id,
    inspectionTypeDefinitionId: typeDef.id,
    inspectionPlanId: plan.id,
    inspectionSessionId: session.id,
  };
}

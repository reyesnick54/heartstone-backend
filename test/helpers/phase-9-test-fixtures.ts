import { type INestApplication } from '@nestjs/common';
import {
  AuthorityActionType,
  ContinuingObligationSourceType,
  ContinuingObligationStatus,
  ContinuingObligationType,
  FunctionAssignmentStatus,
  OfficialInstrumentStatus,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { COMPLIANCE_MATTER_NUMBER_PREFIX } from '../../src/compliance/compliance.constants';
import { NON_PRODUCTION_COMPLIANCE_FIXTURE_MARKER } from '../../src/compliance/compliance.constants';
import { type PrismaService } from '../../src/database/prisma.service';
import {
  issueInstrumentForDecision,
  type Phase8FixtureContext,
  requirePreRecordedDecision,
  seedPhase8Fixture,
} from './phase-8-test-fixtures';

export interface Phase9FixtureContext extends Phase8FixtureContext {
  inspectFunctionAuthorityRecordId: string;
  officialInstrumentId: string;
  officialInstrumentVersionId: string;
  complianceMatterId?: string;
  continuingObligationId?: string;
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

  const instrument = await prisma.officialInstrument.findUniqueOrThrow({
    where: { id: issued.instrument.id },
    include: { currentVersion: true },
  });
  if (!instrument.currentVersionId || !instrument.currentVersion) {
    throw new Error('Issued instrument is missing current version for Phase 9 fixture');
  }
  const officialInstrumentVersionId = instrument.currentVersionId;

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
    officialInstrumentId: instrument.id,
    officialInstrumentVersionId,
  };

  if (!options?.includeComplianceGraph) {
    return base;
  }

  const matter = await prisma.complianceMatter.create({
    data: {
      complianceMatterNumber: `${COMPLIANCE_MATTER_NUMBER_PREFIX}-${NON_PRODUCTION_COMPLIANCE_FIXTURE_MARKER}-001`,
      masterAdministrativeFileId: phase8.masterAdministrativeFileId,
      caseId: phase8.caseId,
      officialInstrumentId: instrument.id,
      holderIdentityId: phase8.applicantIdentityId,
      responsibleInstitutionId: phase8.institutionId,
      responsibleDepartmentId: phase8.departmentId,
      status: 'MONITORING',
    },
  });

  const obligation = await prisma.continuingObligation.create({
    data: {
      complianceMatterId: matter.id,
      sourceType: ContinuingObligationSourceType.INSTRUMENT_VERSION,
      sourceInstrumentVersionId: officialInstrumentVersionId,
      obligationCode: `${NON_PRODUCTION_COMPLIANCE_FIXTURE_MARKER}-OBL-001`,
      description: 'Submit quarterly compliance report',
      responsibleParty: 'Holder',
      obligationType: ContinuingObligationType.REPORTING,
      startDate: new Date('2026-01-01'),
      status: ContinuingObligationStatus.NOT_YET_DUE,
      schedules: {
        create: {
          occurrenceNumber: 1,
          scheduledDueDate: new Date('2026-04-01'),
          lawfulDueDate: new Date('2026-04-01'),
        },
      },
    },
  });

  await prisma.officialInstrument.update({
    where: { id: instrument.id },
    data: { status: OfficialInstrumentStatus.ISSUED },
  });

  return {
    ...base,
    complianceMatterId: matter.id,
    continuingObligationId: obligation.id,
  };
}

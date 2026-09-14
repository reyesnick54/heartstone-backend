import {
  AuthorityActionType,
  AuthorityClassification,
  ControlledFunctionClass,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  GoverningSourceStatus,
} from '@prisma/client';

import { type PrismaService } from '../../src/database/prisma.service';
import { type ApplicationProcessingFixtureContext } from './application-processing-test-fixtures';

export const NON_PRODUCTION_FINANCIAL_FIXTURE_MARKER = 'NON_PRODUCTION_FINANCIAL';

export async function seedFinancialAuthorityFixture(
  prisma: PrismaService,
  fixture: ApplicationProcessingFixtureContext,
): Promise<{
  governingSourceId: string;
  functionAuthorityRecordId: string;
}> {
  const marker = NON_PRODUCTION_FINANCIAL_FIXTURE_MARKER;

  const governingSource = await prisma.governingSource.create({
    data: {
      code: `${marker}-GOV-SRC`,
      title: 'Fee Schedule Governing Source',
      versionLabel: '1.0.0',
      status: GoverningSourceStatus.AUTHENTICATED,
      effectiveFrom: new Date('2020-01-01'),
      authenticatedAt: new Date('2020-01-01'),
      contentHash: `${marker}-hash`,
    },
  });

  const office = await prisma.office.findFirstOrThrow({
    where: { departmentId: fixture.departmentId },
  });

  const functionRecord = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${marker}-ADMIN-FUNC`,
      name: 'Fee Schedule Administration Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.ADMINISTRATIVE,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: fixture.institutionId,
      officeId: office.id,
      activatedAt: new Date('2020-01-01'),
      requiresAppointment: true,
      governingSources: {
        create: { governingSourceId: governingSource.id, isPrimary: true },
      },
      actionRights: {
        create: [
          { action: AuthorityActionType.ADMINISTER, permitted: true, requiresHumanActor: true },
        ],
      },
      assignments: {
        create: {
          officeholderId: fixture.officeholderId,
          officeId: office.id,
          institutionId: fixture.institutionId,
          status: FunctionAssignmentStatus.ACTIVE,
          effectiveFrom: new Date('2020-01-01'),
        },
      },
    },
  });

  return {
    governingSourceId: governingSource.id,
    functionAuthorityRecordId: functionRecord.id,
  };
}

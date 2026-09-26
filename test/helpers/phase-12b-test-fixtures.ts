import { randomUUID } from 'node:crypto';

import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AppointmentStatus,
  DashboardAccessPurpose,
  DashboardColorSemantic,
  DashboardConsoleType,
  type DashboardDataQuality,
  DashboardDrilldownReferenceType,
  DashboardFilterDimension,
  DashboardIndicatorCategory,
  DashboardSensitivityLevel,
  DashboardSourceAvailability,
  DashboardStalenessState,
  DashboardStatusDictionaryOwnerType,
  IdentityOfficeholderLinkStatus,
  IdentityType,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import {
  createPasswordAuthenticationMethodViaPrisma,
  createPasswordCredentialViaPrisma,
  ensureTechnicalPermissionsForIdentity,
  loginAndGetSessionToken,
} from './identity-provisioning.fixture';

export interface Phase12BFixtureContext {
  institutionId: string;
  departmentAId: string;
  departmentBId: string;
  executiveIdentityId: string;
  executiveSessionToken: string;
  deptAIdentityId: string;
  deptASessionToken: string;
  deptBIdentityId: string;
  deptBSessionToken: string;
  technicalAdminIdentityId: string;
  technicalAdminSessionToken: string;
  authoritativeRecordId: string;
  evidencePacketId: string;
  executiveDashboardId: string;
  executiveVersionId: string;
  departmentalDashboardId: string;
  departmentalVersionId: string;
  statusEntryId: string;
  positiveStatusEntryId: string;
  indicatorDefinitionId: string;
  evidenceRequiredIndicatorId: string;
}

export async function seedPhase12BFixture(
  prisma: PrismaService,
  app?: INestApplication<App>,
): Promise<Phase12BFixtureContext> {
  const jurisdiction = await prisma.jurisdiction.create({
    data: { code: 'PH12B', name: 'Phase 12B Jurisdiction', type: 'NATIONAL' },
  });

  const institution = await prisma.institution.create({
    data: {
      jurisdictionId: jurisdiction.id,
      code: 'PH12B-INST',
      name: 'Phase 12B Institution',
      type: 'MINISTRY',
    },
  });

  const departmentA = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: 'DEPT-A',
      name: 'Department A',
    },
  });

  const departmentB = await prisma.department.create({
    data: {
      institutionId: institution.id,
      code: 'DEPT-B',
      name: 'Department B',
    },
  });

  const createIdentity = async (name: string) => {
    const person = await prisma.person.create({
      data: { givenName: name, familyName: 'Phase12B' },
    });
    const account = await prisma.userAccount.create({
      data: {
        loginIdentifier: `${name.toLowerCase().replace(/\s+/g, '-')}@phase12b.test`,
        personId: person.id,
        status: AccountStatus.ACTIVE,
      },
    });
    return prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: name,
        userAccountId: account.id,
        personId: person.id,
      },
    });
  };

  const createSessionForIdentity = async (identityId: string, loginIdentifier: string) => {
    if (!app) {
      return '';
    }

    const password = 'Phase12B123!';
    await createPasswordCredentialViaPrisma(prisma, identityId, password);
    await createPasswordAuthenticationMethodViaPrisma(prisma, identityId);
    await ensureTechnicalPermissionsForIdentity(prisma, identityId, {
      institutionIds: [institution.id],
    });
    return loginAndGetSessionToken(app, loginIdentifier, password);
  };

  const executiveIdentity = await createIdentity('Executive User');
  const deptAIdentity = await createIdentity('Dept A User');
  const deptBIdentity = await createIdentity('Dept B User');
  const technicalAdminIdentity = await createIdentity('Technical Admin');

  const executiveSessionToken = await createSessionForIdentity(
    executiveIdentity.id,
    'executive-user@phase12b.test',
  );
  const deptASessionToken = await createSessionForIdentity(
    deptAIdentity.id,
    'dept-a-user@phase12b.test',
  );
  const deptBSessionToken = await createSessionForIdentity(
    deptBIdentity.id,
    'dept-b-user@phase12b.test',
  );
  const technicalAdminSessionToken = await createSessionForIdentity(
    technicalAdminIdentity.id,
    'technical-admin@phase12b.test',
  );

  const linkIdentityToDepartmentOffice = async (
    identityId: string,
    departmentId: string,
    marker: string,
  ) => {
    const office = await prisma.office.create({
      data: {
        departmentId,
        code: `${marker}-OFF`,
        name: `${marker} Office`,
      },
    });

    const officeholder = await prisma.officeholder.create({
      data: {
        code: `${marker}-OH`,
        name: `${marker} Official`,
      },
    });

    await prisma.appointment.create({
      data: {
        officeId: office.id,
        officeholderId: officeholder.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    await prisma.identityOfficeholderLink.create({
      data: {
        identityId,
        officeholderId: officeholder.id,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
  };

  await linkIdentityToDepartmentOffice(executiveIdentity.id, departmentA.id, 'PH12B-EXEC');
  await linkIdentityToDepartmentOffice(deptAIdentity.id, departmentA.id, 'PH12B-DEPT-A');
  await linkIdentityToDepartmentOffice(deptBIdentity.id, departmentB.id, 'PH12B-DEPT-B');
  await linkIdentityToDepartmentOffice(technicalAdminIdentity.id, departmentA.id, 'PH12B-TECH');

  const statusEntry = await prisma.dashboardStatusDictionaryEntry.create({
    data: {
      code: 'ATTENTION_REQUIRED',
      label: 'Attention Required',
      meaning: 'Operational attention signal; does not establish legal status',
      colorSemantic: DashboardColorSemantic.ATTENTION,
      calculationRule: 'count(open_items) > threshold',
      limitations: 'Advisory only',
      stalenessRule: 'stale after 1 hour without refresh',
      ownerType: DashboardStatusDictionaryOwnerType.INSTITUTION,
      ownerReference: institution.id,
      institutionId: institution.id,
    },
  });

  const positiveStatusEntry = await prisma.dashboardStatusDictionaryEntry.create({
    data: {
      code: 'POSITIVE_SIGNAL',
      label: 'Positive Signal',
      meaning: 'Presentation-positive operational signal; not legal compliance',
      colorSemantic: DashboardColorSemantic.POSITIVE_PRESENTATION,
      calculationRule: 'evidence_backed_positive_count',
      limitations: 'Requires evidence packet',
      stalenessRule: 'stale after 30 minutes',
      ownerType: DashboardStatusDictionaryOwnerType.INSTITUTION,
      ownerReference: institution.id,
      institutionId: institution.id,
    },
  });

  await prisma.dashboardStatusDictionaryEntry.createMany({
    data: [
      {
        code: 'RECOMMENDED',
        label: 'Recommended',
        meaning: 'Recommendation only; not approved or issued',
        colorSemantic: DashboardColorSemantic.INFORMATIONAL,
        calculationRule: 'recommendation_count',
        limitations: 'Does not equal approval',
        stalenessRule: 'stale after 2 hours',
        ownerType: DashboardStatusDictionaryOwnerType.PLATFORM,
        ownerReference: 'platform',
      },
      {
        code: 'APPROVED',
        label: 'Approved',
        meaning: 'Institutional approval recorded separately',
        colorSemantic: DashboardColorSemantic.INFORMATIONAL,
        calculationRule: 'approval_count',
        limitations: 'Does not equal issuance',
        stalenessRule: 'stale after 2 hours',
        ownerType: DashboardStatusDictionaryOwnerType.PLATFORM,
        ownerReference: 'platform',
      },
      {
        code: 'REPORTED',
        label: 'Reported',
        meaning: 'Self-reported value; not verified or achieved',
        colorSemantic: DashboardColorSemantic.NEUTRAL,
        calculationRule: 'reported_count',
        limitations: 'Not verified',
        stalenessRule: 'stale after 4 hours',
        ownerType: DashboardStatusDictionaryOwnerType.PLATFORM,
        ownerReference: 'platform',
      },
      {
        code: 'VERIFIED',
        label: 'Verified',
        meaning: 'Independently verified; not achieved',
        colorSemantic: DashboardColorSemantic.INFORMATIONAL,
        calculationRule: 'verified_count',
        limitations: 'Not achievement',
        stalenessRule: 'stale after 4 hours',
        ownerType: DashboardStatusDictionaryOwnerType.PLATFORM,
        ownerReference: 'platform',
      },
    ],
  });

  const indicatorDefinition = await prisma.dashboardIndicatorDefinition.create({
    data: {
      code: 'PENDING_DECISIONS_COUNT',
      label: 'Pending Decisions',
      category: DashboardIndicatorCategory.PENDING_DECISIONS,
      statusDictionaryEntryId: statusEntry.id,
      calculationRuleRef: 'case.pending_decisions',
      requiresEvidencePacket: false,
    },
  });

  const evidenceRequiredIndicator = await prisma.dashboardIndicatorDefinition.create({
    data: {
      code: 'EVIDENCE_BACKED_POSITIVE',
      label: 'Evidence-Backed Positive',
      category: DashboardIndicatorCategory.EVIDENCE_DEFICIENCIES,
      statusDictionaryEntryId: positiveStatusEntry.id,
      calculationRuleRef: 'evidence.positive_signal',
      requiresEvidencePacket: true,
    },
  });

  const executiveDashboard = await prisma.dashboardDefinition.create({
    data: {
      code: 'EXEC-COMMAND',
      name: 'Executive Command Console',
      consoleType: DashboardConsoleType.EXECUTIVE_COMMAND,
      institutionId: institution.id,
      status: 'ACTIVE',
    },
  });

  const executiveVersion = await prisma.dashboardVersion.create({
    data: {
      dashboardDefinitionId: executiveDashboard.id,
      versionNumber: 1,
      status: 'PUBLISHED',
      filterDimensions: [
        DashboardFilterDimension.DEPARTMENT,
        DashboardFilterDimension.SERVICE,
        DashboardFilterDimension.DEADLINE,
      ],
      projectionDisclaimer:
        'Dashboard indicators are derived operational projections. Visibility does not create permission or institutional authority to act.',
      effectiveFrom: new Date(),
    },
  });

  const departmentalDashboard = await prisma.dashboardDefinition.create({
    data: {
      code: 'DEPT-CONSOLE',
      name: 'Departmental Console',
      consoleType: DashboardConsoleType.DEPARTMENTAL,
      institutionId: institution.id,
      departmentId: departmentA.id,
      status: 'ACTIVE',
    },
  });

  const departmentalVersion = await prisma.dashboardVersion.create({
    data: {
      dashboardDefinitionId: departmentalDashboard.id,
      versionNumber: 1,
      status: 'PUBLISHED',
      filterDimensions: [DashboardFilterDimension.DEPARTMENT, DashboardFilterDimension.OWNER],
      projectionDisclaimer:
        'Dashboard indicators are derived operational projections. Visibility does not create permission or institutional authority to act.',
      effectiveFrom: new Date(),
    },
  });

  await prisma.dashboardWidgetDefinition.create({
    data: {
      dashboardVersionId: executiveVersion.id,
      code: 'PENDING_DECISIONS_TILE',
      title: 'Pending Decisions',
      widgetType: 'INDICATOR_TILE',
      indicatorDefinitionId: indicatorDefinition.id,
    },
  });

  await prisma.dashboardAccessPolicy.createMany({
    data: [
      {
        dashboardDefinitionId: executiveDashboard.id,
        identityId: executiveIdentity.id,
        institutionId: institution.id,
        purpose: DashboardAccessPurpose.EXECUTIVE_BRIEFING,
        sensitivityLevel: DashboardSensitivityLevel.RESTRICTED,
        substantiveAccessRequired: true,
      },
      {
        dashboardDefinitionId: departmentalDashboard.id,
        identityId: deptAIdentity.id,
        institutionId: institution.id,
        departmentId: departmentA.id,
        purpose: DashboardAccessPurpose.DEPARTMENT_MANAGEMENT,
        sensitivityLevel: DashboardSensitivityLevel.RESTRICTED,
        substantiveAccessRequired: true,
      },
      {
        dashboardDefinitionId: departmentalDashboard.id,
        identityId: deptBIdentity.id,
        institutionId: institution.id,
        departmentId: departmentB.id,
        purpose: DashboardAccessPurpose.DEPARTMENT_MANAGEMENT,
        sensitivityLevel: DashboardSensitivityLevel.HIGHLY_RESTRICTED,
        substantiveAccessRequired: true,
      },
      {
        dashboardDefinitionId: executiveDashboard.id,
        identityId: technicalAdminIdentity.id,
        institutionId: institution.id,
        purpose: DashboardAccessPurpose.TECHNICAL_OPERATIONS,
        sensitivityLevel: DashboardSensitivityLevel.RESTRICTED,
        technicalPermissionCode: 'TECHNICAL_DASHBOARD_ADMIN',
        substantiveAccessRequired: false,
      },
    ],
  });

  const authoritativeRecordId = randomUUID();
  const evidencePacketId = randomUUID();

  return {
    institutionId: institution.id,
    departmentAId: departmentA.id,
    departmentBId: departmentB.id,
    executiveIdentityId: executiveIdentity.id,
    executiveSessionToken,
    deptAIdentityId: deptAIdentity.id,
    deptASessionToken,
    deptBIdentityId: deptBIdentity.id,
    deptBSessionToken,
    technicalAdminIdentityId: technicalAdminIdentity.id,
    technicalAdminSessionToken,
    authoritativeRecordId,
    evidencePacketId,
    executiveDashboardId: executiveDashboard.id,
    executiveVersionId: executiveVersion.id,
    departmentalDashboardId: departmentalDashboard.id,
    departmentalVersionId: departmentalVersion.id,
    statusEntryId: statusEntry.id,
    positiveStatusEntryId: positiveStatusEntry.id,
    indicatorDefinitionId: indicatorDefinition.id,
    evidenceRequiredIndicatorId: evidenceRequiredIndicator.id,
  };
}

export async function createStaleProjection(
  prisma: PrismaService,
  fixture: Phase12BFixtureContext,
  dataQuality: DashboardDataQuality,
) {
  const staleAfter = new Date(Date.now() - 60 * 60 * 1000);
  const calculatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const projection = await prisma.dashboardIndicatorProjection.create({
    data: {
      indicatorDefinitionId: fixture.indicatorDefinitionId,
      dashboardVersionId: fixture.executiveVersionId,
      statusDictionaryEntryId: fixture.statusEntryId,
      institutionId: fixture.institutionId,
      countValue: 3,
      displayLabel: 'Pending Decisions',
      dataQuality,
      calculatedAt,
      sourceFreshness: calculatedAt,
      staleAfter,
      currentStaleness: DashboardStalenessState.STALE,
      sourceAvailability: DashboardSourceAvailability.DEGRADED,
    },
  });

  await prisma.dashboardDrilldownReference.create({
    data: {
      indicatorProjectionId: projection.id,
      referenceType: DashboardDrilldownReferenceType.UNDERLYING_RECORD,
      referenceId: fixture.authoritativeRecordId,
      referenceLabel: 'Authoritative Record',
      sourceStatus: 'ACTIVE',
      ownerReference: 'department-a',
    },
  });

  return projection;
}

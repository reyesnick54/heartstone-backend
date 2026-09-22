import { type INestApplication } from '@nestjs/common';
import {
  HealthcareConsentType,
  HealthcareIntegrationStandardKind,
  HealthDataRecordSensitivityClassification,
  IdentityType,
} from '@prisma/client';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { HealthcareConsentService } from '../src/healthcare/consent/healthcare-consent.service';
import { HealthDataRegistryService } from '../src/healthcare/data-registry/health-data-registry.service';
import { HealthcareInteropGatewayService } from '../src/healthcare/integrations/healthcare-interop-gateway.service';
import { HealthcarePatientReferenceService } from '../src/healthcare/patient/healthcare-patient-reference.service';
import { ResearchDataGovernanceService } from '../src/healthcare/research/research-data-governance.service';
import { type ActorContext } from '../src/identity/auth/context/actor-context.types';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

function actorFromIdentity(identityId: string): ActorContext {
  return {
    identityId,
    userAccountId: null,
    personId: null,
    sessionId: 'test-session',
    identityType: IdentityType.INDIVIDUAL,
    assuranceLevel: 'HIGH',
    session: {
      sessionId: 'test-session',
      status: 'ACTIVE',
      assuranceLevel: 'HIGH',
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 3_600_000),
      lastUsedAt: null,
      ipAddress: null,
      userAgent: null,
    },
    organizationMemberships: [],
    representativeAuthorities: [],
    officeholderLinks: [],
    activeAppointments: [],
    activeDelegations: [],
    institutionContexts: [],
    hasInstitutionalRelationships: false,
  };
}

describe('Healthcare foundation (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('supports consent grant, audited registry access, and withdrawal preserving history', async () => {
    const patient = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'patient@test.local',
      password: 'Patient123!',
    });
    const clinician = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'clinician@test.local',
      password: 'Clinician123!',
    });

    const patients = app.get(HealthcarePatientReferenceService);
    const patientRef = await patients.ensurePatientReference({
      patientReference: 'PAT-001',
      patientIdentityId: patient.identityId,
    });

    const treatmentPurpose = await prisma.healthcareConsentPurposeDefinition.create({
      data: { purposeCode: 'TREATMENT-CARE', displayName: 'Treatment care' },
    });
    const consentVersion = await prisma.healthcareConsentVersion.create({
      data: {
        versionCode: 'CONSENT-V1',
        purposeId: treatmentPurpose.id,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const source = await prisma.healthDataSource.create({
      data: { sourceCode: 'EHR-REF', displayName: 'Hospital EHR', sourceKind: 'EHR' },
    });

    const consentService = app.get(HealthcareConsentService);
    const { grant } = await consentService.createConsentAndGrant(
      actorFromIdentity(patient.identityId),
      {
        patientReferenceId: patientRef.id,
        consentReference: 'CONSENT-001',
        consentType: HealthcareConsentType.TREATMENT,
        consentVersionId: consentVersion.id,
        purposeCode: 'TREATMENT-CARE',
        grantReference: 'GRANT-001',
        effectiveFrom: new Date(),
        dataCategories: ['labs'],
        recipientCodes: ['care-team'],
      },
    );

    const registry = app.get(HealthDataRegistryService);
    const record = await registry.registerRecordReference({
      recordReference: 'HDR-001',
      patientReferenceId: patientRef.id,
      dataCategoryCode: 'LAB_RESULT',
      sourceId: source.id,
      classification: HealthDataRecordSensitivityClassification.GENERAL,
      consentPurposeCode: 'TREATMENT-CARE',
    });

    const read = await registry.readRecordForActor(
      actorFromIdentity(clinician.identityId),
      record.id,
      {
        purposeCode: 'TREATMENT-CARE',
      },
    );
    expect(read?.recordReference).toBe('HDR-001');

    const accessCount = await prisma.healthDataAccessRecord.count({
      where: { recordReferenceId: record.id },
    });
    expect(accessCount).toBe(1);

    await consentService.withdrawConsentGrant(actorFromIdentity(patient.identityId), grant.id);

    await expect(
      registry.readRecordForActor(actorFromIdentity(clinician.identityId), record.id, {
        purposeCode: 'TREATMENT-CARE',
      }),
    ).rejects.toThrow();

    const historicalConsent = await prisma.healthcareConsent.findUnique({
      where: { consentReference: 'CONSENT-001' },
    });
    expect(historicalConsent).not.toBeNull();
  });

  it('records interoperability provenance and open discrepancy without fabricating success', async () => {
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'HC-JUR', name: 'Healthcare Jurisdiction', type: 'NATIONAL' },
    });
    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: 'HC-INST',
        name: 'Health Institution',
        type: 'AGENCY',
      },
    });

    const definition = await prisma.integrationDefinition.create({
      data: {
        institutionId: institution.id,
        code: 'HEALTH-FHIR-LAB',
        name: 'Healthcare FHIR Lab Adapter',
        status: 'ACTIVE',
      },
    });
    const version = await prisma.integrationVersion.create({
      data: {
        integrationDefinitionId: definition.id,
        versionNumber: '1.0.0',
      },
    });

    const interop = app.get(HealthcareInteropGatewayService);
    const adapter = await interop.registerAdapterDeclaration({
      adapterCode: 'FHIR-LAB-ADAPTER',
      integrationVersionId: version.id,
      standardKind: HealthcareIntegrationStandardKind.HL7_FHIR,
      declaredVersion: 'R4',
      declaredCapability: { resources: ['Patient', 'Observation'] },
      mappingLayerRef: 'mappings/fhir-lab-v1',
    });

    const result = await interop.recordInboundImportWithDiscrepancy({
      adapterId: adapter.id,
      exchangeReference: 'HEX-001',
      inboundProvenance: { sourceSystem: 'external-lab', messageId: 'msg-1' },
      integrationDefinitionId: definition.id,
      fieldReference: 'Observation.value',
      localValue: '5.1',
      externalValue: '7.9',
    });

    expect(result.exchange.succeeded).toBe(false);
    expect(result.discrepancy.status).toBe('OPEN');
  });

  it('expires research access grants', async () => {
    const researcher = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'researcher@test.local',
      password: 'Researcher123!',
    });

    await prisma.researchDataPurpose.create({
      data: { purposeCode: 'TRIAL-ALPHA', displayName: 'Trial Alpha' },
    });

    const research = app.get(ResearchDataGovernanceService);
    const dataset = await research.createDatasetWithProvenance({
      datasetReference: 'RDS-001',
      purposeCode: 'TRIAL-ALPHA',
      ethicsApprovalRef: 'ETH-001',
      protocolReference: 'PROT-001',
    });

    const grant = await research.grantResearchAccess({
      datasetId: dataset.id,
      approvalReference: 'APP-001',
      grantReference: 'RAG-001',
      researcherIdentityId: researcher.identityId,
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(
      research.assertResearcherDatasetAccess(actorFromIdentity(researcher.identityId), grant.id),
    ).rejects.toBeDefined();
  });
});

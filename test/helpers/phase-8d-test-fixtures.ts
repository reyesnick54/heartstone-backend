import { type INestApplication } from '@nestjs/common';
import {
  AppointmentStatus,
  AssuranceLevel,
  AuthorityActionType,
  AuthorityClassification,
  ControlledFunctionClass,
  DocumentSourceType,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  KeyProtectionType,
  MalwareScanStatus,
  RevocationCheckMethod,
} from '@prisma/client';

import { Phase4TestFixtures } from '../../src/authority/fixtures/phase-4-test-fixtures';
import { FunctionActivationService } from '../../src/authority/function-authority-records/function-activation.service';
import { FunctionAuthorityRecordsService } from '../../src/authority/function-authority-records/function-authority-records.service';
import { GoverningSourcesService } from '../../src/authority/governing-sources/governing-sources.service';
import { type PrismaService } from '../../src/database/prisma.service';
import { NON_PRODUCTION_PHASE_8D_FIXTURE_MARKER } from '../../src/decisions-issuance/decisions-issuance.constants';
import { DeterministicTestDigitalSignatureProvider } from '../../src/decisions-issuance/signature-seal/adapters/deterministic-test-digital-signature-provider.adapter';
import { ElectronicSignatureAuthorizationService } from '../../src/decisions-issuance/signature-seal/electronic-signature-authorization.service';
import { ElectronicSignatureCredentialService } from '../../src/decisions-issuance/signature-seal/electronic-signature-credential.service';
import { SignableInstrumentBindingService } from '../../src/decisions-issuance/signature-seal/signable-instrument-binding.service';
import { hashDocumentContent } from '../../src/evidence-records/common/document-hash.util';

export interface Phase8dFixtureContext {
  institutionId: string;
  officeId: string;
  officeholderId: string;
  appointmentId: string;
  identityId: string;
  functionAuthorityRecordId: string;
  credentialReferenceId: string;
  authorizationId: string;
  documentRecordId: string;
  documentVersionId: string;
  documentHash: string;
  bindingId: string;
  instrumentType: string;
  secondOfficeholderId: string;
  secondIdentityId: string;
  secondAppointmentId: string;
}

export async function seedPhase8dFixture(
  app: INestApplication,
  prisma: PrismaService,
): Promise<Phase8dFixtureContext> {
  const fixtures = new Phase4TestFixtures(
    prisma,
    app.get(GoverningSourcesService),
    app.get(FunctionAuthorityRecordsService),
    app.get(FunctionActivationService),
  );

  const ctx = await fixtures.seedStructuralContext();

  const functionRecord = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${NON_PRODUCTION_PHASE_8D_FIXTURE_MARKER}-SIGN`,
      name: 'NON_PRODUCTION Sign Decision Documents',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.LICENSING,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId: ctx.institutionId,
      officeId: ctx.officeId,
      requiresDelegation: false,
      activatedAt: new Date('2020-01-01'),
    },
  });

  await prisma.authorityActionRight.create({
    data: {
      functionAuthorityRecordId: functionRecord.id,
      action: AuthorityActionType.SIGN,
      permitted: true,
    },
  });

  await prisma.functionAuthorityAssignment.create({
    data: {
      functionAuthorityRecordId: functionRecord.id,
      officeId: ctx.officeId,
      officeholderId: ctx.officeholderId,
      status: FunctionAssignmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  const governingSources = app.get(GoverningSourcesService);
  const source = await governingSources.create({
    code: `${NON_PRODUCTION_PHASE_8D_FIXTURE_MARKER}-SRC`,
    title: 'NON_PRODUCTION signing authority source',
    versionLabel: '1.0.0',
    content: 'Test-only governing source for Phase 8D',
    effectiveFrom: '2020-01-01T00:00:00.000Z',
  });
  await governingSources.authenticate(source.id, {
    authenticatedByIdentityId: ctx.actorIdentityId,
  });
  await app.get(FunctionAuthorityRecordsService).linkGoverningSource({
    functionAuthorityRecordId: functionRecord.id,
    governingSourceId: source.id,
  });

  const credentialService = app.get(ElectronicSignatureCredentialService);
  const testProvider = app.get(DeterministicTestDigitalSignatureProvider);
  const credential = await credentialService.createCredentialReference({
    credentialProvider: 'deterministic-test-provider',
    credentialReference: `${NON_PRODUCTION_PHASE_8D_FIXTURE_MARKER}-cred-1`,
    certificateSubject: `CN=${NON_PRODUCTION_PHASE_8D_FIXTURE_MARKER}`,
    certificateSerial: 'TEST-SERIAL-001',
    certificateIssuer: 'TEST-CA',
    algorithm: 'SHA256withRSA-TEST',
    keyProtectionType: KeyProtectionType.TEST_ONLY,
    validFrom: new Date('2020-01-01'),
    validUntil: new Date('2030-12-31'),
    revocationCheckMethod: RevocationCheckMethod.TEST_STUB,
  });
  testProvider.registerCredential({
    credentialProvider: credential.credentialProvider,
    credentialReference: credential.credentialReference,
    certificateSubject: credential.certificateSubject,
    certificateSerial: credential.certificateSerial,
    certificateIssuer: credential.certificateIssuer,
    algorithm: credential.algorithm,
    keyProtectionType: credential.keyProtectionType,
    validFrom: credential.validFrom,
    validUntil: credential.validUntil,
  });

  const authorizationService = app.get(ElectronicSignatureAuthorizationService);
  const authorization = await authorizationService.createAuthorization({
    signatoryIdentityId: ctx.identityId,
    officeholderId: ctx.officeholderId,
    institutionId: ctx.institutionId,
    functionAuthorityRecordId: functionRecord.id,
    permittedInstrumentTypes: ['ADMINISTRATIVE_DECISION'],
    effectiveFrom: new Date('2020-01-01'),
    requiredIdentityAssuranceLevel: AssuranceLevel.MEDIUM,
    requiresMfaAtSigning: false,
    credentialReferenceId: credential.id,
  });

  const content = Buffer.from('Phase 8D test decision document bytes');
  const documentHash = hashDocumentContent(content);

  const documentRecord = await prisma.documentRecord.create({
    data: {
      documentNumber: `${NON_PRODUCTION_PHASE_8D_FIXTURE_MARKER}-DOC-001`,
      title: 'Test Decision Document',
      documentType: 'ADMINISTRATIVE_DECISION',
      sourceType: DocumentSourceType.SYSTEM_GENERATED,
      owningInstitutionId: ctx.institutionId,
    },
  });

  const documentVersion = await prisma.documentVersion.create({
    data: {
      documentRecordId: documentRecord.id,
      versionNumber: 1,
      originalFilename: 'decision.pdf',
      contentType: 'application/pdf',
      sizeBytes: content.length,
      storageProvider: 'in-memory',
      storageObjectKey: `${NON_PRODUCTION_PHASE_8D_FIXTURE_MARKER}/decision.pdf`,
      sha256: documentHash,
      malwareScanStatus: MalwareScanStatus.CLEAN,
    },
  });

  const bindingService = app.get(SignableInstrumentBindingService);
  const binding = await bindingService.createBinding({
    documentRecordId: documentRecord.id,
    documentVersionId: documentVersion.id,
    instrumentType: 'ADMINISTRATIVE_DECISION',
    functionAuthorityRecordId: functionRecord.id,
  });

  const secondOfficeholder = await prisma.officeholder.create({
    data: {
      code: `${NON_PRODUCTION_PHASE_8D_FIXTURE_MARKER}-OH2`,
      name: 'Second Custodian',
    },
  });
  const secondPerson = await prisma.person.create({
    data: { givenName: 'Second', familyName: 'Custodian' },
  });
  const secondIdentity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      personId: secondPerson.id,
      displayName: 'Second Custodian',
    },
  });
  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: secondIdentity.id,
      officeholderId: secondOfficeholder.id,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });
  const secondAppointment = await prisma.appointment.create({
    data: {
      officeId: ctx.officeId,
      officeholderId: secondOfficeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  return {
    institutionId: ctx.institutionId,
    officeId: ctx.officeId,
    officeholderId: ctx.officeholderId,
    appointmentId: ctx.appointmentId,
    identityId: ctx.identityId,
    functionAuthorityRecordId: functionRecord.id,
    credentialReferenceId: credential.id,
    authorizationId: authorization.id,
    documentRecordId: documentRecord.id,
    documentVersionId: documentVersion.id,
    documentHash,
    bindingId: binding.id,
    instrumentType: 'ADMINISTRATIVE_DECISION',
    secondOfficeholderId: secondOfficeholder.id,
    secondIdentityId: secondIdentity.id,
    secondAppointmentId: secondAppointment.id,
  };
}

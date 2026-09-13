import { ForbiddenException } from '@nestjs/common';
import { type INestApplication } from '@nestjs/common';
import {
  AppointmentStatus,
  AssuranceLevel,
  CryptographicCredentialStatus,
  DelegationStatus,
  DocumentSignatureStatus,
  IdentityType,
  SealUseAuthorizationStatus,
  SignatureValidationOutcome,
} from '@prisma/client';

import { type PrismaService } from '../src/database/prisma.service';
import { SIGNATURE_EXPLANATION_CODES } from '../src/decisions-issuance/decisions-issuance.constants';
import { DeterministicTestDigitalSignatureProvider } from '../src/decisions-issuance/signature-seal/adapters/deterministic-test-digital-signature-provider.adapter';
import { scanObjectForPrivateKeyMaterial } from '../src/decisions-issuance/signature-seal/common/private-key-guard.util';
import { ElectronicSealService } from '../src/decisions-issuance/signature-seal/electronic-seal.service';
import { ElectronicSignatureValidationService } from '../src/decisions-issuance/signature-seal/electronic-signature-validation.service';
import { ElectronicSigningService } from '../src/decisions-issuance/signature-seal/electronic-signing.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { type Phase8dFixtureContext, seedPhase8dFixture } from './helpers/phase-8d-test-fixtures';

describe('Phase 8D electronic signature and seal control (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let signingService: ElectronicSigningService;
  let validationService: ElectronicSignatureValidationService;
  let sealService: ElectronicSealService;
  let testProvider: DeterministicTestDigitalSignatureProvider;
  let fixture: Phase8dFixtureContext;

  beforeAll(async () => {
    const setup = await createIntegrationApp();
    app = setup.app;
    prisma = setup.prisma;
    signingService = app.get(ElectronicSigningService);
    validationService = app.get(ElectronicSignatureValidationService);
    sealService = app.get(ElectronicSealService);
    testProvider = app.get(DeterministicTestDigitalSignatureProvider);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    fixture = await seedPhase8dFixture(app, prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs document when authority, credential, and binding are valid', async () => {
    const record = await signingService.signDocument({
      identityId: fixture.identityId,
      officeholderId: fixture.officeholderId,
      appointmentId: fixture.appointmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      documentVersionId: fixture.documentVersionId,
      documentHash: fixture.documentHash,
      instrumentType: fixture.instrumentType,
      intentStatement: 'I intend to sign this official decision document.',
      assuranceLevel: AssuranceLevel.MEDIUM,
      mfaVerified: true,
    });

    expect(record.validationResult).toBe(SignatureValidationOutcome.VALID);
    expect(record.documentHash).toBe(fixture.documentHash);

    const version = await prisma.documentVersion.findUnique({
      where: { id: fixture.documentVersionId },
    });
    expect(version?.signatureStatus).toBe(DocumentSignatureStatus.SIGNED);
  });

  it('rejects copied signature image as invalid signature', () => {
    const result = signingService.validateImageOnlySignature('image:base64-copied-signature');
    expect(result.valid).toBe(false);
    expect(result.outcome).toBe(SignatureValidationOutcome.IMAGE_ONLY);
  });

  it('rejects seal image-only reference', () => {
    const result = sealService.validateImageOnlySeal('image:base64-copied-seal');
    expect(result.valid).toBe(false);
    expect(result.outcome).toBe(SignatureValidationOutcome.IMAGE_ONLY);
  });

  it('fails when credential exists but authority evaluation would deny', async () => {
    await prisma.authorityActionRight.updateMany({
      where: { functionAuthorityRecordId: fixture.functionAuthorityRecordId },
      data: { permitted: false },
    });

    await expect(
      signingService.signDocument({
        identityId: fixture.identityId,
        officeholderId: fixture.officeholderId,
        appointmentId: fixture.appointmentId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        documentVersionId: fixture.documentVersionId,
        documentHash: fixture.documentHash,
        instrumentType: fixture.instrumentType,
        intentStatement: 'Attempted signing without authority.',
        assuranceLevel: AssuranceLevel.MEDIUM,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('fails when authority exists but credential is missing from authorization', async () => {
    await prisma.electronicSignatureAuthorization.update({
      where: { id: fixture.authorizationId },
      data: { credentialReferenceId: null },
    });

    await expect(
      signingService.signDocument({
        identityId: fixture.identityId,
        officeholderId: fixture.officeholderId,
        appointmentId: fixture.appointmentId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        documentVersionId: fixture.documentVersionId,
        documentHash: fixture.documentHash,
        instrumentType: fixture.instrumentType,
        intentStatement: 'Signing without linked credential.',
        assuranceLevel: AssuranceLevel.MEDIUM,
      }),
    ).rejects.toThrow(SIGNATURE_EXPLANATION_CODES.AUTHORITY_WITHOUT_CREDENTIAL);
  });

  it('fails on expired appointment', async () => {
    await prisma.appointment.update({
      where: { id: fixture.appointmentId },
      data: { status: AppointmentStatus.ENDED, effectiveUntil: new Date('2020-01-02') },
    });

    await expect(
      signingService.signDocument({
        identityId: fixture.identityId,
        officeholderId: fixture.officeholderId,
        appointmentId: fixture.appointmentId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        documentVersionId: fixture.documentVersionId,
        documentHash: fixture.documentHash,
        instrumentType: fixture.instrumentType,
        intentStatement: 'Signing with expired appointment.',
        assuranceLevel: AssuranceLevel.MEDIUM,
      }),
    ).rejects.toThrow(SIGNATURE_EXPLANATION_CODES.EXPIRED_APPOINTMENT);
  });

  it('fails on revoked delegation when delegation is supplied', async () => {
    const delegation = await prisma.delegation.create({
      data: {
        institutionId: fixture.institutionId,
        delegatorOfficeId: fixture.officeId,
        recipientOfficeholderId: fixture.officeholderId,
        scopeDescription: 'Test delegation',
        status: DelegationStatus.REVOKED,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    await expect(
      signingService.signDocument({
        identityId: fixture.identityId,
        officeholderId: fixture.officeholderId,
        appointmentId: fixture.appointmentId,
        delegationId: delegation.id,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        documentVersionId: fixture.documentVersionId,
        documentHash: fixture.documentHash,
        instrumentType: fixture.instrumentType,
        intentStatement: 'Signing under revoked delegation.',
        assuranceLevel: AssuranceLevel.MEDIUM,
      }),
    ).rejects.toThrow(SIGNATURE_EXPLANATION_CODES.REVOKED_DELEGATION);
  });

  it('fails on revoked certificate', async () => {
    const credential = await prisma.electronicSignatureCredentialReference.findUnique({
      where: { id: fixture.credentialReferenceId },
    });
    if (!credential) {
      throw new Error('Expected credential fixture');
    }
    testProvider.setRevocationStatus(
      credential.credentialProvider,
      credential.credentialReference,
      CryptographicCredentialStatus.REVOKED,
    );

    await expect(
      signingService.signDocument({
        identityId: fixture.identityId,
        officeholderId: fixture.officeholderId,
        appointmentId: fixture.appointmentId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        documentVersionId: fixture.documentVersionId,
        documentHash: fixture.documentHash,
        instrumentType: fixture.instrumentType,
        intentStatement: 'Signing with revoked certificate.',
        assuranceLevel: AssuranceLevel.MEDIUM,
      }),
    ).rejects.toThrow(SIGNATURE_EXPLANATION_CODES.REVOKED_CERTIFICATE);
  });

  it('fails on wrong instrument type', async () => {
    await expect(
      signingService.signDocument({
        identityId: fixture.identityId,
        officeholderId: fixture.officeholderId,
        appointmentId: fixture.appointmentId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        documentVersionId: fixture.documentVersionId,
        documentHash: fixture.documentHash,
        instrumentType: 'WRONG_INSTRUMENT',
        intentStatement: 'Signing wrong instrument type.',
        assuranceLevel: AssuranceLevel.MEDIUM,
      }),
    ).rejects.toThrow();
  });

  it('invalidates signature validation when document hash changes', async () => {
    const record = await signingService.signDocument({
      identityId: fixture.identityId,
      officeholderId: fixture.officeholderId,
      appointmentId: fixture.appointmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      documentVersionId: fixture.documentVersionId,
      documentHash: fixture.documentHash,
      instrumentType: fixture.instrumentType,
      intentStatement: 'Binding signature to exact document version hash.',
      assuranceLevel: AssuranceLevel.MEDIUM,
    });

    const validation = await validationService.validateSignatureRecord(
      record.id,
      'deadbeef'.repeat(8),
    );
    expect(validation.outcome).toBe(SignatureValidationOutcome.HASH_MISMATCH);
  });

  it('rejects service identity impersonation', async () => {
    const serviceIdentity = await prisma.identity.create({
      data: {
        type: IdentityType.SERVICE,
        displayName: 'Service Bot',
      },
    });

    await expect(
      signingService.signDocument({
        identityId: serviceIdentity.id,
        officeholderId: fixture.officeholderId,
        appointmentId: fixture.appointmentId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        documentVersionId: fixture.documentVersionId,
        documentHash: fixture.documentHash,
        instrumentType: fixture.instrumentType,
        intentStatement: 'Service identity attempted signing.',
        assuranceLevel: AssuranceLevel.HIGH,
      }),
    ).rejects.toThrow(SIGNATURE_EXPLANATION_CODES.SERVICE_IDENTITY_CANNOT_SIGN);
  });

  it('rejects AI actor signing', async () => {
    await expect(
      signingService.signDocument({
        identityId: fixture.identityId,
        officeholderId: fixture.officeholderId,
        appointmentId: fixture.appointmentId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        documentVersionId: fixture.documentVersionId,
        documentHash: fixture.documentHash,
        instrumentType: fixture.instrumentType,
        intentStatement: 'AI attempted signing.',
        assuranceLevel: AssuranceLevel.MEDIUM,
        isAiActor: true,
      }),
    ).rejects.toThrow(SIGNATURE_EXPLANATION_CODES.AI_CANNOT_SIGN);
  });

  it('rejects admin-role-only signing', async () => {
    await expect(
      signingService.signDocument({
        identityId: fixture.identityId,
        officeholderId: fixture.officeholderId,
        appointmentId: fixture.appointmentId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        documentVersionId: fixture.documentVersionId,
        documentHash: fixture.documentHash,
        instrumentType: fixture.instrumentType,
        intentStatement: 'Admin role attempted signing.',
        assuranceLevel: AssuranceLevel.MEDIUM,
        isAdminRoleOnly: true,
      }),
    ).rejects.toThrow(SIGNATURE_EXPLANATION_CODES.ADMIN_CANNOT_SIGN);
  });

  it('preserves historical signature after later certificate revocation', async () => {
    const record = await signingService.signDocument({
      identityId: fixture.identityId,
      officeholderId: fixture.officeholderId,
      appointmentId: fixture.appointmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      documentVersionId: fixture.documentVersionId,
      documentHash: fixture.documentHash,
      instrumentType: fixture.instrumentType,
      intentStatement: 'Historical signature preservation test.',
      assuranceLevel: AssuranceLevel.MEDIUM,
    });

    const credential = await prisma.electronicSignatureCredentialReference.findUnique({
      where: { id: fixture.credentialReferenceId },
    });
    if (!credential) {
      throw new Error('Expected credential fixture');
    }
    testProvider.setRevocationStatus(
      credential.credentialProvider,
      credential.credentialReference,
      CryptographicCredentialStatus.REVOKED,
    );

    const preserved = await prisma.electronicSignatureRecord.findUnique({
      where: { id: record.id },
    });
    expect(preserved).not.toBeNull();
    expect(preserved?.certificateStatusAtSigning).toBe(CryptographicCredentialStatus.ACTIVE);

    const validation = await validationService.validateSignatureRecord(record.id);
    expect(validation.historicalPreserved).toBe(true);
    expect(validation.currentCertificateRevoked).toBe(true);
  });

  it('enforces dual-control self-approval failure for seal application', async () => {
    const seal = await sealService.createSealDefinition({
      institutionalOwnerId: fixture.institutionId,
      sealCode: 'TEST-SEAL-001',
      name: 'Test Institutional Seal',
      permittedInstrumentTypes: [fixture.instrumentType],
      credentialReferenceId: fixture.credentialReferenceId,
      dualControlRequired: true,
      effectiveFrom: new Date('2020-01-01'),
    });

    const custody = await sealService.assignCustody({
      sealId: seal.id,
      custodianOfficeholderId: fixture.officeholderId,
      custodianIdentityId: fixture.identityId,
      effectiveFrom: new Date('2020-01-01'),
    });

    const authorization = await sealService.requestSealUse({
      sealId: seal.id,
      signableInstrumentBindingId: fixture.bindingId,
      documentVersionId: fixture.documentVersionId,
      documentHash: fixture.documentHash,
      instrumentType: fixture.instrumentType,
      preparerIdentityId: fixture.identityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      officeholderId: fixture.officeholderId,
      appointmentId: fixture.appointmentId,
      expirationAt: new Date('2030-12-31'),
    });

    await expect(
      sealService.approveAndApplySeal({
        authorizationId: authorization.id,
        approverIdentityId: fixture.identityId,
        approverOfficeholderId: fixture.officeholderId,
        custodyAssignmentId: custody.id,
      }),
    ).rejects.toThrow(SIGNATURE_EXPLANATION_CODES.SELF_APPROVAL_DENIED);
  });

  it('rejects revoked seal', async () => {
    const seal = await sealService.createSealDefinition({
      institutionalOwnerId: fixture.institutionId,
      sealCode: 'TEST-SEAL-REVOKED',
      name: 'Revoked Seal',
      permittedInstrumentTypes: [fixture.instrumentType],
      credentialReferenceId: fixture.credentialReferenceId,
      effectiveFrom: new Date('2020-01-01'),
    });

    await prisma.electronicSealDefinition.update({
      where: { id: seal.id },
      data: { status: 'REVOKED' },
    });

    await expect(
      sealService.requestSealUse({
        sealId: seal.id,
        signableInstrumentBindingId: fixture.bindingId,
        documentVersionId: fixture.documentVersionId,
        documentHash: fixture.documentHash,
        instrumentType: fixture.instrumentType,
        preparerIdentityId: fixture.identityId,
        functionAuthorityRecordId: fixture.functionAuthorityRecordId,
        officeholderId: fixture.officeholderId,
        appointmentId: fixture.appointmentId,
        expirationAt: new Date('2030-12-31'),
      }),
    ).rejects.toThrow(SIGNATURE_EXPLANATION_CODES.REVOKED_SEAL);
  });

  it('never persists private key material in signature records', async () => {
    const record = await signingService.signDocument({
      identityId: fixture.identityId,
      officeholderId: fixture.officeholderId,
      appointmentId: fixture.appointmentId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      documentVersionId: fixture.documentVersionId,
      documentHash: fixture.documentHash,
      instrumentType: fixture.instrumentType,
      intentStatement: 'Private key guard test.',
      assuranceLevel: AssuranceLevel.MEDIUM,
    });

    const violations = scanObjectForPrivateKeyMaterial(record);
    expect(violations).toHaveLength(0);
    expect(record.signatureValueReference).not.toMatch(/PRIVATE KEY/i);
  });

  it('documents signing events as append-only', () => {
    expect(validationService.assertSigningRecordAppendOnly()).toBe(
      SIGNATURE_EXPLANATION_CODES.SIGNING_EVENT_APPEND_ONLY,
    );
  });

  it('applies seal with dual control when approver differs from preparer', async () => {
    const seal = await sealService.createSealDefinition({
      institutionalOwnerId: fixture.institutionId,
      sealCode: 'TEST-SEAL-DUAL',
      name: 'Dual Control Seal',
      permittedInstrumentTypes: [fixture.instrumentType],
      credentialReferenceId: fixture.credentialReferenceId,
      dualControlRequired: true,
      effectiveFrom: new Date('2020-01-01'),
    });

    const custody = await sealService.assignCustody({
      sealId: seal.id,
      custodianOfficeholderId: fixture.secondOfficeholderId,
      custodianIdentityId: fixture.secondIdentityId,
      effectiveFrom: new Date('2020-01-01'),
    });

    const authorization = await sealService.requestSealUse({
      sealId: seal.id,
      signableInstrumentBindingId: fixture.bindingId,
      documentVersionId: fixture.documentVersionId,
      documentHash: fixture.documentHash,
      instrumentType: fixture.instrumentType,
      preparerIdentityId: fixture.identityId,
      functionAuthorityRecordId: fixture.functionAuthorityRecordId,
      officeholderId: fixture.officeholderId,
      appointmentId: fixture.appointmentId,
      expirationAt: new Date('2030-12-31'),
    });

    const useRecord = await sealService.approveAndApplySeal({
      authorizationId: authorization.id,
      approverIdentityId: fixture.secondIdentityId,
      approverOfficeholderId: fixture.secondOfficeholderId,
      custodyAssignmentId: custody.id,
    });

    const updatedAuthorization = await prisma.electronicSealUseAuthorization.findUnique({
      where: { id: authorization.id },
    });
    expect(updatedAuthorization?.status).toBe(SealUseAuthorizationStatus.APPLIED);
    expect(useRecord.validationOutcome).toBe(SignatureValidationOutcome.VALID);
  });
});

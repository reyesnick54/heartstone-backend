import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CryptographicCredentialStatus,
  DelegationStatus,
  DocumentSignatureStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  Prisma,
  SignatureValidationOutcome,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { SIGNATURE_EXPLANATION_CODES } from '../decisions-issuance.constants';
import { meetsAssuranceLevel } from './common/assurance-level.util';
import {
  assertNoPrivateKeyMaterial,
  scanObjectForPrivateKeyMaterial,
} from './common/private-key-guard.util';
import { ElectronicSignatureAuthorizationService } from './electronic-signature-authorization.service';
import { ElectronicSignatureCredentialService } from './electronic-signature-credential.service';
import {
  DIGITAL_SIGNATURE_PROVIDER_PORT,
  type DigitalSignatureProviderPort,
} from './ports/digital-signature-provider.port';
import { SignableInstrumentBindingService } from './signable-instrument-binding.service';

export interface SignDocumentInput {
  identityId: string;
  officeholderId: string;
  appointmentId: string;
  delegationId?: string;
  functionAuthorityRecordId: string;
  documentVersionId: string;
  documentHash: string;
  instrumentType: string;
  intentStatement: string;
  assuranceLevel: string;
  mfaVerified?: boolean;
  isAiActor?: boolean;
  isAdminRoleOnly?: boolean;
}

@Injectable()
export class ElectronicSigningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly authorizationService: ElectronicSignatureAuthorizationService,
    private readonly credentialService: ElectronicSignatureCredentialService,
    private readonly bindingService: SignableInstrumentBindingService,
    @Inject(DIGITAL_SIGNATURE_PROVIDER_PORT)
    private readonly signatureProvider: DigitalSignatureProviderPort,
  ) {}

  async signDocument(input: SignDocumentInput) {
    const at = new Date();
    assertNoPrivateKeyMaterial(input.intentStatement, 'intentStatement');

    // 1. authenticate current human actor
    const identity = await this.prisma.identity.findUnique({ where: { id: input.identityId } });
    if (!identity) {
      throw new NotFoundException('Signatory identity not found');
    }

    // service identity cannot impersonate signatory; AI cannot sign; admin role cannot sign
    if (identity.type === IdentityType.SERVICE) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.SERVICE_IDENTITY_CANNOT_SIGN);
    }
    if (input.isAiActor) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.AI_CANNOT_SIGN);
    }
    if (input.isAdminRoleOnly) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.ADMIN_CANNOT_SIGN);
    }

    // 2. verify identity assurance
    const authorization = await this.authorizationService.findActiveAuthorization({
      signatoryIdentityId: input.identityId,
      officeholderId: input.officeholderId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      instrumentType: input.instrumentType,
      at,
    });

    if (
      !meetsAssuranceLevel(
        input.assuranceLevel as never,
        authorization.requiredIdentityAssuranceLevel,
      )
    ) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.IDENTITY_ASSURANCE_INSUFFICIENT);
    }

    // 14. apply MFA if configured
    if (authorization.requiresMfaAtSigning && !input.mfaVerified) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.MFA_REQUIRED);
    }

    // 3. verify current Officeholder link
    const officeholderLink = await this.prisma.identityOfficeholderLink.findFirst({
      where: {
        identityId: input.identityId,
        officeholderId: input.officeholderId,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
    if (!officeholderLink) {
      throw new ForbiddenException('Active officeholder link required');
    }

    // 4. verify current Appointment
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: input.appointmentId },
    });
    if (!appointment) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.EXPIRED_APPOINTMENT);
    }
    if (
      appointment.officeholderId !== input.officeholderId ||
      appointment.status !== AppointmentStatus.ACTIVE ||
      appointment.effectiveFrom > at ||
      (appointment.effectiveUntil != null && appointment.effectiveUntil < at)
    ) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.EXPIRED_APPOINTMENT);
    }

    // 5. verify Delegation if applicable
    if (input.delegationId) {
      const delegation = await this.prisma.delegation.findUnique({
        where: { id: input.delegationId },
      });
      if (!delegation) {
        throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.REVOKED_DELEGATION);
      }
      if (
        delegation.status !== DelegationStatus.ACTIVE ||
        delegation.effectiveFrom > at ||
        (delegation.effectiveUntil != null && delegation.effectiveUntil < at)
      ) {
        throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.REVOKED_DELEGATION);
      }
    }

    // 6. run fresh Phase 4 SIGN authority evaluation
    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.identityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.SIGN,
      officeholderId: input.officeholderId,
      appointmentId: input.appointmentId,
      delegationId: input.delegationId,
      at,
    });
    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.CREDENTIAL_WITHOUT_AUTHORITY);
    }

    // 7-8. verify authorization and instrument type (done in findActiveAuthorization)

    // 9. verify decision state permits signing
    const binding = await this.bindingService.assertSigningPermitted(
      input.documentVersionId,
      input.instrumentType,
    );

    // 10. verify exact immutable document/version hash
    const documentVersion = await this.prisma.documentVersion.findUnique({
      where: { id: input.documentVersionId },
      include: { documentRecord: true },
    });
    if (!documentVersion) {
      throw new NotFoundException('Document version not found');
    }
    if (documentVersion.sha256 !== input.documentHash) {
      throw new BadRequestException(SIGNATURE_EXPLANATION_CODES.HASH_MISMATCH);
    }

    if (!authorization.credentialReferenceId) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.AUTHORITY_WITHOUT_CREDENTIAL);
    }

    // 11-12. verify certificate valid and not revoked
    const { credential, certificateStatus, revocationStatus } =
      await this.credentialService.validateCredentialFresh(authorization.credentialReferenceId, at);

    if (
      certificateStatus.status === CryptographicCredentialStatus.REVOKED ||
      revocationStatus.status === CryptographicCredentialStatus.REVOKED
    ) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.REVOKED_CERTIFICATE);
    }

    // 13. explicit intent captured in intentStatement (validated non-empty)
    if (!input.intentStatement.trim()) {
      throw new BadRequestException('Explicit intent to sign is required');
    }

    // 15-16. sign exact digest and preserve signature evidence (append-only)
    const prepared = await this.signatureProvider.prepareSigningRequest({
      digest: documentVersion.sha256,
      credentialReference: credential.credentialReference,
      credentialProvider: credential.credentialProvider,
      signatorySubject: credential.certificateSubject,
    });
    const signature = await this.signatureProvider.signDigest(prepared.requestId, prepared.digest);

    const privateKeyViolations = scanObjectForPrivateKeyMaterial(signature);
    if (privateKeyViolations.length > 0) {
      throw new Error(SIGNATURE_EXPLANATION_CODES.PRIVATE_KEY_NEVER_PERSISTED);
    }

    const record = await this.prisma.electronicSignatureRecord.create({
      data: {
        signatoryIdentityId: input.identityId,
        officeholderId: input.officeholderId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        authorizationId: authorization.id,
        documentRecordId: documentVersion.documentRecordId,
        documentVersionId: input.documentVersionId,
        documentHash: documentVersion.sha256,
        instrumentType: input.instrumentType,
        signatureMethod: prepared.algorithm,
        provider: credential.credentialProvider,
        credentialReferenceId: credential.id,
        signedAt: at,
        intentStatement: input.intentStatement,
        signatureValueReference: signature.signatureValueReference,
        timestampEvidence: signature.timestampEvidence as Prisma.InputJsonValue,
        certificateStatusAtSigning: certificateStatus.status,
        revocationStatusAtSigning: revocationStatus.status,
        validationResult: SignatureValidationOutcome.VALID,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        integrityEvidence: {
          bindingId: binding.id,
          requestId: prepared.requestId,
        },
      },
    });

    await this.prisma.documentVersion.update({
      where: { id: input.documentVersionId },
      data: { signatureStatus: DocumentSignatureStatus.SIGNED },
    });

    await this.bindingService.markSigned(input.documentVersionId, input.instrumentType);

    return record;
  }

  validateImageOnlySignature(signatureValueReference: string) {
    if (signatureValueReference.startsWith('image:')) {
      return {
        valid: false,
        outcome: SignatureValidationOutcome.IMAGE_ONLY,
        message: SIGNATURE_EXPLANATION_CODES.IMAGE_ONLY_SIGNATURE,
      };
    }
    return {
      valid: false,
      outcome: SignatureValidationOutcome.SIGNATURE_NOT_BOUND,
      message: 'Signature reference is not cryptographically bound',
    };
  }
}

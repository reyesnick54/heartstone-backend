import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  DocumentSealStatus,
  ElectronicSealDefinitionStatus,
  SealCustodyAssignmentStatus,
  SealUseAuthorizationStatus,
  SignatureValidationOutcome,
} from '@prisma/client';

import { isEffectiveAt } from '../../authority/common/effective-period.util';
import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { SIGNATURE_EXPLANATION_CODES } from '../decisions-issuance.constants';
import { ElectronicSignatureCredentialService } from './electronic-signature-credential.service';
import {
  DIGITAL_SIGNATURE_PROVIDER_PORT,
  type DigitalSignatureProviderPort,
} from './ports/digital-signature-provider.port';
import { SignableInstrumentBindingService } from './signable-instrument-binding.service';

export interface CreateSealDefinitionInput {
  institutionalOwnerId: string;
  sealCode: string;
  name: string;
  permittedInstrumentTypes: string[];
  credentialReferenceId: string;
  dualControlRequired?: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
}

export interface AssignSealCustodyInput {
  sealId: string;
  custodianOfficeholderId: string;
  custodianIdentityId: string;
  custodianOfficeId?: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
}

export interface RequestSealUseInput {
  sealId: string;
  signableInstrumentBindingId: string;
  documentVersionId: string;
  documentHash: string;
  instrumentType: string;
  preparerIdentityId: string;
  functionAuthorityRecordId: string;
  officeholderId: string;
  appointmentId?: string;
  expirationAt: Date;
}

export interface ApproveSealUseInput {
  authorizationId: string;
  approverIdentityId: string;
  approverOfficeholderId: string;
  custodyAssignmentId: string;
  sealImageReference?: string;
}

@Injectable()
export class ElectronicSealService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly credentialService: ElectronicSignatureCredentialService,
    private readonly bindingService: SignableInstrumentBindingService,
    @Inject(DIGITAL_SIGNATURE_PROVIDER_PORT)
    private readonly signatureProvider: DigitalSignatureProviderPort,
  ) {}

  async createSealDefinition(input: CreateSealDefinitionInput) {
    return this.prisma.electronicSealDefinition.create({
      data: {
        institutionalOwnerId: input.institutionalOwnerId,
        sealCode: input.sealCode,
        name: input.name,
        permittedInstrumentTypes: input.permittedInstrumentTypes,
        credentialReferenceId: input.credentialReferenceId,
        dualControlRequired: input.dualControlRequired ?? true,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        status: ElectronicSealDefinitionStatus.ACTIVE,
      },
    });
  }

  async assignCustody(input: AssignSealCustodyInput) {
    return this.prisma.electronicSealCustodyAssignment.create({
      data: {
        sealId: input.sealId,
        custodianOfficeholderId: input.custodianOfficeholderId,
        custodianIdentityId: input.custodianIdentityId,
        custodianOfficeId: input.custodianOfficeId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        status: SealCustodyAssignmentStatus.ACTIVE,
      },
    });
  }

  async requestSealUse(input: RequestSealUseInput) {
    const seal = await this.prisma.electronicSealDefinition.findUnique({
      where: { id: input.sealId },
    });
    if (!seal) {
      throw new NotFoundException('Seal definition not found');
    }
    if (
      seal.status === ElectronicSealDefinitionStatus.REVOKED ||
      seal.status === ElectronicSealDefinitionStatus.COMPROMISED
    ) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.REVOKED_SEAL);
    }

    const permitted = seal.permittedInstrumentTypes as string[];
    if (!permitted.includes(input.instrumentType)) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.WRONG_INSTRUMENT_TYPE);
    }

    const authorityResult = await this.authorityEvaluation.evaluate({
      identityId: input.preparerIdentityId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.SIGN,
      officeholderId: input.officeholderId,
      appointmentId: input.appointmentId,
    });

    if (authorityResult.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.CUSTODIAN_NOT_UNLIMITED);
    }

    const version = await this.prisma.documentVersion.findUnique({
      where: { id: input.documentVersionId },
    });
    if (!version) {
      throw new BadRequestException(SIGNATURE_EXPLANATION_CODES.HASH_MISMATCH);
    }
    if (version.sha256 !== input.documentHash) {
      throw new BadRequestException(SIGNATURE_EXPLANATION_CODES.HASH_MISMATCH);
    }

    return this.prisma.electronicSealUseAuthorization.create({
      data: {
        sealId: input.sealId,
        signableInstrumentBindingId: input.signableInstrumentBindingId,
        documentVersionId: input.documentVersionId,
        documentHash: input.documentHash,
        instrumentType: input.instrumentType,
        authorizedByIdentityId: input.preparerIdentityId,
        authorityEvaluationRecordId: authorityResult.evaluationId,
        expirationAt: input.expirationAt,
        preparerIdentityId: input.preparerIdentityId,
        status: SealUseAuthorizationStatus.PENDING_APPROVAL,
      },
    });
  }

  async approveAndApplySeal(input: ApproveSealUseInput) {
    const authorization = await this.prisma.electronicSealUseAuthorization.findUnique({
      where: { id: input.authorizationId },
      include: { seal: true },
    });
    if (!authorization) {
      throw new NotFoundException('Seal use authorization not found');
    }

    if (authorization.status !== SealUseAuthorizationStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Seal authorization is not pending approval');
    }

    if (authorization.expirationAt < new Date()) {
      throw new BadRequestException('Seal use authorization has expired');
    }

    // dual-control self-approval fails
    if (
      authorization.seal.dualControlRequired &&
      authorization.preparerIdentityId === input.approverIdentityId
    ) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.SELF_APPROVAL_DENIED);
    }

    if (input.sealImageReference?.startsWith('image:')) {
      throw new BadRequestException(SIGNATURE_EXPLANATION_CODES.IMAGE_ONLY_SEAL);
    }

    const seal = authorization.seal;
    if (
      seal.status === ElectronicSealDefinitionStatus.REVOKED ||
      seal.status === ElectronicSealDefinitionStatus.COMPROMISED
    ) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.REVOKED_SEAL);
    }

    const custody = await this.prisma.electronicSealCustodyAssignment.findUnique({
      where: { id: input.custodyAssignmentId },
    });
    if (!custody) {
      throw new ForbiddenException('Active seal custody assignment required');
    }
    if (
      custody.sealId !== seal.id ||
      custody.status !== SealCustodyAssignmentStatus.ACTIVE ||
      !isEffectiveAt(
        { effectiveFrom: custody.effectiveFrom, effectiveUntil: custody.effectiveUntil },
        new Date(),
      )
    ) {
      throw new ForbiddenException('Active seal custody assignment required');
    }

    if (custody.custodianOfficeholderId !== input.approverOfficeholderId) {
      throw new ForbiddenException(SIGNATURE_EXPLANATION_CODES.CUSTODIAN_NOT_UNLIMITED);
    }

    await this.credentialService.validateCredentialFresh(seal.credentialReferenceId);

    const appliedAt = new Date();

    const useRecord = await this.prisma.electronicSealUseRecord.create({
      data: {
        sealId: seal.id,
        documentVersionId: authorization.documentVersionId,
        documentHash: authorization.documentHash,
        custodyAssignmentId: custody.id,
        authorizationId: authorization.id,
        preparerIdentityId: authorization.preparerIdentityId,
        approverIdentityId: input.approverIdentityId,
        custodianOfficeholderId: input.approverOfficeholderId,
        appliedAt,
        validationOutcome: SignatureValidationOutcome.VALID,
        integrityEvidence: {
          sealCode: seal.sealCode,
          dualControl: seal.dualControlRequired,
        },
      },
    });

    await this.prisma.electronicSealUseAuthorization.update({
      where: { id: authorization.id },
      data: {
        status: SealUseAuthorizationStatus.APPLIED,
        approvalAt: appliedAt,
      },
    });

    await this.prisma.documentVersion.update({
      where: { id: authorization.documentVersionId },
      data: { sealStatus: DocumentSealStatus.SEALED },
    });

    await this.bindingService.markSealed(
      authorization.documentVersionId,
      authorization.instrumentType,
    );

    return useRecord;
  }

  validateImageOnlySeal(sealImageReference: string) {
    if (sealImageReference.startsWith('image:')) {
      return {
        valid: false,
        outcome: SignatureValidationOutcome.IMAGE_ONLY,
        message: SIGNATURE_EXPLANATION_CODES.IMAGE_ONLY_SEAL,
      };
    }
    return { valid: false, outcome: SignatureValidationOutcome.INVALID };
  }
}

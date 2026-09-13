import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CryptographicCredentialStatus, SignatureValidationOutcome } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SIGNATURE_EXPLANATION_CODES } from '../decisions-issuance.constants';
import {
  DIGITAL_SIGNATURE_PROVIDER_PORT,
  type DigitalSignatureProviderPort,
} from './ports/digital-signature-provider.port';
@Injectable()
export class ElectronicSignatureValidationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DIGITAL_SIGNATURE_PROVIDER_PORT)
    private readonly signatureProvider: DigitalSignatureProviderPort,
  ) {}

  async validateSignatureRecord(signatureRecordId: string, documentHash?: string) {
    const record = await this.prisma.electronicSignatureRecord.findUnique({
      where: { id: signatureRecordId },
      include: { credentialReference: true },
    });
    if (!record) {
      throw new NotFoundException('Signature record not found');
    }

    const hashToValidate = documentHash ?? record.documentHash;
    const providerResult = await this.signatureProvider.validateSignature({
      digest: hashToValidate,
      signatureValueReference: record.signatureValueReference,
      credentialReference: record.credentialReference.credentialReference,
      credentialProvider: record.credentialReference.credentialProvider,
    });

    const currentCertificateStatus = await this.signatureProvider.getCertificateStatus(
      record.credentialReference.credentialProvider,
      record.credentialReference.credentialReference,
    );
    const currentRevocationStatus = await this.signatureProvider.getRevocationStatus(
      record.credentialReference.credentialProvider,
      record.credentialReference.credentialReference,
    );

    let outcome: SignatureValidationOutcome;
    if (providerResult.outcome === 'IMAGE_ONLY') {
      outcome = SignatureValidationOutcome.IMAGE_ONLY;
    } else if (
      providerResult.outcome === 'HASH_MISMATCH' ||
      hashToValidate !== record.documentHash
    ) {
      outcome = SignatureValidationOutcome.HASH_MISMATCH;
    } else if (!providerResult.valid) {
      outcome = SignatureValidationOutcome.INVALID;
    } else {
      outcome = SignatureValidationOutcome.VALID;
    }

    const validationRecord = await this.prisma.electronicSignatureValidationRecord.create({
      data: {
        signatureRecordId: record.id,
        documentHashAtValidation: hashToValidate,
        validationOutcome: outcome,
        certificateStatus: currentCertificateStatus.status,
        revocationStatus: currentRevocationStatus.status,
        validationEvidence: {
          providerOutcome: providerResult.outcome,
          historicalCertificateStatus: record.certificateStatusAtSigning,
          historicalRevocationStatus: record.revocationStatusAtSigning,
          currentCertificateStatus: currentCertificateStatus.status,
          currentRevocationStatus: currentRevocationStatus.status,
          historicalPreserved: true,
          note: SIGNATURE_EXPLANATION_CODES.HISTORICAL_SIGNATURE_PRESERVED,
        },
      },
    });

    return {
      signatureRecord: record,
      validationRecord,
      outcome,
      historicalPreserved: true,
      currentCertificateRevoked:
        currentRevocationStatus.status === CryptographicCredentialStatus.REVOKED,
    };
  }

  assertSigningRecordAppendOnly() {
    return SIGNATURE_EXPLANATION_CODES.SIGNING_EVENT_APPEND_ONLY;
  }
}

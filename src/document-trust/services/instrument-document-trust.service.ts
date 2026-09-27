import { Inject, Injectable } from '@nestjs/common';
import { DocumentSealStatus, DocumentSignatureStatus } from '@prisma/client';

import { IssuanceBlockedException } from '../../decisions-issuance/common/exceptions/issuance.exceptions';
import {
  DOCUMENT_STORAGE_PORT,
  DocumentStoragePort,
} from '../../evidence-records/ports/document-storage.port';
import { DIGITAL_SIGNING_PORT, DigitalSigningPort } from '../ports/digital-signing.port';
import { DocumentCryptographicEvidenceService } from './document-cryptographic-evidence.service';

export interface ApplyInstrumentDocumentTrustInput {
  content: Buffer;
  contentHash: string;
  storageObjectKey: string;
  signatureRequired: boolean;
  sealRequired: boolean;
  signerContext?: Record<string, string>;
  institutionReference?: string;
}

export interface InstrumentDocumentTrustOutcome {
  signatureStatus: DocumentSignatureStatus;
  sealStatus: DocumentSealStatus;
  signatureEvidence: ReturnType<DocumentCryptographicEvidenceService['toJsonSignatureEvidence']> | null;
  sealEvidence: ReturnType<DocumentCryptographicEvidenceService['toJsonSealEvidence']> | null;
  instrumentSignatureRecord?: Record<string, unknown>;
  instrumentSealRecord?: Record<string, unknown>;
}

@Injectable()
export class InstrumentDocumentTrustService {
  constructor(
    @Inject(DIGITAL_SIGNING_PORT)
    private readonly digitalSigning: DigitalSigningPort,
    @Inject(DOCUMENT_STORAGE_PORT)
    private readonly storage: DocumentStoragePort,
    private readonly evidence: DocumentCryptographicEvidenceService,
  ) {}

  async applyTrust(input: ApplyInstrumentDocumentTrustInput): Promise<InstrumentDocumentTrustOutcome> {
    const integrity = await this.storage.verifyContentIntegrity(
      input.storageObjectKey,
      input.contentHash,
    );
    if (!integrity.valid) {
      throw new IssuanceBlockedException(
        'Stored instrument content failed integrity verification',
        'DOCUMENT_INTEGRITY_FAILED',
      );
    }

    let signatureStatus: DocumentSignatureStatus = DocumentSignatureStatus.NOT_EVALUATED;
    let sealStatus: DocumentSealStatus = DocumentSealStatus.NOT_EVALUATED;
    let signatureEvidence: InstrumentDocumentTrustOutcome['signatureEvidence'] = null;
    let sealEvidence: InstrumentDocumentTrustOutcome['sealEvidence'] = null;
    let instrumentSignatureRecord: Record<string, unknown> | undefined;
    let instrumentSealRecord: Record<string, unknown> | undefined;

    if (input.signatureRequired) {
      const signed = await this.digitalSigning.signContent({
        content: input.content,
        contentHashSha256: input.contentHash,
        signerContext: input.signerContext,
      });
      const verified = await this.digitalSigning.verifySignature({
        content: input.content,
        contentHashSha256: input.contentHash,
        evidence: signed,
      });
      if (!verified.valid) {
        throw new IssuanceBlockedException(
          'Instrument signature verification failed',
          'SIGNATURE_VERIFICATION_FAILED',
        );
      }
      signatureEvidence = this.evidence.toJsonSignatureEvidence(signed);
      signatureStatus = DocumentSignatureStatus.SIGNED;
      instrumentSignatureRecord = { cryptographicEvidence: signatureEvidence };
    }

    if (input.sealRequired) {
      const sealed = await this.digitalSigning.applySeal({
        content: input.content,
        contentHashSha256: input.contentHash,
        institutionReference: input.institutionReference,
      });
      const verified = await this.digitalSigning.verifySeal({
        content: input.content,
        contentHashSha256: input.contentHash,
        evidence: sealed,
      });
      if (!verified.valid) {
        throw new IssuanceBlockedException(
          'Instrument seal verification failed',
          'SEAL_VERIFICATION_FAILED',
        );
      }
      sealEvidence = this.evidence.toJsonSealEvidence(sealed);
      sealStatus = DocumentSealStatus.SEALED;
      instrumentSealRecord = { cryptographicEvidence: sealEvidence };
    }

    return {
      signatureStatus,
      sealStatus,
      signatureEvidence,
      sealEvidence,
      instrumentSignatureRecord,
      instrumentSealRecord,
    };
  }
}

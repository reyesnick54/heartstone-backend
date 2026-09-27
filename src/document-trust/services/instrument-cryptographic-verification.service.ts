import { Inject, Injectable } from '@nestjs/common';
import { DocumentVersion, OfficialInstrument, OfficialInstrumentVersion } from '@prisma/client';

import {
  DOCUMENT_STORAGE_PORT,
  DocumentStoragePort,
} from '../../evidence-records/ports/document-storage.port';
import { DocumentCryptographicEvidenceService } from './document-cryptographic-evidence.service';

export interface InstrumentCryptographicVerificationResult {
  contentHashValid: boolean;
  signatureValid: boolean;
  sealValid: boolean;
  overallCryptographicTrust: boolean;
  details: string[];
}

@Injectable()
export class InstrumentCryptographicVerificationService {
  constructor(
    @Inject(DOCUMENT_STORAGE_PORT)
    private readonly storage: DocumentStoragePort,
    private readonly evidence: DocumentCryptographicEvidenceService,
  ) {}

  async verifyIssuedInstrument(
    instrument: OfficialInstrument,
    instrumentVersion: OfficialInstrumentVersion,
    documentVersion: DocumentVersion | null,
  ): Promise<InstrumentCryptographicVerificationResult> {
    const details: string[] = [];

    if (!documentVersion) {
      return {
        contentHashValid: false,
        signatureValid: false,
        sealValid: false,
        overallCryptographicTrust: false,
        details: ['Missing document version'],
      };
    }

    const integrity = await this.storage.verifyContentIntegrity(
      documentVersion.storageObjectKey,
      documentVersion.sha256,
    );
    const contentHashValid =
      integrity.valid && documentVersion.sha256 === instrumentVersion.contentHash;
    if (!contentHashValid) {
      details.push('Document content hash mismatch');
    }

    let signatureValid = true;
    if (documentVersion.signatureStatus === 'SIGNED') {
      const content = await this.storage.get(documentVersion.storageObjectKey);
      signatureValid = await this.evidence.verifyStoredSignature(
        content,
        documentVersion.sha256,
        documentVersion.signatureEvidence,
      );
      if (!signatureValid) {
        details.push('Signature evidence invalid');
      }
    }

    let sealValid = true;
    if (documentVersion.sealStatus === 'SEALED') {
      const content = await this.storage.get(documentVersion.storageObjectKey);
      sealValid = await this.evidence.verifyStoredSeal(
        content,
        documentVersion.sha256,
        documentVersion.sealEvidence,
      );
      if (!sealValid) {
        details.push('Seal evidence invalid');
      }
    }

    if (instrument.status === 'REVOKED' || instrument.status === 'SUSPENDED') {
      details.push(`Instrument lifecycle state: ${instrument.status}`);
    }

    const overallCryptographicTrust =
      contentHashValid &&
      signatureValid &&
      sealValid &&
      instrument.status !== 'REVOKED' &&
      instrument.status !== 'SUSPENDED';

    return {
      contentHashValid,
      signatureValid,
      sealValid,
      overallCryptographicTrust,
      details,
    };
  }
}

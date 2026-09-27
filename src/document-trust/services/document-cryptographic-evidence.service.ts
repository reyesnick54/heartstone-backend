import { Inject, Injectable } from '@nestjs/common';
import { DocumentSealStatus, DocumentSignatureStatus, Prisma } from '@prisma/client';

import { type StoredSealEvidence, type StoredSignatureEvidence } from '../document-trust.constants';
import {
  DigitalSealEvidence,
  DigitalSignatureEvidence,
  DigitalSigningPort,
} from '../ports/digital-signing.port';
import { DIGITAL_SIGNING_PORT } from '../ports/digital-signing.port';

@Injectable()
export class DocumentCryptographicEvidenceService {
  constructor(
    @Inject(DIGITAL_SIGNING_PORT)
    private readonly digitalSigning: DigitalSigningPort,
  ) {}

  parseSignatureEvidence(value: Prisma.JsonValue | null): StoredSignatureEvidence | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const record = value as Record<string, unknown>;
    if (
      typeof record.algorithmId !== 'string' ||
      typeof record.contentHashSha256 !== 'string' ||
      typeof record.signatureBase64 !== 'string' ||
      typeof record.keyReference !== 'string' ||
      typeof record.providerName !== 'string' ||
      typeof record.signedAt !== 'string'
    ) {
      return null;
    }
    return {
      algorithmId: record.algorithmId as StoredSignatureEvidence['algorithmId'],
      contentHashSha256: record.contentHashSha256,
      signatureBase64: record.signatureBase64,
      keyReference: record.keyReference,
      certificateReference:
        typeof record.certificateReference === 'string' ? record.certificateReference : undefined,
      providerName: record.providerName,
      signedAt: record.signedAt,
      signerContext:
        record.signerContext && typeof record.signerContext === 'object'
          ? (record.signerContext as Record<string, string>)
          : undefined,
      detached: record.detached !== false,
      certificateChainReferences: Array.isArray(record.certificateChainReferences)
        ? record.certificateChainReferences.filter(
            (item): item is string => typeof item === 'string',
          )
        : undefined,
    };
  }

  parseSealEvidence(value: Prisma.JsonValue | null): StoredSealEvidence | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    const record = value as Record<string, unknown>;
    if (
      typeof record.algorithmId !== 'string' ||
      typeof record.contentHashSha256 !== 'string' ||
      typeof record.sealBase64 !== 'string' ||
      typeof record.keyReference !== 'string' ||
      typeof record.providerName !== 'string' ||
      typeof record.sealedAt !== 'string'
    ) {
      return null;
    }
    return {
      algorithmId: record.algorithmId as StoredSealEvidence['algorithmId'],
      contentHashSha256: record.contentHashSha256,
      sealBase64: record.sealBase64,
      keyReference: record.keyReference,
      providerName: record.providerName,
      sealedAt: record.sealedAt,
      institutionReference:
        typeof record.institutionReference === 'string' ? record.institutionReference : undefined,
    };
  }

  toJsonSignatureEvidence(evidence: DigitalSignatureEvidence): StoredSignatureEvidence {
    return {
      algorithmId: evidence.algorithmId,
      contentHashSha256: evidence.contentHashSha256,
      signatureBase64: evidence.signatureBase64,
      keyReference: evidence.keyReference,
      certificateReference: evidence.certificateReference,
      providerName: evidence.providerName,
      signedAt: evidence.signedAt.toISOString(),
      signerContext: evidence.signerContext,
      detached: evidence.detached,
      certificateChainReferences: evidence.certificateChainReferences,
    };
  }

  toJsonSealEvidence(evidence: DigitalSealEvidence): StoredSealEvidence {
    return {
      algorithmId: evidence.algorithmId,
      contentHashSha256: evidence.contentHashSha256,
      sealBase64: evidence.sealBase64,
      keyReference: evidence.keyReference,
      providerName: evidence.providerName,
      sealedAt: evidence.sealedAt.toISOString(),
      institutionReference: evidence.institutionReference,
    };
  }

  hasValidSignatureEvidence(value: Prisma.JsonValue | null): boolean {
    return this.parseSignatureEvidence(value) !== null;
  }

  hasValidSealEvidence(value: Prisma.JsonValue | null): boolean {
    return this.parseSealEvidence(value) !== null;
  }

  signatureStatusFromEvidence(
    status: DocumentSignatureStatus,
    evidence: Prisma.JsonValue | null,
  ): boolean {
    if (status !== DocumentSignatureStatus.SIGNED) {
      return false;
    }
    return this.hasValidSignatureEvidence(evidence);
  }

  sealStatusFromEvidence(status: DocumentSealStatus, evidence: Prisma.JsonValue | null): boolean {
    if (status !== DocumentSealStatus.SEALED) {
      return false;
    }
    return this.hasValidSealEvidence(evidence);
  }

  async verifyStoredSignature(
    content: Buffer,
    contentHashSha256: string,
    evidenceJson: Prisma.JsonValue | null,
  ): Promise<boolean> {
    const stored = this.parseSignatureEvidence(evidenceJson);
    if (!stored) {
      return false;
    }

    const evidence: DigitalSignatureEvidence = {
      algorithmId: stored.algorithmId,
      contentHashSha256: stored.contentHashSha256,
      signatureBase64: stored.signatureBase64,
      keyReference: stored.keyReference,
      certificateReference: stored.certificateReference,
      providerName: stored.providerName,
      signedAt: new Date(stored.signedAt),
      signerContext: stored.signerContext,
      detached: stored.detached,
      certificateChainReferences: stored.certificateChainReferences,
    };

    const result = await this.digitalSigning.verifySignature({
      content,
      contentHashSha256,
      evidence,
    });
    return result.valid;
  }

  async verifyStoredSeal(
    content: Buffer,
    contentHashSha256: string,
    evidenceJson: Prisma.JsonValue | null,
  ): Promise<boolean> {
    const stored = this.parseSealEvidence(evidenceJson);
    if (!stored) {
      return false;
    }

    const evidence: DigitalSealEvidence = {
      algorithmId: stored.algorithmId,
      contentHashSha256: stored.contentHashSha256,
      sealBase64: stored.sealBase64,
      keyReference: stored.keyReference,
      providerName: stored.providerName,
      sealedAt: new Date(stored.sealedAt),
      institutionReference: stored.institutionReference,
    };

    const result = await this.digitalSigning.verifySeal({
      content,
      contentHashSha256,
      evidence,
    });
    return result.valid;
  }
}

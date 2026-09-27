import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { type DocumentTrustConfig } from '../config/document-trust.config';
import { DOCUMENT_TRUST_CONFIG_KEY } from '../document-trust.constants';
import {
  DIGITAL_SIGNING_PROVIDER_EXTERNAL_TRUST_SERVICE,
  SIGNING_ALGORITHM_IDS,
  type SigningAlgorithmId,
} from '../document-trust.constants';
import {
  DigitalSealContentInput,
  DigitalSealEvidence,
  DigitalSealVerificationInput,
  DigitalSignatureEvidence,
  DigitalSignatureVerificationInput,
  DigitalSignContentInput,
  DigitalSigningPort,
  DigitalVerificationResult,
} from '../ports/digital-signing.port';

interface TrustServiceSignResponse {
  signatureBase64?: string;
  sealBase64?: string;
  algorithmId?: string;
  keyReference?: string;
  certificateReference?: string;
  certificateChainReferences?: string[];
  signedAt?: string;
  sealedAt?: string;
}

interface TrustServiceVerifyResponse {
  valid?: boolean;
  reason?: string;
}

@Injectable()
export class ExternalTrustServiceDigitalSigningAdapter implements DigitalSigningPort {
  readonly providerName = DIGITAL_SIGNING_PROVIDER_EXTERNAL_TRUST_SERVICE;
  readonly isProductionAdapter = true;

  constructor(private readonly configService: ConfigService) {}

  async signContent(input: DigitalSignContentInput): Promise<DigitalSignatureEvidence> {
    const config = this.getConfig();
    this.assertConfigured(config);

    const response = await this.post<TrustServiceSignResponse>(config, '/sign', {
      contentHashSha256: input.contentHashSha256,
      contentBase64: input.content.toString('base64'),
      algorithmId: input.algorithmId ?? SIGNING_ALGORITHM_IDS.RSA_PSS_SHA256,
      keyReference: input.keyReference ?? config.digitalSigningKeyReference,
      signerContext: input.signerContext,
      detached: true,
    });

    if (!response.signatureBase64) {
      throw new Error('Trust service did not return signature evidence');
    }

    return {
      algorithmId: response.algorithmId
        ? (response.algorithmId as SigningAlgorithmId)
        : SIGNING_ALGORITHM_IDS.RSA_PSS_SHA256,
      contentHashSha256: input.contentHashSha256,
      signatureBase64: response.signatureBase64,
      keyReference: response.keyReference ?? config.digitalSigningKeyReference ?? 'unknown',
      certificateReference: response.certificateReference,
      providerName: this.providerName,
      signedAt: response.signedAt ? new Date(response.signedAt) : new Date(),
      signerContext: input.signerContext,
      detached: true,
      certificateChainReferences: response.certificateChainReferences,
    };
  }

  async verifySignature(
    input: DigitalSignatureVerificationInput,
  ): Promise<DigitalVerificationResult> {
    const config = this.getConfig();
    this.assertConfigured(config);

    const response = await this.post<TrustServiceVerifyResponse>(config, '/verify-signature', {
      contentHashSha256: input.contentHashSha256,
      contentBase64: input.content.toString('base64'),
      evidence: input.evidence,
    });

    return {
      valid: response.valid === true,
      reason: response.reason,
    };
  }

  async applySeal(input: DigitalSealContentInput): Promise<DigitalSealEvidence> {
    const config = this.getConfig();
    this.assertConfigured(config);

    const response = await this.post<TrustServiceSignResponse>(config, '/seal', {
      contentHashSha256: input.contentHashSha256,
      contentBase64: input.content.toString('base64'),
      algorithmId: input.algorithmId ?? SIGNING_ALGORITHM_IDS.RSA_PSS_SHA256,
      keyReference: input.keyReference ?? config.digitalSigningSealKeyReference,
      institutionReference: input.institutionReference,
    });

    if (!response.sealBase64) {
      throw new Error('Trust service did not return seal evidence');
    }

    return {
      algorithmId: response.algorithmId
        ? (response.algorithmId as SigningAlgorithmId)
        : SIGNING_ALGORITHM_IDS.RSA_PSS_SHA256,
      contentHashSha256: input.contentHashSha256,
      sealBase64: response.sealBase64,
      keyReference: response.keyReference ?? config.digitalSigningSealKeyReference ?? 'unknown',
      providerName: this.providerName,
      sealedAt: response.sealedAt ? new Date(response.sealedAt) : new Date(),
      institutionReference: input.institutionReference,
    };
  }

  async verifySeal(input: DigitalSealVerificationInput): Promise<DigitalVerificationResult> {
    const config = this.getConfig();
    this.assertConfigured(config);

    const response = await this.post<TrustServiceVerifyResponse>(config, '/verify-seal', {
      contentHashSha256: input.contentHashSha256,
      contentBase64: input.content.toString('base64'),
      evidence: input.evidence,
    });

    return {
      valid: response.valid === true,
      reason: response.reason,
    };
  }

  private assertConfigured(config: DocumentTrustConfig): void {
    if (!config.digitalSigningTrustServiceEndpoint) {
      throw new Error('DOCUMENT_SIGNING_TRUST_SERVICE_ENDPOINT is not configured');
    }
  }

  private getConfig(): DocumentTrustConfig {
    return this.configService.getOrThrow<DocumentTrustConfig>(DOCUMENT_TRUST_CONFIG_KEY);
  }

  private async post<T>(config: DocumentTrustConfig, path: string, body: unknown): Promise<T> {
    const endpoint = config.digitalSigningTrustServiceEndpoint;
    if (!endpoint) {
      throw new Error('DOCUMENT_SIGNING_TRUST_SERVICE_ENDPOINT is not configured');
    }

    const response = await fetch(`${endpoint.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Trust service request failed with HTTP ${String(response.status)}`);
    }

    return (await response.json()) as T;
  }
}

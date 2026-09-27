import { createHash, generateKeyPairSync, sign, verify } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import {
  DIGITAL_SIGNING_PROVIDER_TEST,
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

@Injectable()
export class TestDigitalSigningAdapter implements DigitalSigningPort {
  readonly providerName = DIGITAL_SIGNING_PROVIDER_TEST;
  readonly isProductionAdapter = false;

  private readonly keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  private readonly defaultAlgorithm: SigningAlgorithmId = SIGNING_ALGORITHM_IDS.RSA_PSS_SHA256;
  private readonly keyReference = 'test-ephemeral-rsa-2048';

  signContent(input: DigitalSignContentInput): Promise<DigitalSignatureEvidence> {
    const algorithmId = input.algorithmId ?? this.defaultAlgorithm;
    const signature = sign('sha256', input.content, {
      key: this.keyPair.privateKey,
      padding: undefined,
    });

    return Promise.resolve({
      algorithmId,
      contentHashSha256: input.contentHashSha256,
      signatureBase64: signature.toString('base64'),
      keyReference: input.keyReference ?? this.keyReference,
      providerName: this.providerName,
      signedAt: new Date(),
      signerContext: input.signerContext,
      detached: true,
    });
  }

  verifySignature(input: DigitalSignatureVerificationInput): Promise<DigitalVerificationResult> {
    const digest = createHash('sha256').update(input.content).digest('hex');
    if (digest !== input.evidence.contentHashSha256) {
      return Promise.resolve({ valid: false, reason: 'Content hash mismatch' });
    }

    const valid = verify(
      'sha256',
      input.content,
      this.keyPair.publicKey,
      Buffer.from(input.evidence.signatureBase64, 'base64'),
    );

    return Promise.resolve(
      valid ? { valid: true } : { valid: false, reason: 'Signature verification failed' },
    );
  }

  applySeal(input: DigitalSealContentInput): Promise<DigitalSealEvidence> {
    const algorithmId = input.algorithmId ?? this.defaultAlgorithm;
    const seal = sign('sha256', input.content, {
      key: this.keyPair.privateKey,
      padding: undefined,
    });

    return Promise.resolve({
      algorithmId,
      contentHashSha256: input.contentHashSha256,
      sealBase64: seal.toString('base64'),
      keyReference: input.keyReference ?? this.keyReference,
      providerName: this.providerName,
      sealedAt: new Date(),
      institutionReference: input.institutionReference,
    });
  }

  verifySeal(input: DigitalSealVerificationInput): Promise<DigitalVerificationResult> {
    const digest = createHash('sha256').update(input.content).digest('hex');
    if (digest !== input.evidence.contentHashSha256) {
      return Promise.resolve({ valid: false, reason: 'Content hash mismatch' });
    }

    const valid = verify(
      'sha256',
      input.content,
      this.keyPair.publicKey,
      Buffer.from(input.evidence.sealBase64, 'base64'),
    );

    return Promise.resolve(
      valid ? { valid: true } : { valid: false, reason: 'Seal verification failed' },
    );
  }
}

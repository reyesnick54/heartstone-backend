import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  CryptographicCredentialStatus,
  type ElectronicSignatureCredentialReference,
  KeyProtectionType,
  RevocationCheckMethod,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SIGNATURE_EXPLANATION_CODES } from '../decisions-issuance.constants';
import { assertNoPrivateKeyMaterial } from './common/private-key-guard.util';
import {
  DIGITAL_SIGNATURE_PROVIDER_PORT,
  type DigitalSignatureProviderPort,
} from './ports/digital-signature-provider.port';
export interface CreateCredentialReferenceInput {
  credentialProvider: string;
  credentialReference: string;
  certificateSubject: string;
  certificateSerial: string;
  certificateIssuer: string;
  algorithm: string;
  keyProtectionType: KeyProtectionType;
  validFrom: Date;
  validUntil: Date;
  revocationCheckMethod: RevocationCheckMethod;
}

@Injectable()
export class ElectronicSignatureCredentialService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DIGITAL_SIGNATURE_PROVIDER_PORT)
    private readonly signatureProvider: DigitalSignatureProviderPort,
  ) {}

  async createCredentialReference(
    input: CreateCredentialReferenceInput,
  ): Promise<ElectronicSignatureCredentialReference> {
    assertNoPrivateKeyMaterial(input.credentialReference, 'credentialReference');
    assertNoPrivateKeyMaterial(input.certificateSubject, 'certificateSubject');

    return this.prisma.electronicSignatureCredentialReference.create({
      data: {
        credentialProvider: input.credentialProvider,
        credentialReference: input.credentialReference,
        certificateSubject: input.certificateSubject,
        certificateSerial: input.certificateSerial,
        certificateIssuer: input.certificateIssuer,
        algorithm: input.algorithm,
        keyProtectionType: input.keyProtectionType,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        revocationCheckMethod: input.revocationCheckMethod,
        certificateStatus: CryptographicCredentialStatus.ACTIVE,
      },
    });
  }

  async getCredentialReference(id: string): Promise<ElectronicSignatureCredentialReference> {
    const credential = await this.prisma.electronicSignatureCredentialReference.findUnique({
      where: { id },
    });
    if (!credential) {
      throw new NotFoundException(`Credential reference "${id}" was not found`);
    }
    return credential;
  }

  async validateCredentialFresh(id: string, at = new Date()) {
    const credential = await this.getCredentialReference(id);

    const certificateStatus = await this.signatureProvider.getCertificateStatus(
      credential.credentialProvider,
      credential.credentialReference,
    );
    const revocationStatus = await this.signatureProvider.getRevocationStatus(
      credential.credentialProvider,
      credential.credentialReference,
    );

    if (
      certificateStatus.status === CryptographicCredentialStatus.COMPROMISED ||
      certificateStatus.status === CryptographicCredentialStatus.REVOKED ||
      revocationStatus.status === CryptographicCredentialStatus.REVOKED ||
      revocationStatus.status === CryptographicCredentialStatus.COMPROMISED
    ) {
      throw new BadRequestException(SIGNATURE_EXPLANATION_CODES.REVOKED_CERTIFICATE);
    }

    if (
      certificateStatus.status === CryptographicCredentialStatus.EXPIRED ||
      at > credential.validUntil
    ) {
      throw new BadRequestException('Credential is expired');
    }

    await this.prisma.electronicSignatureCredentialReference.update({
      where: { id },
      data: {
        lastValidatedAt: at,
        certificateStatus: certificateStatus.status,
      },
    });

    return { credential, certificateStatus, revocationStatus };
  }

  async updateCredentialStatus(id: string, status: CryptographicCredentialStatus) {
    return this.prisma.electronicSignatureCredentialReference.update({
      where: { id },
      data: { certificateStatus: status },
    });
  }
}

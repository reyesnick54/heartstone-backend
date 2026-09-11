import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AssuranceLevel,
  AuthenticationMethodType,
  CredentialStatus,
  CredentialType,
  IdentityType,
} from '@prisma/client';

import { IDENTITY_CONFIG, type IdentityConfig } from '../../../config/config.constants';
import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../audit/security-audit.service';
import { hashApiKeySecret, verifyApiKeySecret } from '../../common/crypto.util';

export interface ServiceIdentityAuthResult {
  identityId: string;
  serviceCode: string;
  organizationId?: string | null;
  assuranceLevel: AssuranceLevel;
  mfaSatisfied: boolean;
  credentialId: string;
}

@Injectable()
export class ServiceIdentityAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly audit: SecurityAuditService,
  ) {}

  private get identityConfig(): IdentityConfig {
    return this.configService.getOrThrow<IdentityConfig>(IDENTITY_CONFIG);
  }

  /**
   * Authenticates a registered service identity using clientId (displayName) + API key secret.
   * Service identities are never Officeholders and never receive governmental authority.
   */
  async authenticate(clientId: string, clientSecret: string): Promise<ServiceIdentityAuthResult> {
    const identity = await this.prisma.identity.findFirst({
      where: {
        type: IdentityType.SERVICE,
        displayName: clientId,
      },
      include: {
        credentials: {
          where: {
            type: CredentialType.API_KEY,
            status: CredentialStatus.ACTIVE,
          },
        },
      },
    });

    if (!identity) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_FAILURE',
        metadata: { reason: 'service_identity_not_found', clientId },
      });
      throw new UnauthorizedException('Invalid service credentials');
    }

    const pepper = this.identityConfig.serviceCredentialPepper;
    const validCredential = identity.credentials.find((credential) => {
      if (!credential.apiKeyHash) {
        return false;
      }
      return verifyApiKeySecret(clientSecret, credential.apiKeyHash, pepper);
    });

    if (!validCredential) {
      await this.audit.record({
        eventType: 'AUTHENTICATION_FAILURE',
        identityId: identity.id,
        metadata: { reason: 'invalid_service_credential', clientId },
      });
      throw new UnauthorizedException('Invalid service credentials');
    }

    await this.prisma.credential.update({
      where: { id: validCredential.id },
      data: { lastUsedAt: new Date() },
    });

    await this.audit.record({
      eventType: 'SERVICE_IDENTITY_AUTHENTICATED',
      identityId: identity.id,
      metadata: {
        serviceCode: clientId,
        credentialId: validCredential.id,
        authenticationMethod: AuthenticationMethodType.SERVICE_API_KEY,
      },
    });

    return {
      identityId: identity.id,
      serviceCode: clientId,
      organizationId: identity.organizationId,
      assuranceLevel: AssuranceLevel.LOW,
      mfaSatisfied: false,
      credentialId: validCredential.id,
    };
  }

  async revokeCredential(credentialId: string): Promise<void> {
    const credential = await this.prisma.credential.findUnique({ where: { id: credentialId } });
    if (!credential) {
      return;
    }

    await this.prisma.credential.update({
      where: { id: credentialId },
      data: { status: CredentialStatus.REVOKED, revokedAt: new Date() },
    });

    await this.audit.record({
      eventType: 'CREDENTIAL_REVOKED',
      identityId: credential.identityId,
      metadata: { credentialId, type: CredentialType.API_KEY },
    });
  }

  async rotateCredential(
    identityId: string,
    oldCredentialId: string,
    newSecret: string,
  ): Promise<{ credentialId: string }> {
    const pepper = this.identityConfig.serviceCredentialPepper;
    const apiKeyHash = hashApiKeySecret(newSecret, pepper);

    const newCredential = await this.prisma.credential.create({
      data: {
        identityId,
        type: CredentialType.API_KEY,
        status: CredentialStatus.ACTIVE,
        apiKeyHash,
      },
    });

    await this.prisma.credential.update({
      where: { id: oldCredentialId },
      data: { status: CredentialStatus.REVOKED, revokedAt: new Date() },
    });

    await this.audit.record({
      eventType: 'CREDENTIAL_CREATED',
      identityId,
      metadata: {
        credentialId: newCredential.id,
        type: CredentialType.API_KEY,
        rotationFrom: oldCredentialId,
      },
    });

    return { credentialId: newCredential.id };
  }
}

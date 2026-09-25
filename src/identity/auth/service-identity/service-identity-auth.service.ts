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
import { verifyApiKeySecret } from '../../common/crypto.util';

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
}

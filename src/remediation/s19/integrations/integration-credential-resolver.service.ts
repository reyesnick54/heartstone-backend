import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../../database/prisma.service';
import {
  OPERATIONAL_PROVIDERS_CONFIG_KEY,
  type OperationalProvidersConfig,
} from '../config/operational-providers.config';

export interface ResolvedIntegrationCredentials {
  authenticationMethod: string;
  headers: Record<string, string>;
  vaultReference: string;
}

@Injectable()
export class IntegrationCredentialResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async resolveForEndpoint(
    integrationDefinitionId: string,
    authenticationMethod: string | null | undefined,
  ): Promise<ResolvedIntegrationCredentials | null> {
    const credential = await this.prisma.integrationCredentialReference.findFirst({
      where: { integrationDefinitionId },
      orderBy: { createdAt: 'desc' },
    });

    if (!credential) {
      return null;
    }

    const config = this.configService.getOrThrow<OperationalProvidersConfig>(
      OPERATIONAL_PROVIDERS_CONFIG_KEY,
    );
    const prefix = config.integrationCredentialVaultPrefix ?? 'vault://integration/';
    const secretToken = `${prefix}${credential.vaultReference}`;

    const method = (authenticationMethod ?? 'BEARER').toUpperCase();
    const headers: Record<string, string> = {};

    if (method === 'BEARER' || method === 'OAUTH2_CLIENT') {
      headers.authorization = `Bearer ${secretToken}`;
    } else if (method === 'API_KEY') {
      headers['x-api-key'] = secretToken;
    } else if (method === 'MUTUAL_TLS') {
      headers['x-client-cert-reference'] = secretToken;
    } else {
      headers.authorization = `Bearer ${secretToken}`;
    }

    return {
      authenticationMethod: method,
      headers,
      vaultReference: credential.vaultReference,
    };
  }
}

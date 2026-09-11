import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, type JWTVerifyGetKey } from 'jose';

import {
  OIDC_CONFIG,
  type OidcConfig,
  type OidcProviderConfig,
} from '../../../config/config.constants';
import { ClaimMapperService, type RawOidcJwtClaims } from './claim-mapper.service';
import { CompositeJwksResolverService, type JwksResolver } from './jwks-resolver.service';
import type { MappedOidcClaims } from './types/mapped-oidc-claims';

export interface OidcValidationResult {
  claims: MappedOidcClaims;
  provider: OidcProviderConfig;
}

@Injectable()
export class OidcTokenValidatorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly claimMapper: ClaimMapperService,
    private readonly jwksResolver: CompositeJwksResolverService,
  ) {}

  async validateAccessToken(
    token: string,
    providerCode?: string,
    jwksResolver?: JwksResolver,
  ): Promise<OidcValidationResult> {
    const provider = this.resolveProvider(providerCode);
    const keyResolver = jwksResolver ?? this.jwksResolver;
    const getKey = keyResolver.resolve(provider.jwksUri);

    try {
      const { payload } = await jwtVerify(token, getKey, {
        issuer: provider.issuer,
        audience: provider.audience,
        algorithms: provider.allowedAlgorithms,
        clockTolerance: provider.clockToleranceSeconds ?? 0,
      });

      const rawClaims = payload as RawOidcJwtClaims;
      const mapped = this.claimMapper.mapClaims(provider.code, provider.audience, rawClaims);

      return { claims: mapped, provider };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OIDC token validation failed';
      throw new UnauthorizedException(message);
    }
  }

  resolveProvider(providerCode?: string): OidcProviderConfig {
    const oidcConfig = this.configService.get<OidcConfig>(OIDC_CONFIG);
    if (!oidcConfig?.providers.length) {
      throw new UnauthorizedException('No OIDC provider configuration available');
    }

    if (providerCode) {
      const configured = oidcConfig.providers.find((p) => p.code === providerCode);
      if (!configured) {
        throw new UnauthorizedException(`Unknown OIDC provider: ${providerCode}`);
      }
      return configured;
    }

    const defaultProvider = oidcConfig.providers[0];
    if (!defaultProvider) {
      throw new UnauthorizedException('No OIDC provider configuration available');
    }

    return defaultProvider;
  }

  createLocalJwksResolver(jwksUri: string, getKey: JWTVerifyGetKey): JwksResolver {
    return {
      resolve: (uri: string) => {
        if (uri !== jwksUri) {
          throw new UnauthorizedException('Unexpected JWKS URI');
        }
        return getKey;
      },
    };
  }
}

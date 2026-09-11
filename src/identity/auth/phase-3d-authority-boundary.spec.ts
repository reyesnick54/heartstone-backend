/**
 * MUST-FAIL tests: external authentication must never create or imply governmental authority.
 */
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createLocalJWKSet } from 'jose';

import {
  createOidcTestKeyMaterial,
  signOidcTestToken,
  TEST_OIDC_PROVIDER,
} from '../../../test/helpers/oidc-test-fixtures';
import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { AuthorityBoundaryService } from '../common/authority-boundary.service';
import { SessionsService } from '../sessions/sessions.service';
import { ClaimMapperService } from './oidc/claim-mapper.service';
import {
  CompositeJwksResolverService,
  InMemoryJwksResolverService,
  RemoteJwksResolverService,
} from './oidc/jwks-resolver.service';
import { OidcIdentityResolverService } from './oidc/oidc-identity-resolver.service';
import { OidcTokenValidatorService } from './oidc/oidc-token-validator.service';
import { ServiceIdentityAuthService } from './service-identity/service-identity-auth.service';

describe('Phase 3D authority boundary (must-fail)', () => {
  let claimMapper: ClaimMapperService;
  let authorityBoundary: AuthorityBoundaryService;
  let prisma: {
    officeholder: { count: jest.Mock; create: jest.Mock };
    appointment: { count: jest.Mock; create: jest.Mock };
    delegation: { count: jest.Mock; create: jest.Mock };
    credential: { findFirst: jest.Mock; create: jest.Mock };
    identity: { findUnique: jest.Mock; findFirst: jest.Mock };
    session: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      officeholder: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      appointment: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      delegation: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      credential: {
        findFirst: jest.fn().mockResolvedValue({
          identity: {
            id: 'identity-1',
            type: 'INDIVIDUAL',
            userAccountId: 'account-1',
            personId: 'person-1',
            organizationId: null,
          },
        }),
        create: jest.fn(),
      },
      identity: {
        findUnique: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({
          id: 'svc-identity',
          type: 'SERVICE',
          displayName: 'svc-bot',
          organizationId: null,
          credentials: [],
        }),
      },
      session: {
        create: jest.fn().mockResolvedValue({
          id: 'session-1',
          identityId: 'identity-1',
          authMethod: 'OIDC',
          assuranceLevel: 'HIGH',
          mfaSatisfied: true,
          authenticatedAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000),
        }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClaimMapperService,
        AuthorityBoundaryService,
        OidcTokenValidatorService,
        OidcIdentityResolverService,
        RemoteJwksResolverService,
        InMemoryJwksResolverService,
        CompositeJwksResolverService,
        ServiceIdentityAuthService,
        SessionsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({ enabled: true, providers: [TEST_OIDC_PROVIDER] }),
            getOrThrow: jest.fn().mockReturnValue({
              sessionTtlSeconds: 3600,
              sessionTokenBytes: 32,
              serviceCredentialPepper: 'test-pepper-not-production',
            }),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: SecurityAuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    claimMapper = moduleRef.get(ClaimMapperService);
    authorityBoundary = moduleRef.get(AuthorityBoundaryService);
  });

  it('does not create Officeholder from OIDC role claim', async () => {
    const mapped = claimMapper.mapClaims(TEST_OIDC_PROVIDER.code, TEST_OIDC_PROVIDER.audience, {
      iss: TEST_OIDC_PROVIDER.issuer,
      sub: 'role-admin',
      aud: TEST_OIDC_PROVIDER.audience,
      roles: ['admin', 'officer'],
    });

    expect(mapped.externalContext.roles).toContain('admin');
    expect(prisma.officeholder.create).not.toHaveBeenCalled();
    expect(await prisma.officeholder.count()).toBe(0);
    expect(
      authorityBoundary.resolveGovernmentAuthority({ externalClaims: mapped.externalContext }),
    ).toBeNull();
  });

  it('does not create Appointment from OIDC admin claim', () => {
    claimMapper.mapClaims(TEST_OIDC_PROVIDER.code, TEST_OIDC_PROVIDER.audience, {
      iss: TEST_OIDC_PROVIDER.issuer,
      sub: 'admin-user',
      aud: TEST_OIDC_PROVIDER.audience,
      roles: ['admin'],
    });

    expect(prisma.appointment.create).not.toHaveBeenCalled();
    expect(prisma.appointment.count).not.toHaveBeenCalled();
  });

  it('does not create Delegation when MFA succeeds', () => {
    const mapped = claimMapper.mapClaims(TEST_OIDC_PROVIDER.code, TEST_OIDC_PROVIDER.audience, {
      iss: TEST_OIDC_PROVIDER.issuer,
      sub: 'mfa-user',
      aud: TEST_OIDC_PROVIDER.audience,
      amr: ['pwd', 'mfa'],
    });

    expect(mapped.mfaSatisfied).toBe(true);
    expect(prisma.delegation.create).not.toHaveBeenCalled();
    expect(authorityBoundary.resolveGovernmentAuthority({ assuranceLevel: 'HIGH' })).toBeNull();
  });

  it('does not treat external authority-like claims as HeartStone governmental authority', () => {
    const mapped = claimMapper.mapClaims(TEST_OIDC_PROVIDER.code, TEST_OIDC_PROVIDER.audience, {
      iss: TEST_OIDC_PROVIDER.issuer,
      sub: 'authority-user',
      aud: TEST_OIDC_PROVIDER.audience,
      roles: ['approver', 'decision_maker'],
      groups: ['cabinet', 'regulators'],
    });

    const context = claimMapper.extractExternalContextOnly(mapped);
    expect(context).toEqual({
      roles: ['approver', 'decision_maker'],
      groups: ['cabinet', 'regulators'],
    });
    expect(authorityBoundary.resolveGovernmentAuthority({ externalClaims: context })).toBeNull();
  });

  it('service identity authentication does not create Officeholder', async () => {
    const serviceAuth = new ServiceIdentityAuthService(
      prisma as unknown as PrismaService,
      {
        getOrThrow: () => ({ serviceCredentialPepper: 'test-pepper-not-production' }),
      } as unknown as ConfigService,
      { record: jest.fn() } as unknown as SecurityAuditService,
    );

    await expect(serviceAuth.authenticate('svc-bot', 'invalid')).rejects.toThrow();
    expect(prisma.officeholder.create).not.toHaveBeenCalled();
    expect(authorityBoundary.resolveGovernmentAuthority({ identityId: 'svc-identity' })).toBeNull();
  });

  it('OIDC authentication with admin role issues session without governmental side effects', async () => {
    const keyMaterial = await createOidcTestKeyMaterial();
    const inMemoryJwks = new InMemoryJwksResolverService();
    inMemoryJwks.register(
      TEST_OIDC_PROVIDER.jwksUri,
      createLocalJWKSet({ keys: [keyMaterial.publicJwk] }),
    );

    const validator = new OidcTokenValidatorService(
      {
        get: () => ({ enabled: true, providers: [TEST_OIDC_PROVIDER] }),
      } as unknown as ConfigService,
      new ClaimMapperService(),
      new CompositeJwksResolverService(inMemoryJwks, new RemoteJwksResolverService()),
    );

    const token = await signOidcTestToken(keyMaterial, {
      subject: 'oidc-admin',
      roles: ['admin'],
      amr: ['pwd', 'mfa'],
    });

    const validation = await validator.validateAccessToken(
      token,
      TEST_OIDC_PROVIDER.code,
      inMemoryJwks,
    );
    const resolver = new OidcIdentityResolverService(prisma as unknown as PrismaService);
    const resolved = await resolver.resolveIdentity(validation.claims);
    const sessions = new SessionsService(
      prisma as unknown as PrismaService,
      {
        getOrThrow: () => ({
          sessionTtlSeconds: 3600,
          sessionTokenBytes: 32,
          serviceCredentialPepper: 'test-pepper-not-production',
        }),
      } as unknown as ConfigService,
      { record: jest.fn() } as unknown as SecurityAuditService,
    );

    await sessions.authenticateWithOidc(validation.claims, resolved);

    expect(prisma.officeholder.create).not.toHaveBeenCalled();
    expect(prisma.appointment.create).not.toHaveBeenCalled();
    expect(prisma.delegation.create).not.toHaveBeenCalled();
    expect(
      authorityBoundary.resolveGovernmentAuthority({ identityId: resolved.identityId }),
    ).toBeNull();
  });
});

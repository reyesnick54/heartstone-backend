import {
  IdentityType,
  RepresentativeAuthorityStatus,
} from '@prisma/client';

import { InstitutionalScopeService } from './institutional-scope.service';
import {
  type ActorScopeContext,
  ScopeAccessIntent,
  ScopeAccessPath,
  ScopeDenialReason,
  ScopedResourceType,
} from './institutional-scope.types';
import { type ResourceOwnershipResolver } from './resource-ownership.resolver';

describe('InstitutionalScopeService', () => {
  let service: InstitutionalScopeService;
  let resolver: jest.Mocked<ResourceOwnershipResolver>;

  const baseActor = (overrides: Partial<ActorScopeContext> = {}): ActorScopeContext => ({
    identityId: 'actor-1',
    identityType: IdentityType.INDIVIDUAL,
    officialContext: [],
    representativeAuthorities: [],
    organizationMembershipIds: [],
    isTechnicalAdministrator: false,
    ...overrides,
  });

  beforeEach(() => {
    resolver = {
      resolve: jest.fn(),
    } as unknown as jest.Mocked<ResourceOwnershipResolver>;

    service = new InstitutionalScopeService(resolver);
  });

  it('denies when ownership is unresolved for restricted resources', async () => {
    resolver.resolve.mockResolvedValue({
      found: true,
      ownership: { isRestricted: true },
      denialReason: ScopeDenialReason.UNRESOLVED_OWNERSHIP,
    });

    const result = await service.evaluate({
      resourceType: ScopedResourceType.EVIDENCE_RECORD,
      resourceId: 'evidence-1',
      intent: ScopeAccessIntent.VISIBILITY,
      actor: baseActor(),
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(ScopeDenialReason.UNRESOLVED_OWNERSHIP);
  });

  it('grants applicant visibility to own application', async () => {
    resolver.resolve.mockResolvedValue({
      found: true,
      ownership: {
        applicationId: 'app-1',
        applicantIdentityId: 'actor-1',
      },
    });

    const result = await service.evaluate({
      resourceType: ScopedResourceType.APPLICATION,
      resourceId: 'app-1',
      intent: ScopeAccessIntent.VISIBILITY,
      actor: baseActor(),
    });

    expect(result).toMatchObject({
      allowed: true,
      accessPath: ScopeAccessPath.APPLICANT,
    });
  });

  it('denies raw UUID access when actor has no legitimate path', async () => {
    resolver.resolve.mockResolvedValue({
      found: true,
      ownership: {
        caseId: 'case-1',
        applicantIdentityId: 'other-applicant',
        institutionId: 'inst-1',
        departmentId: 'dept-1',
        isRestricted: true,
      },
    });

    const result = await service.evaluate({
      resourceType: ScopedResourceType.CASE,
      resourceId: 'case-1',
      intent: ScopeAccessIntent.VISIBILITY,
      actor: baseActor({ identityId: 'random-citizen' }),
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(ScopeDenialReason.RAW_UUID_INSUFFICIENT);
  });

  it('denies cross-department official access', async () => {
    resolver.resolve.mockResolvedValue({
      found: true,
      ownership: {
        caseId: 'case-1',
        institutionId: 'inst-1',
        departmentId: 'dept-b',
        isRestricted: true,
      },
    });

    const result = await service.evaluate({
      resourceType: ScopedResourceType.CASE,
      resourceId: 'case-1',
      intent: ScopeAccessIntent.VISIBILITY,
      actor: baseActor({
        officialContext: [
          {
            officeholderId: 'oh-1',
            officeIds: ['office-a'],
            departmentIds: ['dept-a'],
            institutionIds: ['inst-1'],
          },
        ],
      }),
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(ScopeDenialReason.CROSS_DEPARTMENT);
  });

  it('denies inactive representative authority', async () => {
    resolver.resolve.mockResolvedValue({
      found: true,
      ownership: {
        applicationId: 'app-1',
        organizationId: 'org-1',
        representativeAuthorityId: 'rep-1',
      },
    });

    const result = await service.evaluate({
      resourceType: ScopedResourceType.APPLICATION,
      resourceId: 'app-1',
      intent: ScopeAccessIntent.VISIBILITY,
      actor: baseActor({
        representativeAuthorities: [
          {
            id: 'rep-1',
            organizationId: 'org-1',
            identityId: 'actor-1',
            status: RepresentativeAuthorityStatus.REVOKED,
            effectiveFrom: new Date('2020-01-01'),
            effectiveUntil: null,
          },
        ],
      }),
      representativeAuthorityId: 'rep-1',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(ScopeDenialReason.INACTIVE_REPRESENTATIVE);
  });

  it('requires authority evaluation for consequential intent without replacing authority engine', async () => {
    resolver.resolve.mockResolvedValue({
      found: true,
      ownership: {
        caseId: 'case-1',
        institutionId: 'inst-1',
        departmentId: 'dept-1',
        isRestricted: true,
      },
    });

    const result = await service.evaluate({
      resourceType: ScopedResourceType.CASE,
      resourceId: 'case-1',
      intent: ScopeAccessIntent.CONSEQUENTIAL_ACTION,
      actor: baseActor({
        officialContext: [
          {
            officeholderId: 'oh-1',
            officeIds: ['office-1'],
            departmentIds: ['dept-1'],
            institutionIds: ['inst-1'],
          },
        ],
      }),
    });

    expect(result.allowed).toBe(true);
    expect(result.requiresAuthorityEvaluation).toBe(true);
  });

  it('denies technical administrator substantive visibility', async () => {
    resolver.resolve.mockResolvedValue({
      found: true,
      ownership: {
        caseId: 'case-1',
        institutionId: 'inst-1',
        departmentId: 'dept-1',
        isRestricted: true,
      },
    });

    const result = await service.evaluate({
      resourceType: ScopedResourceType.CASE,
      resourceId: 'case-1',
      intent: ScopeAccessIntent.VISIBILITY,
      actor: baseActor({ isTechnicalAdministrator: true }),
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(ScopeDenialReason.TECHNICAL_ADMIN_SUBSTANTIVE_DENIED);
  });
});

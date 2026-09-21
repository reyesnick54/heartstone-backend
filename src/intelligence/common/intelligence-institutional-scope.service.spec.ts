import { ForbiddenException } from '@nestjs/common';
import { AssuranceLevel, IdentityType, SessionStatus } from '@prisma/client';

import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { IntelligenceInstitutionalScopeService } from './intelligence-institutional-scope.service';

describe('IntelligenceInstitutionalScopeService', () => {
  const service = new IntelligenceInstitutionalScopeService();

  const actor: ActorContext = {
    identityId: 'identity-a',
    userAccountId: 'account-a',
    personId: 'person-a',
    sessionId: 'session-1',
    identityType: IdentityType.INDIVIDUAL,
    assuranceLevel: AssuranceLevel.MEDIUM,
    session: {
      sessionId: 'session-1',
      status: SessionStatus.ACTIVE,
      assuranceLevel: AssuranceLevel.MEDIUM,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      lastUsedAt: null,
      ipAddress: null,
      userAgent: null,
    },
    organizationMemberships: [],
    representativeAuthorities: [],
    officeholderLinks: [],
    activeAppointments: [
      {
        appointmentId: 'appt-a',
        officeholderId: 'oh-a',
        officeId: 'office-a',
        departmentId: 'dept-a',
        institutionId: 'inst-a',
        status: 'ACTIVE',
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: null,
      },
    ],
    activeDelegations: [],
    institutionContexts: [
      {
        institutionId: 'inst-a',
        departmentIds: ['dept-a'],
        officeIds: ['office-a'],
      },
    ],
    hasInstitutionalRelationships: true,
  };

  it('rejects forged owner identity fields', () => {
    expect(() => {
      service.rejectForgedActorIdentityFields({ ownerIdentityId: 'identity-b' }, actor);
    }).toThrow(ForbiddenException);
  });

  it('rejects forged reviewer identity fields', () => {
    expect(() => {
      service.rejectForgedActorIdentityFields({ reviewerIdentityId: 'identity-b' }, actor);
    }).toThrow(ForbiddenException);
  });

  it('rejects client authority indicators', () => {
    expect(() => {
      service.rejectClientAuthorityIndicators({ authorityGranted: true });
    }).toThrow(ForbiddenException);
  });

  it('blocks cross-institution access', () => {
    expect(() => {
      service.assertInstitutionAccess(actor, 'inst-b');
    }).toThrow(ForbiddenException);
  });

  it('blocks technical access from substantive dashboard action', () => {
    expect(() => {
      service.assertTechnicalAccessNotSubstantiveAuthority(true);
    }).toThrow(ForbiddenException);
  });

  it('blocks AI actors from bypassing actor-context enforcement', () => {
    const aiActor: ActorContext = {
      ...actor,
      identityType: IdentityType.SERVICE,
    };
    expect(() => {
      service.assertAiActorCannotBypassActorContext(aiActor, 'reviewPerformanceClaim');
    }).toThrow(ForbiddenException);
  });
});

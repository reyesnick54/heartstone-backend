import { ForbiddenException } from '@nestjs/common';
import { AssuranceLevel, IdentityType } from '@prisma/client';

import { type ActorContextDto } from '../../identity/auth/dto/actor-context.dto';
import { IntelligenceInstitutionalScopeService } from './intelligence-institutional-scope.service';

describe('IntelligenceInstitutionalScopeService', () => {
  const service = new IntelligenceInstitutionalScopeService();

  const actor: ActorContextDto = {
    sessionId: 'session-1',
    identityId: 'identity-a',
    assuranceLevel: AssuranceLevel.MEDIUM,
    identityType: IdentityType.INDIVIDUAL,
    institutionalScopes: [
      {
        institutionId: 'inst-a',
        departmentId: 'dept-a',
        officeId: 'office-a',
        officeholderId: 'oh-a',
        appointmentId: 'appt-a',
      },
    ],
    isAiActor: false,
    isSuspendedAiAgent: false,
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
    const aiActor: ActorContextDto = {
      sessionId: actor.sessionId,
      identityId: actor.identityId,
      assuranceLevel: actor.assuranceLevel,
      identityType: IdentityType.SERVICE,
      institutionalScopes: actor.institutionalScopes,
      isAiActor: true,
      isSuspendedAiAgent: false,
    };
    expect(() => {
      service.assertAiActorCannotBypassActorContext(aiActor, 'reviewPerformanceClaim');
    }).toThrow(ForbiddenException);
  });
});

import { ForbiddenException } from '@nestjs/common';
import {
  GovernmentDecisionStatus,
  GovernmentServiceMaturityStatus,
  LegalHoldStatus,
} from '@prisma/client';

import { PlatformAdminBoundaryService } from './platform-admin-boundary.service';

describe('PlatformAdminBoundaryService', () => {
  const service = new PlatformAdminBoundaryService();

  it('denies platform admin case approval', () => {
    expect(() => {
      service.assertPlatformAdminCannotApproveCase(true);
    }).toThrow(ForbiddenException);
  });

  it('denies institutional authority creation through configuration', () => {
    expect(() => {
      service.assertPlatformAdminCannotCreateInstitutionalAuthority(true, true);
    }).toThrow(ForbiddenException);
  });

  it('denies direct service activation through generic update', () => {
    expect(() => {
      service.assertNoDirectServiceActivation(GovernmentServiceMaturityStatus.ACTIVE);
    }).toThrow(ForbiddenException);
  });

  it('denies altering finalized government decisions', () => {
    expect(() => {
      service.assertCannotAlterFinalDecision(GovernmentDecisionStatus.FINALIZED);
    }).toThrow(ForbiddenException);
  });

  it('denies mutation under active legal hold', () => {
    expect(() => {
      service.assertLegalHoldBlocksMutation(LegalHoldStatus.ACTIVE);
    }).toThrow(ForbiddenException);
  });

  it('denies AI activation outside approved lifecycle', () => {
    expect(() => {
      service.assertAiActivationRequiresApprovedLifecycle(true);
    }).toThrow(ForbiddenException);
  });
});

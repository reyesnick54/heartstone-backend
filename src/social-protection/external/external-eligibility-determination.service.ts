import { createHash, randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  ExternalDeterminationStatus,
  ExternalEligibilityDeterminationRecordedBy,
  SocialProtectionActorPersona,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SocialProtectionBoundaryService } from '../common/social-protection-boundary.service';
import { EXTERNAL_ELIGIBILITY_DETERMINATION_PREFIX } from '../social-protection.constants';

@Injectable()
export class ExternalEligibilityDeterminationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: SocialProtectionBoundaryService,
  ) {}

  async recordDetermination(
    actorPersona: SocialProtectionActorPersona,
    input: {
      benefitEligibilityAssessmentId?: string;
      caseId?: string;
      externalAuthorityId: string;
      determinationStatus: ExternalDeterminationStatus;
      isRequired?: boolean;
      blocksDecisionWhenRequired?: boolean;
      isAuthenticated: boolean;
      authenticatedPayload?: Record<string, unknown>;
      recordedBy: ExternalEligibilityDeterminationRecordedBy;
      recordedByIdentityId?: string;
    },
  ) {
    this.boundary.rejectApplicantForgedExternalDetermination(
      {
        isAuthenticated: input.isAuthenticated,
        determinationStatus: input.determinationStatus,
        recordedBy: input.recordedBy,
      },
      actorPersona,
    );

    const authenticatedPayloadHash = input.authenticatedPayload
      ? createHash('sha256').update(JSON.stringify(input.authenticatedPayload)).digest('hex')
      : undefined;

    const determinationReference = `${EXTERNAL_ELIGIBILITY_DETERMINATION_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.externalEligibilityDeterminationReference.create({
      data: {
        id: randomUUID(),
        determinationReference,
        benefitEligibilityAssessmentId: input.benefitEligibilityAssessmentId,
        caseId: input.caseId,
        externalAuthorityId: input.externalAuthorityId,
        determinationStatus: input.determinationStatus,
        isRequired: input.isRequired ?? false,
        blocksDecisionWhenRequired: input.blocksDecisionWhenRequired ?? false,
        isAuthenticated: input.isAuthenticated,
        authenticatedPayloadHash,
        recordedBy: input.recordedBy,
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });
  }
}

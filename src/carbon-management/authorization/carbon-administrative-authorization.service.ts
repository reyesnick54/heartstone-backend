import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  CarbonAdministrativeAuthorizationStatus,
  CarbonManagementActorPersona,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CARBON_AUTHORIZATION_PREFIX } from '../carbon-management.constants';
import { CarbonManagementAuthorityService } from '../common/carbon-management-authority.service';
import { CarbonManagementBoundaryService } from '../common/carbon-management-boundary.service';
import { CarbonExternalVerificationService } from '../verification/carbon-external-verification.service';

export interface IssueCarbonAdministrativeAuthorizationInput {
  carbonProjectId: string;
  authorizationTypeCode?: string;
  actorPersona: CarbonManagementActorPersona;
  actorIdentityType: IdentityType;
  issuedByOfficeholderId: string;
  issuerIdentityId: string;
  appointmentId?: string;
  governmentDecisionId?: string;
  officialInstrumentId?: string;
  clientPayload?: Record<string, unknown>;
  aiAction?: string;
}

@Injectable()
export class CarbonAdministrativeAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CarbonManagementBoundaryService,
    private readonly authority: CarbonManagementAuthorityService,
    private readonly externalVerifications: CarbonExternalVerificationService,
  ) {}

  async issueAuthorization(input: IssueCarbonAdministrativeAuthorizationInput) {
    if (input.clientPayload) {
      this.boundary.rejectClientAuthorizationFields(input.clientPayload);
    }
    this.boundary.assertApplicantCannotSelfAuthorize(input.actorPersona);
    this.boundary.assertPaymentDoesNotApproveAuthorization(input.actorPersona);
    if (input.aiAction) {
      this.boundary.assertAiCannotApproveAuthorization(input.actorPersona, input.aiAction);
    }
    if (input.actorIdentityType === IdentityType.SERVICE) {
      this.boundary.assertAiCannotApproveAuthorization(
        CarbonManagementActorPersona.AI_ASSISTANCE,
        'ISSUE_CARBON_REGISTRATION',
      );
    }

    await this.externalVerifications.assertFinalDecisionAllowed(input.carbonProjectId);
    await this.authority.assertAuthorizationIssuanceAuthority({
      identityId: input.issuerIdentityId,
      officeholderId: input.issuedByOfficeholderId,
      appointmentId: input.appointmentId,
    });

    this.boundary.assertAuthorizationRequiresGovernedInstrument({
      governmentDecisionId: input.governmentDecisionId,
      officialInstrumentId: input.officialInstrumentId,
    });

    const authorizationReference = `${CARBON_AUTHORIZATION_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.carbonAdministrativeAuthorizationRecord.create({
      data: {
        id: randomUUID(),
        carbonProjectId: input.carbonProjectId,
        authorizationReference,
        authorizationTypeCode: input.authorizationTypeCode,
        status: CarbonAdministrativeAuthorizationStatus.ISSUED,
        governmentDecisionId: input.governmentDecisionId,
        officialInstrumentId: input.officialInstrumentId,
        effectiveFrom: new Date(),
        doesNotSubstituteGovernmentDecision: true,
      },
    });
  }
}

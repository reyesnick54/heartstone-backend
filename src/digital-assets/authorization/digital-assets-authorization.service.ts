import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  DigitalAssetsActorPersona,
  DigitalAssetsAuthorizationStatus,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DigitalAssetsAuthorityService } from '../common/digital-assets-authority.service';
import { DigitalAssetsBoundaryService } from '../common/digital-assets-boundary.service';
import { DIGITAL_ASSETS_AUTHORIZATION_PREFIX } from '../digital-assets.constants';
import { DigitalAssetsExternalDependencyService } from '../external/digital-assets-external-dependency.service';

export interface IssueDigitalAssetsAuthorizationInput {
  regulatedEntityId: string;
  authorizationTypeCode?: string;
  actorPersona: DigitalAssetsActorPersona;
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
export class DigitalAssetsAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: DigitalAssetsBoundaryService,
    private readonly authority: DigitalAssetsAuthorityService,
    private readonly externalDependencies: DigitalAssetsExternalDependencyService,
  ) {}

  async issueAuthorization(input: IssueDigitalAssetsAuthorizationInput) {
    if (input.clientPayload) {
      this.boundary.rejectClientAuthorizationFields(input.clientPayload);
    }
    this.boundary.assertApplicantCannotSelfAuthorize(input.actorPersona);
    this.boundary.assertPaymentDoesNotApproveAuthorization(input.actorPersona);
    this.boundary.assertBlockchainVerificationDoesNotApprove(input.actorPersona);
    if (input.aiAction) {
      this.boundary.assertAiCannotApproveAuthorization(input.actorPersona, input.aiAction);
    }
    if (input.actorIdentityType === IdentityType.SERVICE) {
      this.boundary.assertAiCannotApproveAuthorization(
        DigitalAssetsActorPersona.AI_ASSISTANCE,
        'ISSUE_DIGITAL_ASSETS_LICENCE',
      );
    }

    await this.externalDependencies.assertFinalDecisionAllowed(input.regulatedEntityId);
    await this.authority.assertAuthorizationIssuanceAuthority({
      identityId: input.issuerIdentityId,
      officeholderId: input.issuedByOfficeholderId,
      appointmentId: input.appointmentId,
    });

    this.boundary.assertAuthorizationRequiresGovernedInstrument({
      governmentDecisionId: input.governmentDecisionId,
      officialInstrumentId: input.officialInstrumentId,
    });

    const authorizationReference = `${DIGITAL_ASSETS_AUTHORIZATION_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.digitalAssetsAuthorizationRecord.create({
      data: {
        id: randomUUID(),
        regulatedEntityId: input.regulatedEntityId,
        authorizationReference,
        authorizationTypeCode: input.authorizationTypeCode,
        status: DigitalAssetsAuthorizationStatus.ISSUED,
        governmentDecisionId: input.governmentDecisionId,
        officialInstrumentId: input.officialInstrumentId,
        effectiveFrom: new Date(),
        doesNotSubstituteGovernmentDecision: true,
      },
    });
  }
}

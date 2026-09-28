import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import {
  IdentityType,
  MaritimeActorPersona,
  MaritimeAdministrativeInstrumentStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { MaritimeAuthorityService } from '../common/maritime-authority.service';
import { MaritimeBoundaryService } from '../common/maritime-boundary.service';
import { MaritimeExternalDependencyService } from '../external/maritime-external-dependency.service';
import { MARITIME_INSTRUMENT_PREFIX } from '../maritime.constants';

export interface IssueMaritimeInstrumentInput {
  vesselRecordId: string;
  instrumentTypeCode?: string;
  actorPersona: MaritimeActorPersona;
  actorIdentityType: IdentityType;
  issuedByOfficeholderId: string;
  issuerIdentityId: string;
  appointmentId?: string;
  governmentDecisionId?: string;
  officialInstrumentId?: string;
  requiresCompetentAuthorityDetermination?: boolean;
  clientPayload?: Record<string, unknown>;
}

@Injectable()
export class MaritimeInstrumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: MaritimeBoundaryService,
    private readonly authority: MaritimeAuthorityService,
    private readonly externalDependencies: MaritimeExternalDependencyService,
  ) {}

  async issueInstrument(input: IssueMaritimeInstrumentInput) {
    if (input.clientPayload) {
      this.boundary.rejectClientInstrumentFields(input.clientPayload);
    }
    this.boundary.assertApplicantCannotSelfIssue(input.actorPersona);
    this.boundary.assertPaymentDoesNotIssueInstrument(input.actorPersona);
    if (input.actorIdentityType === IdentityType.SERVICE) {
      this.boundary.assertAiCannotIssueInstrument(
        MaritimeActorPersona.AI_ASSISTANCE,
        'ISSUE_MARITIME_INSTRUMENT',
      );
    }

    const awaitingExternal = await this.externalDependencies.countAwaitingExternal(
      input.vesselRecordId,
    );
    this.boundary.assertCannotSpoofNationalDeterminationAsAbsez({
      requiresCompetentAuthorityDetermination:
        input.requiresCompetentAuthorityDetermination ?? false,
      absezIssuanceAttempt: true,
      externalResolved: awaitingExternal === 0,
    });

    await this.externalDependencies.assertAdministrativeDecisionAllowed(input.vesselRecordId);
    await this.authority.assertInstrumentIssuanceAuthority({
      identityId: input.issuerIdentityId,
      officeholderId: input.issuedByOfficeholderId,
      appointmentId: input.appointmentId,
    });

    this.boundary.assertInstrumentRequiresGovernedOutcome({
      governmentDecisionId: input.governmentDecisionId,
      officialInstrumentId: input.officialInstrumentId,
    });

    const instrumentReference = `${MARITIME_INSTRUMENT_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.maritimeAdministrativeInstrument.create({
      data: {
        id: randomUUID(),
        vesselRecordId: input.vesselRecordId,
        instrumentReference,
        instrumentTypeCode: input.instrumentTypeCode,
        status: MaritimeAdministrativeInstrumentStatus.ISSUED,
        governmentDecisionId: input.governmentDecisionId,
        officialInstrumentId: input.officialInstrumentId,
        effectiveFrom: new Date(),
        doesNotSubstituteExternalRegistration: true,
      },
    });
  }
}

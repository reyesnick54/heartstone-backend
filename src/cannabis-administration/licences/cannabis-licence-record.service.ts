import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CannabisAdministrationActorPersona,
  CannabisLicenceLifecycleStatus,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CANNABIS_LICENCE_NUMBER_PREFIX } from '../cannabis-administration.constants';
import { CannabisAdministrationAuthorityService } from '../common/cannabis-administration-authority.service';
import { CannabisAdministrationBoundaryService } from '../common/cannabis-administration-boundary.service';
import { CannabisAdministrationConfigurationService } from '../configuration/cannabis-administration-configuration.service';
import { CannabisExternalDependencyService } from '../external/cannabis-external-dependency.service';

export interface IssueCannabisLicenceInput {
  regulatedEntityId: string;
  licenceCategoryCode: string;
  actorPersona: CannabisAdministrationActorPersona;
  actorIdentityType: IdentityType;
  issuerIdentityId: string;
  issuedByOfficeholderId: string;
  appointmentId?: string;
  governmentDecisionId?: string;
  officialInstrumentId?: string;
  authorityEvaluationRecordId?: string;
  functionAuthorityRecordId?: string;
  requiresDelegatedIssuance?: boolean;
  clientPayload?: Record<string, unknown>;
  aiAction?: string;
}

@Injectable()
export class CannabisLicenceRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CannabisAdministrationBoundaryService,
    private readonly authority: CannabisAdministrationAuthorityService,
    private readonly externalDependencies: CannabisExternalDependencyService,
    private readonly configuration: CannabisAdministrationConfigurationService,
  ) {}

  async issueLicence(input: IssueCannabisLicenceInput) {
    if (input.clientPayload) {
      this.boundary.rejectClientForgedLicenceFields(input.clientPayload);
    }
    this.boundary.assertApplicantCannotSelfIssueLicence(input.actorPersona);
    this.boundary.assertPaymentDoesNotApproveLicence(input.actorPersona);
    if (input.aiAction) {
      this.boundary.assertAiCannotIssueLicence(input.aiAction);
    }
    if (input.actorIdentityType === IdentityType.SERVICE) {
      this.boundary.assertServiceIdentityCannotIssueLicence(
        CannabisAdministrationActorPersona.AI_ASSISTANCE,
      );
    }

    const entity = await this.prisma.cannabisRegulatedEntityReference.findUnique({
      where: { id: input.regulatedEntityId },
    });
    if (!entity) {
      throw new NotFoundException('Cannabis regulated entity reference not found');
    }

    if (entity.jurisdictionId) {
      await this.configuration.assertServiceOperationalActivationAllowed(entity.jurisdictionId);
      await this.configuration.assertLicenceCategoryConfigured(
        entity.jurisdictionId,
        input.licenceCategoryCode,
      );
    }

    this.boundary.assertDelegatedFunctionActiveForIssuance(
      entity.delegatedLicenceFunctionActivation,
      input.requiresDelegatedIssuance ?? true,
    );

    await this.externalDependencies.assertLicenceDecisionAllowed(input.regulatedEntityId);

    await this.authority.assertLicenceIssuanceAuthority({
      identityId: input.issuerIdentityId,
      officeholderId: input.issuedByOfficeholderId,
      appointmentId: input.appointmentId,
    });

    this.boundary.assertLicenceRequiresGovernedInstrument({
      governmentDecisionId: input.governmentDecisionId,
      officialInstrumentId: input.officialInstrumentId,
    });

    const licenceNumber = `${CANNABIS_LICENCE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.cannabisLicenceRecord.create({
      data: {
        id: randomUUID(),
        licenceNumber,
        regulatedEntityId: input.regulatedEntityId,
        licenceCategoryCode: input.licenceCategoryCode,
        lifecycleStatus: CannabisLicenceLifecycleStatus.ISSUED,
        governmentDecisionId: input.governmentDecisionId,
        officialInstrumentId: input.officialInstrumentId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
        validFrom: new Date(),
        doesNotSubstituteGovernmentDecision: true,
      },
    });
  }
}

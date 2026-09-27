import { Injectable } from '@nestjs/common';
import { OfficialInstrumentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import {
  CITIZEN_RENEWAL_PROJECTION_DISCLAIMER,
  RENEWAL_ELIGIBLE_INSTRUMENT_STATUSES,
} from '../citizen-experience.constants';
import {
  CitizenAccessScope,
  CitizenAccessScopeService,
} from '../common/citizen-access-scope.service';

export interface CitizenRenewalQueueItem {
  instrumentId: string;
  instrumentNumber?: string;
  instrumentType?: string;
  issuer: { id: string; name: string };
  status: OfficialInstrumentStatus;
  effectiveUntil?: string;
  daysUntilExpiry?: number;
  renewalEligible: boolean;
  renewalReason?: string;
  nextStep?: string;
  disclaimer: string;
}

type RenewalInstrument = Prisma.OfficialInstrumentGetPayload<{
  include: {
    issuerInstitution: { select: { id: true; name: true } };
    instrumentTypeVersion: {
      include: { instrumentTypeDefinition: { select: { name: true } } };
    };
    case: { select: { applicantIdentityId: true } };
  };
}>;

@Injectable()
export class CitizenRenewalsProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CitizenAccessScopeService,
  ) {}

  async listRenewals(identityId: string): Promise<CitizenRenewalQueueItem[]> {
    const scope = await this.scopeService.resolveScope(identityId);
    const instruments = await this.findRenewalCandidates(scope);

    return instruments
      .map((instrument) => this.toRenewalItem(instrument))
      .filter((item) => item.effectiveUntil !== undefined || item.renewalEligible)
      .sort((a, b) => (a.daysUntilExpiry ?? 9999) - (b.daysUntilExpiry ?? 9999));
  }

  private async findRenewalCandidates(scope: CitizenAccessScope): Promise<RenewalInstrument[]> {
    const instruments = await this.prisma.officialInstrument.findMany({
      where: {
        OR: [
          { holderIdentityId: scope.identityId },
          ...(scope.caseIds.length > 0 ? [{ caseId: { in: scope.caseIds } }] : []),
          ...(scope.organizationIds.length > 0
            ? [{ holderOrganizationId: { in: scope.organizationIds } }]
            : []),
        ],
        status: { in: [...RENEWAL_ELIGIBLE_INSTRUMENT_STATUSES] },
        effectiveUntil: { not: null },
      },
      include: {
        issuerInstitution: { select: { id: true, name: true } },
        instrumentTypeVersion: {
          include: { instrumentTypeDefinition: { select: { name: true } } },
        },
        case: { select: { applicantIdentityId: true } },
      },
      orderBy: { effectiveUntil: 'asc' },
    });

    return instruments.filter((instrument) => {
      if (instrument.holderIdentityId === scope.identityId) {
        return true;
      }
      if (instrument.case?.applicantIdentityId === scope.identityId) {
        return true;
      }
      if (
        instrument.holderOrganizationId &&
        scope.organizationIds.includes(instrument.holderOrganizationId)
      ) {
        return true;
      }
      return instrument.caseId != null && scope.caseIds.includes(instrument.caseId);
    });
  }

  private toRenewalItem(instrument: RenewalInstrument): CitizenRenewalQueueItem {
    const renewalProcedure = instrument.instrumentTypeVersion?.renewalProcedure;
    const hasRenewalConfig =
      renewalProcedure !== null &&
      renewalProcedure !== undefined &&
      typeof renewalProcedure === 'object';

    const daysUntilExpiry = instrument.effectiveUntil
      ? Math.ceil((instrument.effectiveUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : undefined;

    let renewalEligible = false;
    let renewalReason: string | undefined;
    let nextStep: string | undefined;

    if (!hasRenewalConfig) {
      renewalReason = 'Renewability is not established for this instrument type';
    } else if (
      instrument.status === OfficialInstrumentStatus.REVOKED ||
      instrument.status === OfficialInstrumentStatus.SUPERSEDED ||
      instrument.status === OfficialInstrumentStatus.SURRENDERED
    ) {
      renewalReason = `Instrument status ${instrument.status} does not permit renewal`;
    } else if (daysUntilExpiry === undefined) {
      renewalReason = 'No expiry date configured';
    } else {
      const procedure = renewalProcedure as Record<string, unknown>;
      const windowDays =
        typeof procedure.renewalWindowDaysBeforeExpiry === 'number'
          ? procedure.renewalWindowDaysBeforeExpiry
          : 90;

      if (daysUntilExpiry <= windowDays || instrument.status === OfficialInstrumentStatus.EXPIRED) {
        renewalEligible = true;
        nextStep =
          typeof procedure.nextStep === 'string'
            ? procedure.nextStep
            : 'Submit renewal application through the originating service';
      } else {
        renewalReason = 'Outside configured renewal window';
      }
    }

    return {
      instrumentId: instrument.id,
      instrumentNumber: instrument.instrumentNumber ?? undefined,
      instrumentType:
        instrument.instrumentTypeVersion?.instrumentTypeDefinition.name ??
        instrument.instrumentType ??
        undefined,
      issuer: instrument.issuerInstitution,
      status: instrument.status,
      effectiveUntil: instrument.effectiveUntil?.toISOString(),
      daysUntilExpiry,
      renewalEligible,
      renewalReason,
      nextStep,
      disclaimer: CITIZEN_RENEWAL_PROJECTION_DISCLAIMER,
    };
  }
}

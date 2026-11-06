import { Injectable, NotFoundException } from '@nestjs/common';
import { OfficialInstrumentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../../database/prisma.service';
import {
  CitizenAccessScope,
  CitizenAccessScopeService,
} from '../common/citizen-access-scope.service';

export interface CitizenCredentialCondition {
  id?: string;
  conditionType?: string;
  status?: string;
  description: string;
}

const CONDITION_TEXT_FIELDS = ['description', 'text', 'label', 'summary', 'condition'] as const;

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

/**
 * Normalizes recorded instrument conditions to applicant-safe items. Conditions are stored as
 * JSON (amendment payloads, or `DecisionCondition` rows snapshotted at issuance), so only the
 * id, type, status and text are projected; anything without readable text is skipped.
 */
export function normalizeCredentialConditions(raw: unknown): CitizenCredentialCondition[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const items: CitizenCredentialCondition[] = [];
  for (const entry of raw as unknown[]) {
    if (typeof entry === 'string') {
      if (entry.trim() !== '') {
        items.push({ description: entry });
      }
      continue;
    }
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    const description = CONDITION_TEXT_FIELDS.map((field) => optionalString(record[field])).find(
      (value) => value !== undefined,
    );
    if (description === undefined) {
      continue;
    }
    items.push({
      id: optionalString(record.id),
      conditionType: optionalString(record.conditionType) ?? optionalString(record.type),
      status: optionalString(record.status),
      description,
    });
  }
  return items;
}

export interface CitizenCredentialSummary {
  id: string;
  instrumentNumber?: string;
  instrumentType?: string;
  instrumentKind?: string;
  issuer: { id: string; name: string };
  status: OfficialInstrumentStatus;
  effectiveFrom?: string;
  effectiveUntil?: string;
  verificationReference?: string;
  conditions: CitizenCredentialCondition[];
  renewal?: {
    eligible: boolean;
    nextStep?: string;
    reason?: string;
  };
  superseded: boolean;
  downloadPath?: string;
}

export interface CitizenCredentialDetail extends CitizenCredentialSummary {
  scopeSummary?: string;
  holderDisplay?: string;
  currentVersionNumber?: number;
  verificationUri?: string;
}

type AccessibleInstrument = Prisma.OfficialInstrumentGetPayload<{
  include: {
    issuerInstitution: { select: { id: true; name: true } };
    instrumentTypeVersion: {
      include: { instrumentTypeDefinition: { select: { name: true; kind: true } } };
    };
    currentVersion: true;
    verificationRecords: { orderBy: { createdAt: 'desc' }; take: 1 };
    case: { select: { applicantIdentityId: true } };
  };
}>;

@Injectable()
export class CitizenCredentialsProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CitizenAccessScopeService,
  ) {}

  async listCredentials(identityId: string): Promise<CitizenCredentialSummary[]> {
    const scope = await this.scopeService.resolveScope(identityId);
    const instruments = await this.findAccessibleInstruments(scope);
    return instruments.map((instrument) => this.toSummary(instrument));
  }

  async getCredential(identityId: string, credentialId: string): Promise<CitizenCredentialDetail> {
    const scope = await this.scopeService.resolveScope(identityId);
    const instrument = await this.findAccessibleInstrumentById(scope, credentialId);
    if (!instrument) {
      throw new NotFoundException(`Credential ${credentialId} not found`);
    }
    return this.toDetail(instrument);
  }

  private async findAccessibleInstruments(
    scope: CitizenAccessScope,
  ): Promise<AccessibleInstrument[]> {
    const instruments = await this.prisma.officialInstrument.findMany({
      where: {
        OR: [
          { holderIdentityId: scope.identityId },
          ...(scope.caseIds.length > 0 ? [{ caseId: { in: scope.caseIds } }] : []),
          ...(scope.organizationIds.length > 0
            ? [{ holderOrganizationId: { in: scope.organizationIds } }]
            : []),
        ],
        status: {
          notIn: [OfficialInstrumentStatus.DRAFT, OfficialInstrumentStatus.PENDING_ISSUANCE],
        },
      },
      include: this.instrumentInclude(),
      orderBy: { updatedAt: 'desc' },
    });

    return instruments.filter((instrument) => this.isInstrumentAccessible(instrument, scope));
  }

  private async findAccessibleInstrumentById(
    scope: CitizenAccessScope,
    instrumentId: string,
  ): Promise<AccessibleInstrument | null> {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: instrumentId },
      include: this.instrumentInclude(),
    });

    if (!instrument || !this.isInstrumentAccessible(instrument, scope)) {
      return null;
    }

    return instrument;
  }

  private instrumentInclude() {
    return {
      issuerInstitution: { select: { id: true, name: true } },
      instrumentTypeVersion: {
        include: { instrumentTypeDefinition: { select: { name: true, kind: true } } },
      },
      currentVersion: true,
      verificationRecords: { orderBy: { createdAt: 'desc' as const }, take: 1 },
      case: { select: { applicantIdentityId: true } },
    };
  }

  private isInstrumentAccessible(
    instrument: AccessibleInstrument,
    scope: CitizenAccessScope,
  ): boolean {
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

    if (instrument.caseId && scope.caseIds.includes(instrument.caseId)) {
      return true;
    }

    return false;
  }

  private deriveRenewalProjection(instrument: AccessibleInstrument) {
    const renewalProcedure = instrument.instrumentTypeVersion?.renewalProcedure;
    if (!renewalProcedure || typeof renewalProcedure !== 'object') {
      return {
        eligible: false,
        reason: 'Renewability is not established for this instrument type',
      };
    }

    const inactiveStatuses: OfficialInstrumentStatus[] = [
      OfficialInstrumentStatus.REVOKED,
      OfficialInstrumentStatus.SUPERSEDED,
      OfficialInstrumentStatus.SURRENDERED,
    ];

    if (inactiveStatuses.includes(instrument.status)) {
      return {
        eligible: false,
        reason: `Instrument status ${instrument.status} does not permit renewal`,
      };
    }

    const procedure = renewalProcedure as Record<string, unknown>;
    const renewalWindowDays =
      typeof procedure.renewalWindowDaysBeforeExpiry === 'number'
        ? procedure.renewalWindowDaysBeforeExpiry
        : undefined;

    if (!instrument.effectiveUntil) {
      return {
        eligible: false,
        reason: 'No expiry date configured on instrument',
      };
    }

    const daysUntilExpiry = Math.ceil(
      (instrument.effectiveUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    const withinWindow =
      renewalWindowDays === undefined
        ? daysUntilExpiry <= 90
        : daysUntilExpiry <= renewalWindowDays;

    if (!withinWindow && instrument.status !== OfficialInstrumentStatus.EXPIRED) {
      return {
        eligible: false,
        reason: 'Outside configured renewal window',
        nextStep: undefined,
      };
    }

    return {
      eligible: true,
      nextStep:
        typeof procedure.nextStep === 'string'
          ? procedure.nextStep
          : 'Submit renewal application through the originating service',
      reason: undefined,
    };
  }

  private toSummary(instrument: AccessibleInstrument): CitizenCredentialSummary {
    const verification = instrument.verificationRecords[0];
    const typeDef = instrument.instrumentTypeVersion?.instrumentTypeDefinition;
    const recorded = normalizeCredentialConditions(instrument.currentVersion?.conditions);
    const conditions =
      recorded.length > 0
        ? recorded
        : normalizeCredentialConditions(instrument.currentVersion?.conditionsSnapshot);

    return {
      id: instrument.id,
      instrumentNumber: instrument.instrumentNumber ?? undefined,
      instrumentType: typeDef?.name ?? instrument.instrumentType ?? undefined,
      instrumentKind: typeDef?.kind ?? undefined,
      issuer: instrument.issuerInstitution,
      status: instrument.status,
      effectiveFrom: instrument.effectiveFrom?.toISOString(),
      effectiveUntil: instrument.effectiveUntil?.toISOString(),
      verificationReference:
        verification?.verificationCode ?? instrument.verificationCode ?? undefined,
      conditions,
      renewal: this.deriveRenewalProjection(instrument),
      superseded: instrument.status === OfficialInstrumentStatus.SUPERSEDED,
      downloadPath: `/api/v1/instruments/${instrument.id}/download`,
    };
  }

  private toDetail(instrument: AccessibleInstrument): CitizenCredentialDetail {
    const verification = instrument.verificationRecords[0];

    return {
      ...this.toSummary(instrument),
      scopeSummary:
        typeof instrument.scope === 'object' &&
        instrument.scope !== null &&
        'summary' in instrument.scope
          ? String((instrument.scope as Record<string, unknown>).summary)
          : undefined,
      currentVersionNumber: instrument.currentVersion?.versionNumber,
      verificationUri: verification?.verificationUri,
    };
  }
}

import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HealthcareAccessBasisKind, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { SecurityAuditService } from '../../../identity/audit/security-audit.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { HealthcareConsentService } from '../healthcare-consent.service';
import {
  type CitizenHealthConsentGrantDto,
  type CitizenHealthConsentPurposeDto,
  type CitizenHealthConsentsDto,
  type GrantCitizenHealthConsentDto,
  type WithdrawCitizenHealthConsentDto,
} from './citizen-healthcare-consent.dto';

export const CITIZEN_HEALTH_CONSENT_ERROR_CODES = {
  PATIENT_REFERENCE_NOT_ESTABLISHED: 'PATIENT_REFERENCE_NOT_ESTABLISHED',
  CONSENT_PURPOSE_NOT_AVAILABLE: 'CONSENT_PURPOSE_NOT_AVAILABLE',
  CONSENT_VERSION_NOT_CURRENT: 'CONSENT_VERSION_NOT_CURRENT',
  CONSENT_ALREADY_ACTIVE: 'CONSENT_ALREADY_ACTIVE',
  CONSENT_ALREADY_WITHDRAWN: 'CONSENT_ALREADY_WITHDRAWN',
} as const;

export const CITIZEN_HEALTH_CONSENT_DISCLAIMER =
  'Consent records your permission for a stated purpose. It does not authorize treatment, and withdrawing it keeps the history of what you agreed to.';

const grantInclude = {
  purpose: true,
  withdrawal: true,
  consent: { include: { scopes: true, consentVersion: true } },
} satisfies Prisma.HealthcareConsentGrantInclude;

type GrantRecord = Prisma.HealthcareConsentGrantGetPayload<{ include: typeof grantInclude }>;

function stringList(value: Prisma.JsonValue | undefined): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

/**
 * Patient self-service over their own consent grants. The patient is resolved only from the
 * session identity's HealthcarePatientReference; grants and withdrawals go through
 * HealthcareConsentService so history is preserved exactly as for any other consent.
 */
@Injectable()
export class CitizenHealthcareConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly consents: HealthcareConsentService,
    private readonly audit: SecurityAuditService,
  ) {}

  async list(identityId: string): Promise<CitizenHealthConsentsDto> {
    const patientReferenceIds = await this.patientReferenceIds(identityId);
    const [grants, availablePurposes] = await Promise.all([
      patientReferenceIds.length === 0
        ? Promise.resolve([] as GrantRecord[])
        : this.prisma.healthcareConsentGrant.findMany({
            where: { patientReferenceId: { in: patientReferenceIds } },
            include: grantInclude,
            orderBy: { grantedAt: 'desc' },
          }),
      this.listAvailablePurposes(),
    ]);

    return {
      items: grants.map((grant) => this.toDto(grant)),
      availablePurposes,
      patientReferenceEstablished: patientReferenceIds.length > 0,
      disclaimer: CITIZEN_HEALTH_CONSENT_DISCLAIMER,
    };
  }

  async grant(
    session: SessionContextDto,
    actor: ActorContext,
    dto: GrantCitizenHealthConsentDto,
  ): Promise<CitizenHealthConsentGrantDto> {
    const identityId = session.identityId;
    const [patientReferenceId] = await this.patientReferenceIds(identityId);
    if (!patientReferenceId) {
      throw new ConflictException({
        message: 'No patient record is established for this account yet',
        code: CITIZEN_HEALTH_CONSENT_ERROR_CODES.PATIENT_REFERENCE_NOT_ESTABLISHED,
      });
    }

    const purpose = (await this.listAvailablePurposes(true)).find(
      (candidate) => candidate.purposeCode === dto.purposeCode,
    );
    if (!purpose) {
      throw new NotFoundException({
        message: 'Consent purpose is not available',
        code: CITIZEN_HEALTH_CONSENT_ERROR_CODES.CONSENT_PURPOSE_NOT_AVAILABLE,
      });
    }
    if (purpose.currentVersionCode !== dto.consentVersionCode) {
      throw new ConflictException({
        message: 'The consent text has changed; review the current version before consenting',
        code: CITIZEN_HEALTH_CONSENT_ERROR_CODES.CONSENT_VERSION_NOT_CURRENT,
      });
    }

    const now = new Date();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;
    if (expiresAt && expiresAt <= now) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    const active = await this.prisma.healthcareConsentGrant.findFirst({
      where: {
        patientReferenceId,
        purpose: { purposeCode: purpose.purposeCode },
        isActive: true,
        withdrawal: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
    if (active) {
      throw new ConflictException({
        message: 'You already have an active consent for this purpose',
        code: CITIZEN_HEALTH_CONSENT_ERROR_CODES.CONSENT_ALREADY_ACTIVE,
      });
    }

    const suffix = randomUUID().slice(0, 8).toUpperCase();
    const { grant } = await this.consents.createConsentAndGrant(actor, {
      patientReferenceId,
      consentReference: `HC-CONSENT-${suffix}`,
      grantReference: `HC-GRANT-${suffix}`,
      consentType: dto.consentType,
      consentVersionId: purpose.currentVersionId,
      purposeCode: purpose.purposeCode,
      effectiveFrom: now,
      expiresAt,
      accessBasisKind: HealthcareAccessBasisKind.PATIENT_CONSENT,
      representsPatientConsent: true,
      dataCategories: dto.dataCategories,
      recipientCodes: dto.recipientCodes,
    });

    await this.audit.record({
      eventType: 'PROTECTED_ENDPOINT_ACCESS',
      identityId,
      sessionId: session.sessionId,
      actorIdentityId: identityId,
      metadata: {
        action: 'CITIZEN_HEALTH_CONSENT_GRANTED',
        consentGrantId: grant.id,
        consentId: grant.consentId,
        purposeCode: purpose.purposeCode,
        consentVersionCode: purpose.currentVersionCode,
      },
    });

    return this.toDto(await this.loadGrant(grant.id));
  }

  async withdraw(
    session: SessionContextDto,
    actor: ActorContext,
    grantId: string,
    dto: WithdrawCitizenHealthConsentDto,
  ): Promise<CitizenHealthConsentGrantDto> {
    const identityId = session.identityId;
    const patientReferenceIds = await this.patientReferenceIds(identityId);
    const grant = await this.prisma.healthcareConsentGrant.findFirst({
      where: { id: grantId, patientReferenceId: { in: patientReferenceIds } },
      include: { withdrawal: true },
    });
    // Another patient's grant is "not found", never "forbidden".
    if (!grant) {
      throw new NotFoundException('Consent not found');
    }
    if (grant.withdrawal || !grant.isActive) {
      throw new ConflictException({
        message: 'This consent has already been withdrawn',
        code: CITIZEN_HEALTH_CONSENT_ERROR_CODES.CONSENT_ALREADY_WITHDRAWN,
      });
    }

    const { withdrawal } = await this.consents.withdrawConsentGrant(
      actor,
      grant.id,
      dto.reasonSummary,
    );

    await this.audit.record({
      eventType: 'PROTECTED_ENDPOINT_ACCESS',
      identityId,
      sessionId: session.sessionId,
      actorIdentityId: identityId,
      metadata: {
        action: 'CITIZEN_HEALTH_CONSENT_WITHDRAWN',
        consentGrantId: grant.id,
        withdrawalId: withdrawal.id,
      },
    });

    return this.toDto(await this.loadGrant(grant.id));
  }

  private async patientReferenceIds(identityId: string): Promise<string[]> {
    const references = await this.prisma.healthcarePatientReference.findMany({
      where: { patientIdentityId: identityId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return references.map((reference) => reference.id);
  }

  /** Active purposes with a consent version in effect now (latest effectiveFrom wins). */
  private async listAvailablePurposes(): Promise<CitizenHealthConsentPurposeDto[]>;
  private async listAvailablePurposes(
    withIds: true,
  ): Promise<(CitizenHealthConsentPurposeDto & { currentVersionId: string })[]>;
  private async listAvailablePurposes(withIds = false) {
    const now = new Date();
    const purposes = await this.prisma.healthcareConsentPurposeDefinition.findMany({
      where: { isActive: true },
      include: {
        consentVersions: {
          where: {
            effectiveFrom: { lte: now },
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: now } }],
          },
          orderBy: { effectiveFrom: 'desc' },
          take: 1,
        },
      },
      orderBy: { purposeCode: 'asc' },
    });

    return purposes.flatMap((purpose) => {
      const version = purpose.consentVersions[0];
      if (!version) {
        return [];
      }
      return [
        {
          purposeCode: purpose.purposeCode,
          displayName: purpose.displayName,
          description: purpose.description,
          currentVersionCode: version.versionCode,
          legalTextRef: version.legalTextRef,
          ...(withIds ? { currentVersionId: version.id } : {}),
        },
      ];
    });
  }

  private loadGrant(grantId: string): Promise<GrantRecord> {
    return this.prisma.healthcareConsentGrant.findUniqueOrThrow({
      where: { id: grantId },
      include: grantInclude,
    });
  }

  private toDto(grant: GrantRecord): CitizenHealthConsentGrantDto {
    const now = Date.now();
    const scope = grant.consent.scopes[0];
    return {
      grantId: grant.id,
      grantReference: grant.grantReference,
      consentId: grant.consentId,
      consentReference: grant.consent.consentReference,
      consentType: grant.consent.consentType,
      consentStatus: grant.consent.status,
      purposeCode: grant.purpose.purposeCode,
      purposeName: grant.purpose.displayName,
      consentVersionCode: grant.consent.consentVersion.versionCode,
      isActive:
        grant.isActive &&
        grant.withdrawal === null &&
        grant.revokedAt === null &&
        (grant.expiresAt === null || grant.expiresAt.getTime() > now),
      grantedAt: grant.grantedAt.toISOString(),
      expiresAt: grant.expiresAt?.toISOString() ?? null,
      withdrawnAt:
        grant.withdrawal?.withdrawnAt.toISOString() ?? grant.revokedAt?.toISOString() ?? null,
      dataCategories: stringList(scope?.dataCategories),
      recipientCodes: stringList(scope?.recipientCodes),
    };
  }
}

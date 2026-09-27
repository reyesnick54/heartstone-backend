import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  HealthcareAccessBasisKind,
  HealthcareConsentRecordStatus,
  HealthcareConsentType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { HealthcareBoundaryService } from '../common/healthcare-boundary.service';

export interface CreateConsentGrantInput {
  patientReferenceId: string;
  consentReference: string;
  consentType: HealthcareConsentType;
  consentVersionId: string;
  purposeCode: string;
  grantReference: string;
  effectiveFrom: Date;
  expiresAt?: Date;
  accessBasisKind?: HealthcareAccessBasisKind;
  representsPatientConsent?: boolean;
  dataCategories?: string[];
  recipientCodes?: string[];
}

@Injectable()
export class HealthcareConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: HealthcareBoundaryService,
  ) {}

  async createConsentAndGrant(actor: ActorContext, input: CreateConsentGrantInput) {
    this.boundary.assertNonConsentBasisNotMislabeledAsConsent({
      accessBasisKind: input.accessBasisKind ?? HealthcareAccessBasisKind.PATIENT_CONSENT,
      representsPatientConsent: input.representsPatientConsent ?? true,
    });

    const purpose = await this.prisma.healthcareConsentPurposeDefinition.findUnique({
      where: { purposeCode: input.purposeCode },
    });
    if (!purpose) {
      throw new BadRequestException(`Unknown consent purpose ${input.purposeCode}`);
    }

    const consent = await this.prisma.healthcareConsent.create({
      data: {
        consentReference: input.consentReference,
        patientReferenceId: input.patientReferenceId,
        consentType: input.consentType,
        consentVersionId: input.consentVersionId,
        status: HealthcareConsentRecordStatus.ACTIVE,
        effectiveFrom: input.effectiveFrom,
        expiresAt: input.expiresAt,
        accessBasisKind: input.accessBasisKind ?? HealthcareAccessBasisKind.PATIENT_CONSENT,
        representsPatientConsent: input.representsPatientConsent ?? true,
        provenanceSummary: { recordedByIdentityId: actor.identityId },
        scopes: {
          create: {
            dataCategories: input.dataCategories ?? [],
            recipientCodes: input.recipientCodes ?? [],
          },
        },
      },
    });

    const grant = await this.prisma.healthcareConsentGrant.create({
      data: {
        grantReference: input.grantReference,
        consentId: consent.id,
        patientReferenceId: input.patientReferenceId,
        purposeId: purpose.id,
        expiresAt: input.expiresAt,
        isActive: true,
      },
    });

    return { consent, grant };
  }

  async withdrawConsentGrant(actor: ActorContext, grantId: string, reasonSummary?: string) {
    const grant = await this.prisma.healthcareConsentGrant.findUnique({
      where: { id: grantId },
      include: { consent: true, withdrawal: true },
    });
    if (!grant || grant.withdrawal) {
      throw new BadRequestException('Consent grant not eligible for withdrawal');
    }

    const patient = await this.prisma.healthcarePatientReference.findUnique({
      where: { id: grant.patientReferenceId },
    });
    if (patient?.patientIdentityId !== actor.identityId) {
      throw new ForbiddenException('Only the patient subject may withdraw this consent grant');
    }

    const withdrawal = await this.prisma.healthcareConsentWithdrawal.create({
      data: {
        consentGrantId: grant.id,
        reasonSummary,
        preservesHistory: true,
        actorIdentityId: actor.identityId,
      },
    });

    await this.prisma.healthcareConsentGrant.update({
      where: { id: grant.id },
      data: { isActive: false, revokedAt: new Date() },
    });

    const historicalConsent = await this.prisma.healthcareConsent.findUnique({
      where: { id: grant.consentId },
    });

    return { withdrawal, historicalConsent };
  }
}

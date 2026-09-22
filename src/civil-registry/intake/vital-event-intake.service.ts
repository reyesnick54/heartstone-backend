import { Injectable } from '@nestjs/common';
import {
  CivilRegistryAuditEventType,
  Prisma,
  VitalEventRegistrationStatus,
  VitalEventType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CivilRegistryAuditService } from '../audit/civil-registry-audit.service';
import { VITAL_EVENT_REFERENCE_PREFIX } from '../civil-registry.constants';
import { CivilRegistryBoundaryService } from '../common/civil-registry-boundary.service';
import { buildCivilReference } from '../common/civil-registry-reference.util';

export interface CreateVitalEventIntakeInput {
  eventType: VitalEventType;
  jurisdictionId: string;
  institutionId: string;
  applicationId?: string;
  caseId?: string;
  governmentServiceId?: string;
  governingServicePackVersionId?: string;
  eventDate?: Date;
  locationReference?: string;
  primarySubjectCivilPersonRecordId?: string;
  provenanceSummary?: Record<string, unknown>;
  clientPayload?: Record<string, unknown>;
}

@Injectable()
export class VitalEventIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CivilRegistryBoundaryService,
    private readonly audit: CivilRegistryAuditService,
  ) {}

  async createIntake(applicantIdentityId: string, input: CreateVitalEventIntakeInput) {
    this.boundary.rejectClientForgedVitalEventFields(input.clientPayload ?? {});
    this.boundary.assertCitizenCannotCreateOfficialRegistryEntry({
      registrationStatus: VitalEventRegistrationStatus.INTAKE_DRAFT,
    });

    const eventReference = buildCivilReference(VITAL_EVENT_REFERENCE_PREFIX);

    const vitalEvent = await this.prisma.vitalEvent.create({
      data: {
        eventReference,
        eventType: input.eventType,
        registrationStatus: VitalEventRegistrationStatus.INTAKE_DRAFT,
        jurisdictionId: input.jurisdictionId,
        institutionId: input.institutionId,
        applicationId: input.applicationId,
        caseId: input.caseId,
        governmentServiceId: input.governmentServiceId,
        governingServicePackVersionId: input.governingServicePackVersionId,
        eventDate: input.eventDate,
        locationReference: input.locationReference,
        primarySubjectCivilPersonRecordId: input.primarySubjectCivilPersonRecordId,
        provenanceSummary: (input.provenanceSummary ?? {}) as Prisma.InputJsonValue,
      },
    });

    if (input.eventType === VitalEventType.BIRTH) {
      await this.prisma.birthEvent.create({ data: { vitalEventId: vitalEvent.id } });
    } else if (input.eventType === VitalEventType.DEATH) {
      await this.prisma.deathEvent.create({ data: { vitalEventId: vitalEvent.id } });
    } else if (input.eventType === VitalEventType.MARRIAGE) {
      await this.prisma.marriageEvent.create({ data: { vitalEventId: vitalEvent.id } });
    } else if (input.eventType === VitalEventType.DIVORCE) {
      await this.prisma.divorceEvent.create({ data: { vitalEventId: vitalEvent.id } });
    }

    await this.audit.record({
      vitalEventId: vitalEvent.id,
      eventType: CivilRegistryAuditEventType.INTAKE_CREATED,
      actorIdentityId: applicantIdentityId,
      metadata: { eventReference, eventType: input.eventType },
    });

    return vitalEvent;
  }
}

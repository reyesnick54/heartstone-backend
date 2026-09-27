import { Injectable } from '@nestjs/common';
import {
  HealthcareAccessBasisKind,
  type HealthDataRecordReference,
  HealthDataRecordSensitivityClassification,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { HealthcareCanonicalAccessPolicyService } from '../common/healthcare-canonical-access-policy.service';

export interface RegisterHealthDataRecordInput {
  recordReference: string;
  patientReferenceId: string;
  dataCategoryCode: string;
  sourceId: string;
  externalRecordReference?: string;
  classification?: HealthDataRecordSensitivityClassification;
  consentPurposeCode?: string;
}

@Injectable()
export class HealthDataRegistryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: HealthcareCanonicalAccessPolicyService,
  ) {}

  async registerRecordReference(
    input: RegisterHealthDataRecordInput,
  ): Promise<HealthDataRecordReference> {
    const record = await this.prisma.healthDataRecordReference.create({
      data: {
        recordReference: input.recordReference,
        patientReferenceId: input.patientReferenceId,
        dataCategoryCode: input.dataCategoryCode,
        sourceId: input.sourceId,
        externalRecordReference: input.externalRecordReference,
        classification: input.classification ?? HealthDataRecordSensitivityClassification.GENERAL,
        consentPurposeCode: input.consentPurposeCode,
        provenanceRecords: {
          create: {
            provenanceKind: 'REGISTRY_INTAKE',
            sourceSummary: { intakeChannel: 'HEALTH_DATA_REGISTRY' },
          },
        },
      },
    });

    return record;
  }

  async readRecordForActor(
    actor: ActorContext,
    recordId: string,
    input: {
      purposeCode: string;
      consentPurposeCode?: string;
      accessBasisKind?: HealthcareAccessBasisKind;
      roleMarker?: string;
    },
  ) {
    const record = await this.prisma.healthDataRecordReference.findUnique({
      where: { id: recordId },
    });
    if (!record) {
      return null;
    }

    await this.accessPolicy.assertMayAccessHealthcareData(actor, {
      patientReferenceId: record.patientReferenceId,
      purposeCode: input.purposeCode,
      consentPurposeCode:
        input.consentPurposeCode ?? record.consentPurposeCode ?? input.purposeCode,
      classification: record.classification,
      endpoint: 'health-data-registry.read',
      accessBasisKind: input.accessBasisKind,
      roleMarker: input.roleMarker,
    });

    await this.prisma.healthDataAccessRecord.create({
      data: {
        recordReferenceId: record.id,
        accessorIdentityId: actor.identityId,
        actorPersona: this.accessPolicy.resolveActorPersona(actor),
        purposeCode: input.purposeCode,
        accessBasisKind: input.accessBasisKind ?? HealthcareAccessBasisKind.PATIENT_CONSENT,
        granted: true,
        reasonCode: 'RECORD_READ',
      },
    });

    return record;
  }
}

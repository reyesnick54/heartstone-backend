import { Injectable, NotFoundException } from '@nestjs/common';
import { CivilRegistryCertificateStatus, CivilRegistryRecordStatus } from '@prisma/client';

import { CivilRegistryAccessService } from '../../civil-registry/access/civil-registry-access.service';
import {
  CIVIL_REGISTRY_DISCLAIMERS,
  CIVIL_REGISTRY_SERVICE_SLUGS,
} from '../../civil-registry/civil-registry.constants';
import { PrismaService } from '../../database/prisma.service';

export interface CitizenCivilStatusSummary {
  identityId: string;
  entitledRecordCount: number;
  officialRecordCount: number;
  pendingSubmissionCount: number;
  templateDisclaimer: string;
}

export interface CitizenVitalRecordSummary {
  id: string;
  recordNumber: string;
  eventType: string;
  status: CivilRegistryRecordStatus;
  summaryLabel?: string | null;
  registryVersionNumber?: number;
  isSealed: boolean;
  isRestricted: boolean;
  institutionName: string;
}

export interface CitizenCertificateSummary {
  id: string;
  certificateType: string;
  status: CivilRegistryCertificateStatus;
  issuedAt?: string;
  vitalRecordId: string;
  registryVersionId: string;
  verificationReference?: string;
  requestViaServiceSlug?: string;
}

export interface CitizenCivilRegistryAction {
  actionCode: string;
  label: string;
  serviceSlug: string;
  description: string;
}

const CERTIFICATE_TYPE_TO_SERVICE_SLUG: Record<string, string> = {
  BIRTH_CERTIFICATE: CIVIL_REGISTRY_SERVICE_SLUGS.REQUEST_BIRTH_CERTIFICATE,
  DEATH_CERTIFICATE: CIVIL_REGISTRY_SERVICE_SLUGS.REQUEST_DEATH_CERTIFICATE,
  MARRIAGE_CERTIFICATE: CIVIL_REGISTRY_SERVICE_SLUGS.REQUEST_MARRIAGE_CERTIFICATE,
  DIVORCE_CERTIFICATE: CIVIL_REGISTRY_SERVICE_SLUGS.REGISTER_DIVORCE,
  CIVIL_EXTRACT: CIVIL_REGISTRY_SERVICE_SLUGS.RECORD_CORRECTION,
};

@Injectable()
export class CitizenCivilRegistryProjectionService {
  constructor(
    private readonly access: CivilRegistryAccessService,
    private readonly prisma: PrismaService,
  ) {}

  async getCivilStatus(identityId: string): Promise<CitizenCivilStatusSummary> {
    const records = await this.access.findEntitledRecords(identityId);
    const pendingSubmissions = await this.prisma.civilRegistryEventSubmission.count({
      where: {
        application: { applicantIdentityId: identityId },
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'DECISION_PENDING'] },
      },
    });

    return {
      identityId,
      entitledRecordCount: records.length,
      officialRecordCount: records.filter(
        (record) =>
          record.status === CivilRegistryRecordStatus.OFFICIAL ||
          record.status === CivilRegistryRecordStatus.CORRECTED,
      ).length,
      pendingSubmissionCount: pendingSubmissions,
      templateDisclaimer: CIVIL_REGISTRY_DISCLAIMERS.templateOnly,
    };
  }

  async listVitalRecords(identityId: string): Promise<CitizenVitalRecordSummary[]> {
    const records = await this.access.findEntitledRecords(identityId);
    return records.map((record) => ({
      id: record.id,
      recordNumber: record.recordNumber,
      eventType: record.eventType,
      status: record.status,
      summaryLabel: record.currentVersion?.summaryLabel,
      registryVersionNumber: record.currentVersion?.versionNumber,
      isSealed: record.isSealed,
      isRestricted: record.isRestricted,
      institutionName: record.institution.name,
    }));
  }

  async getVitalRecord(identityId: string, recordId: string): Promise<CitizenVitalRecordSummary> {
    const record = await this.access.findEntitledRecordById(identityId, recordId);
    if (!record) {
      throw new NotFoundException('Vital record not found');
    }

    return {
      id: record.id,
      recordNumber: record.recordNumber,
      eventType: record.eventType,
      status: record.status,
      summaryLabel: record.currentVersion?.summaryLabel,
      registryVersionNumber: record.currentVersion?.versionNumber,
      isSealed: record.isSealed,
      isRestricted: record.isRestricted,
      institutionName: record.institution.name,
    };
  }

  async listCertificates(identityId: string): Promise<CitizenCertificateSummary[]> {
    const records = await this.access.findEntitledRecords(identityId);
    const recordIds = records.map((record) => record.id);
    if (recordIds.length === 0) {
      return [];
    }

    const certificates = await this.prisma.civilRegistryCertificate.findMany({
      where: { vitalRecordId: { in: recordIds } },
      include: {
        verificationRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return certificates.map((certificate) => ({
      id: certificate.id,
      certificateType: certificate.certificateType,
      status: certificate.status,
      issuedAt: certificate.issuedAt?.toISOString(),
      vitalRecordId: certificate.vitalRecordId,
      registryVersionId: certificate.registryVersionId,
      verificationReference: certificate.verificationRecords[0]?.verificationReference,
      requestViaServiceSlug: CERTIFICATE_TYPE_TO_SERVICE_SLUG[certificate.certificateType],
    }));
  }

  listCivilRegistryActions(): CitizenCivilRegistryAction[] {
    return [
      {
        actionCode: 'REGISTER_BIRTH',
        label: 'Register birth (template)',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REGISTER_BIRTH,
        description: CIVIL_REGISTRY_DISCLAIMERS.submissionNotOfficial,
      },
      {
        actionCode: 'REQUEST_BIRTH_CERTIFICATE',
        label: 'Request birth certificate (template)',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REQUEST_BIRTH_CERTIFICATE,
        description: CIVIL_REGISTRY_DISCLAIMERS.noDirectRecordDownload,
      },
      {
        actionCode: 'REGISTER_DEATH',
        label: 'Register death (template)',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REGISTER_DEATH,
        description: CIVIL_REGISTRY_DISCLAIMERS.submissionNotOfficial,
      },
      {
        actionCode: 'REQUEST_DEATH_CERTIFICATE',
        label: 'Request death certificate (template)',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REQUEST_DEATH_CERTIFICATE,
        description: CIVIL_REGISTRY_DISCLAIMERS.noDirectRecordDownload,
      },
      {
        actionCode: 'REGISTER_MARRIAGE',
        label: 'Register marriage (template)',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REGISTER_MARRIAGE,
        description: CIVIL_REGISTRY_DISCLAIMERS.submissionNotOfficial,
      },
      {
        actionCode: 'REQUEST_MARRIAGE_CERTIFICATE',
        label: 'Request marriage certificate (template)',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REQUEST_MARRIAGE_CERTIFICATE,
        description: CIVIL_REGISTRY_DISCLAIMERS.noDirectRecordDownload,
      },
      {
        actionCode: 'RECORD_CORRECTION',
        label: 'Request civil record correction (template)',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.RECORD_CORRECTION,
        description: 'Correction preserves the original record version chain.',
      },
      {
        actionCode: 'REGISTRY_VERIFICATION',
        label: 'Verify issued civil certificate (template)',
        serviceSlug: CIVIL_REGISTRY_SERVICE_SLUGS.REGISTRY_VERIFICATION,
        description: CIVIL_REGISTRY_DISCLAIMERS.verificationMinimalDisclosure,
      },
    ];
  }
}

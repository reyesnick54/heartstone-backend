import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentAssociationTargetType,
  DocumentConfidentialityOrPrivilegeStatus,
  DocumentVersion,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import {
  CitizenAccessScope,
  CitizenAccessScopeService,
} from '../common/citizen-access-scope.service';
import { CitizenExperienceBoundaryService } from '../common/citizen-experience-boundary.service';

export interface CitizenDocumentSummary {
  id: string;
  title: string;
  documentType: string;
  originatingInstitution?: { id: string; name: string };
  relatedService?: { caseId?: string; caseReference?: string; serviceName?: string };
  issueOrSubmissionDate?: string;
  status: string;
  expiryDate?: string;
  integrity: {
    sha256: string;
    signatureStatus: string;
    sealStatus: string;
    authenticityStatus: string;
  };
  download?: {
    versionId: string;
    downloadPath: string;
  };
  disclaimer: string;
}

export interface CitizenDocumentDetail extends CitizenDocumentSummary {
  documentNumber: string;
  sourceType: string;
  currentVersionNumber: number;
}

type AccessibleRecord = Prisma.DocumentRecordGetPayload<{
  include: {
    owningInstitution: { select: { id: true; name: true } };
    versions: true;
    associations: true;
  };
}>;

const PRIVILEGED_CONFIDENTIALITY_STATUSES: DocumentConfidentialityOrPrivilegeStatus[] = [
  DocumentConfidentialityOrPrivilegeStatus.LEGAL_PRIVILEGE_ASSERTED,
  DocumentConfidentialityOrPrivilegeStatus.LEGAL_PRIVILEGE_CONFIRMED,
  DocumentConfidentialityOrPrivilegeStatus.STATUTORY_CONFIDENTIALITY,
  DocumentConfidentialityOrPrivilegeStatus.CABINET_CONFIDENTIAL,
];

@Injectable()
export class CitizenDocumentsProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: CitizenAccessScopeService,
    private readonly boundary: CitizenExperienceBoundaryService,
  ) {}

  async listDocuments(identityId: string): Promise<CitizenDocumentSummary[]> {
    const scope = await this.scopeService.resolveScope(identityId);
    const records = await this.findAccessibleRecords(scope);
    return Promise.all(records.map((record) => this.toSummary(record)));
  }

  async getDocument(identityId: string, documentId: string): Promise<CitizenDocumentDetail> {
    const scope = await this.scopeService.resolveScope(identityId);
    const record = await this.findAccessibleRecordById(scope, documentId);
    if (!record) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }
    return this.toDetail(record);
  }

  private async findAccessibleRecords(scope: CitizenAccessScope): Promise<AccessibleRecord[]> {
    const associationTargets = this.buildAssociationTargetFilter(scope);

    const records = await this.prisma.documentRecord.findMany({
      where: {
        OR: [
          ...(associationTargets.length > 0
            ? [{ associations: { some: { OR: associationTargets } } }]
            : []),
          { versions: { some: { receivedFromIdentityId: scope.identityId } } },
        ],
      },
      include: {
        owningInstitution: { select: { id: true, name: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
        associations: {
          where: {
            targetType: {
              in: [DocumentAssociationTargetType.CASE, DocumentAssociationTargetType.APPLICATION],
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return records.filter((record) => this.isRecordCitizenVisible(record, scope));
  }

  private async findAccessibleRecordById(
    scope: CitizenAccessScope,
    documentId: string,
  ): Promise<AccessibleRecord | null> {
    const record = await this.prisma.documentRecord.findUnique({
      where: { id: documentId },
      include: {
        owningInstitution: { select: { id: true, name: true } },
        versions: { orderBy: { versionNumber: 'desc' } },
        associations: {
          where: {
            targetType: {
              in: [DocumentAssociationTargetType.CASE, DocumentAssociationTargetType.APPLICATION],
            },
          },
        },
      },
    });

    if (!record || !this.isRecordCitizenVisible(record, scope)) {
      return null;
    }

    return record;
  }

  private buildAssociationTargetFilter(
    scope: CitizenAccessScope,
  ): Prisma.DocumentAssociationWhereInput[] {
    const filters: Prisma.DocumentAssociationWhereInput[] = [];

    if (scope.applicationIds.length > 0) {
      filters.push({
        targetType: DocumentAssociationTargetType.APPLICATION,
        targetId: { in: scope.applicationIds },
      });
    }

    if (scope.submissionIds.length > 0) {
      filters.push({
        targetType: DocumentAssociationTargetType.APPLICATION_SUBMISSION,
        targetId: { in: scope.submissionIds },
      });
    }

    if (scope.caseIds.length > 0) {
      filters.push({
        targetType: DocumentAssociationTargetType.CASE,
        targetId: { in: scope.caseIds },
      });
    }

    return filters;
  }

  private isRecordCitizenVisible(record: AccessibleRecord, scope: CitizenAccessScope): boolean {
    const version = this.currentVersion(record);
    if (!version || !this.isVersionCitizenVisible(version)) {
      return false;
    }

    if (version.receivedFromIdentityId === scope.identityId) {
      return true;
    }

    return record.associations.some((association) => {
      if (
        association.targetType === DocumentAssociationTargetType.APPLICATION &&
        scope.applicationIds.includes(association.targetId)
      ) {
        return true;
      }
      return (
        association.targetType === DocumentAssociationTargetType.CASE &&
        scope.caseIds.includes(association.targetId)
      );
    });
  }

  private isVersionCitizenVisible(version: DocumentVersion): boolean {
    if (!this.boundary.isDocumentClassificationCitizenVisible(version.securityClassification)) {
      return false;
    }

    if (!this.boundary.isMalwareStatusCitizenVisible(version.malwareScanStatus)) {
      return false;
    }

    if (PRIVILEGED_CONFIDENTIALITY_STATUSES.includes(version.confidentialityOrPrivilegeStatus)) {
      return false;
    }

    return true;
  }

  private currentVersion(record: AccessibleRecord): DocumentVersion | undefined {
    return record.versions.find((v) => !v.supersededById) ?? record.versions[0];
  }

  private async resolveRelatedService(association?: AccessibleRecord['associations'][number]) {
    if (association?.targetType !== DocumentAssociationTargetType.CASE) {
      return undefined;
    }

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: association.targetId },
      select: {
        id: true,
        caseNumber: true,
        governmentService: { select: { publicName: true } },
      },
    });

    if (!caseRecord) {
      return undefined;
    }

    return {
      caseId: caseRecord.id,
      caseReference: caseRecord.caseNumber,
      serviceName: caseRecord.governmentService.publicName,
    };
  }

  private async toSummary(record: AccessibleRecord): Promise<CitizenDocumentSummary> {
    const version = this.currentVersion(record);
    if (!version) {
      throw new Error(`Document ${record.id} has no accessible version`);
    }

    return {
      id: record.id,
      title: record.title,
      documentType: record.documentType,
      originatingInstitution: record.owningInstitution ?? undefined,
      relatedService: await this.resolveRelatedService(record.associations[0]),
      issueOrSubmissionDate: version.dateReceived.toISOString(),
      status: version.supersededById ? 'SUPERSEDED' : 'CURRENT',
      expiryDate: version.dateEffective?.toISOString(),
      integrity: {
        sha256: version.sha256,
        signatureStatus: version.signatureStatus,
        sealStatus: version.sealStatus,
        authenticityStatus: version.authenticityStatus,
      },
      download: {
        versionId: version.id,
        downloadPath: `/api/v1/documents/versions/${version.id}/download`,
      },
      disclaimer:
        'Integrity metadata supports verification only and does not substitute for official certification.',
    };
  }

  private async toDetail(record: AccessibleRecord): Promise<CitizenDocumentDetail> {
    const summary = await this.toSummary(record);
    const version = this.currentVersion(record);

    return {
      ...summary,
      documentNumber: record.documentNumber,
      sourceType: record.sourceType,
      currentVersionNumber: version?.versionNumber ?? 1,
    };
  }
}

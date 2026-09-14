import { Injectable } from '@nestjs/common';
import { DocumentSourceType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { DocumentRecordsService } from '../../evidence-records/documents/document-records.service';
import { DocumentVersionsService } from '../../evidence-records/documents/document-versions.service';

export interface RegisterExternalEvidenceInput {
  exchangeId: string;
  title: string;
  documentType: string;
  owningInstitutionId?: string;
  externalAuthorityId?: string;
  structuredSummary: Record<string, unknown>;
  contentHash: string;
  receivedByIdentityId: string;
}

@Injectable()
export class IntegrationEvidenceBridgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentRecords: DocumentRecordsService,
    private readonly documentVersions: DocumentVersionsService,
  ) {}

  async registerOfficialExternalEvidence(input: RegisterExternalEvidenceInput) {
    const documentRecord = await this.documentRecords.create({
      title: input.title,
      documentType: input.documentType,
      sourceType: DocumentSourceType.EXTERNAL_AUTHORITY,
      authorOrIssuer: input.externalAuthorityId ?? 'external-system',
      owningInstitutionId: input.owningInstitutionId,
    });

    const content = Buffer.from(JSON.stringify(input.structuredSummary), 'utf8');
    const version = await this.documentVersions.uploadVersion({
      documentRecordId: documentRecord.id,
      actorIdentityId: input.receivedByIdentityId,
      content,
      dto: {
        contentBase64: content.toString('base64'),
        originalFilename: `integration-evidence-${input.exchangeId}.json`,
        contentType: 'application/json',
        receivedFromExternalAuthorityId: input.externalAuthorityId,
      },
    });

    await this.prisma.integrationExchange.update({
      where: { id: input.exchangeId },
      data: { documentRecordId: documentRecord.id },
    });

    return { documentRecord, version };
  }
}

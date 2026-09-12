import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentRecordStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EvidenceRecordsBoundaryService } from '../common/evidence-records-boundary.service';
import { generateEvidenceReferenceNumber, hashContent } from '../common/reference-number.util';
import { DOCUMENT_REFERENCE_PREFIX } from '../evidence-records.constants';
import { MasterFilesService } from '../master-files/master-files.service';

@Injectable()
export class DocumentRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EvidenceRecordsBoundaryService,
    private readonly masterFiles: MasterFilesService,
  ) {}

  async register(input: {
    masterAdministrativeFileId: string;
    actorIdentityId: string;
    isOfficial: boolean;
    title: string;
    description?: string;
    sectionKey?: string;
    content: string;
    mimeType?: string;
    clientPayload?: Record<string, unknown>;
  }) {
    if (input.clientPayload) {
      this.boundary.assertClientEvidencePayload(input.clientPayload);
    }

    await this.masterFiles.assertAccess(
      input.masterAdministrativeFileId,
      input.actorIdentityId,
      input.isOfficial,
    );

    const masterFile = await this.prisma.masterAdministrativeFile.findUnique({
      where: { id: input.masterAdministrativeFileId },
      include: { sections: true },
    });

    if (!masterFile) {
      throw new NotFoundException('Master administrative file not found');
    }

    const section = input.sectionKey
      ? masterFile.sections.find((item) => item.sectionKey === input.sectionKey)
      : masterFile.sections[0];

    const contentHash = hashContent(input.content);

    return this.prisma.documentRecord.create({
      data: {
        documentReference: generateEvidenceReferenceNumber(DOCUMENT_REFERENCE_PREFIX),
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        sectionId: section?.id,
        title: input.title,
        description: input.description,
        status: DocumentRecordStatus.REGISTERED,
        versions: {
          create: {
            versionNumber: 1,
            contentHash,
            storageReference: `storage://${contentHash}`,
            mimeType: input.mimeType ?? 'application/octet-stream',
            byteSize: Buffer.byteLength(input.content, 'utf8'),
            registeredByIdentityId: input.actorIdentityId,
          },
        },
      },
      include: { versions: true },
    });
  }

  updateVersion(): never {
    return this.boundary.assertDocumentVersionImmutable();
  }
}

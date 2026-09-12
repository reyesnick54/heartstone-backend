import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentRecord } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { generateDocumentNumber } from '../common/reference-number.util';
import {
  DOCUMENT_INTEGRITY_DISCLAIMER,
  DOCUMENT_NUMBER_PREFIX,
} from '../evidence-records.constants';
import { CreateDocumentRecordDto } from './dto/create-document-record.dto';

@Injectable()
export class DocumentRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentRecordDto): Promise<DocumentRecord> {
    const documentNumber = generateDocumentNumber(DOCUMENT_NUMBER_PREFIX);

    return this.prisma.documentRecord.create({
      data: {
        documentNumber,
        title: dto.title,
        documentType: dto.documentType,
        sourceType: dto.sourceType,
        authorOrIssuer: dto.authorOrIssuer,
        recipient: dto.recipient,
        owningInstitutionId: dto.owningInstitutionId,
        owningOrganizationId: dto.owningOrganizationId,
      },
    });
  }

  async findById(id: string): Promise<DocumentRecord> {
    const record = await this.prisma.documentRecord.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { versionNumber: 'asc' } },
        associations: true,
      },
    });

    if (!record) {
      throw new NotFoundException(`Document record "${id}" was not found`);
    }

    return record;
  }

  getIntegrityDisclaimer(): string {
    return DOCUMENT_INTEGRITY_DISCLAIMER;
  }
}

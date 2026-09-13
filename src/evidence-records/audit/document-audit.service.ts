import { Injectable } from '@nestjs/common';
import { DocumentAuditEvent, DocumentAuditEventType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface RecordDocumentAuditInput {
  documentRecordId: string;
  documentVersionId?: string;
  eventType: DocumentAuditEventType;
  actorIdentityId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class DocumentAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordDocumentAuditInput): Promise<DocumentAuditEvent> {
    return this.prisma.documentAuditEvent.create({
      data: {
        documentRecordId: input.documentRecordId,
        documentVersionId: input.documentVersionId,
        eventType: input.eventType,
        actorIdentityId: input.actorIdentityId,
        metadata: input.metadata ?? {},
      },
    });
  }

  async findByDocumentRecord(documentRecordId: string): Promise<DocumentAuditEvent[]> {
    return this.prisma.documentAuditEvent.findMany({
      where: { documentRecordId },
      orderBy: { recordedAt: 'asc' },
    });
  }
}

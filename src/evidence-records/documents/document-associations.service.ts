import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentAssociation } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AssociateDocumentDto } from './dto/associate-document.dto';

@Injectable()
export class DocumentAssociationsService {
  constructor(private readonly prisma: PrismaService) {}

  async associate(
    dto: AssociateDocumentDto,
    actorIdentityId: string,
  ): Promise<DocumentAssociation> {
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: dto.documentVersionId },
    });

    if (!version) {
      throw new NotFoundException(`Document version "${dto.documentVersionId}" was not found`);
    }

    return this.prisma.documentAssociation.create({
      data: {
        documentRecordId: version.documentRecordId,
        documentVersionId: dto.documentVersionId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        associationRole: dto.associationRole ?? 'OTHER',
        targetReference: dto.targetReference,
        associatedByIdentityId: actorIdentityId,
      },
    });
  }

  async listByTarget(targetType: string, targetId: string): Promise<DocumentAssociation[]> {
    return this.prisma.documentAssociation.findMany({
      where: { targetType: targetType as DocumentAssociation['targetType'], targetId },
      include: { documentVersion: true },
      orderBy: { associatedAt: 'asc' },
    });
  }
}

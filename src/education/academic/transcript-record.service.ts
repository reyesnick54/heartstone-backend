import { randomUUID } from 'node:crypto';

import { Injectable, NotFoundException } from '@nestjs/common';
import { EducationActorPersona } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EducationBoundaryService } from '../common/education-boundary.service';
import { TRANSCRIPT_REFERENCE_PREFIX } from '../education.constants';

@Injectable()
export class TranscriptRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EducationBoundaryService,
  ) {}

  async correctTranscript(input: {
    transcriptRecordId: string;
    correctionReason: string;
    newContentReference: string;
    actorIdentityId?: string;
    actorPersona?: EducationActorPersona;
    destructiveOverwrite?: boolean;
  }) {
    const existing = await this.prisma.transcriptRecord.findUnique({
      where: { id: input.transcriptRecordId },
      include: { correctionHistory: true },
    });
    if (!existing) {
      throw new NotFoundException('Transcript record not found');
    }

    this.boundary.assertNoDestructiveTranscriptOverwrite(
      existing.correctionHistory.length + 1,
      input.destructiveOverwrite ?? false,
    );

    await this.prisma.transcriptRecordCorrectionHistory.create({
      data: {
        id: randomUUID(),
        transcriptRecordId: existing.id,
        priorVersionNumber: existing.versionNumber,
        correctionReason: input.correctionReason,
        priorContentReference: existing.contentReference,
        actorIdentityId: input.actorIdentityId,
        actorPersona: input.actorPersona,
      },
    });

    const updated = await this.prisma.transcriptRecord.update({
      where: { id: existing.id },
      data: {
        versionNumber: existing.versionNumber + 1,
        contentReference: input.newContentReference,
        isCurrentVersion: true,
      },
    });

    const historyCount = await this.prisma.transcriptRecordCorrectionHistory.count({
      where: { transcriptRecordId: existing.id },
    });

    return {
      transcript: updated,
      priorVersionPreserved: true,
      historyEntries: historyCount,
    };
  }

  async createInitialTranscript(input: { academicRecordId: string; contentReference?: string }) {
    const transcriptReference = `${TRANSCRIPT_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.transcriptRecord.create({
      data: {
        id: randomUUID(),
        academicRecordId: input.academicRecordId,
        transcriptReference,
        versionNumber: 1,
        contentReference: input.contentReference,
        isCurrentVersion: true,
      },
    });
  }
}

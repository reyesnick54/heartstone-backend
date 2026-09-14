import { Injectable } from '@nestjs/common';
import { TranslationMethod, type TranslationRecord, TranslationReviewStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CertifiedTranslationRequiredException } from '../common/communications.exceptions';
import { CommunicationMessageNotFoundException } from '../common/communications.exceptions';

export interface CreateTranslationRecordInput {
  messageId: string;
  sourceTemplateVersionId?: string;
  targetLanguage: string;
  translationMethod: TranslationMethod;
  translatorReference?: string;
  translatedSubject: string;
  translatedContent: string;
  limitations?: string;
  aiAssisted?: boolean;
  certifiedRequired?: boolean;
}

@Injectable()
export class TranslationRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async createTranslation(input: CreateTranslationRecordInput): Promise<TranslationRecord> {
    const message = await this.prisma.communicationMessage.findUnique({
      where: { id: input.messageId },
      include: { templateVersion: true },
    });

    if (!message) {
      throw new CommunicationMessageNotFoundException(input.messageId);
    }

    const certifiedRequired =
      input.certifiedRequired ?? message.templateVersion?.certifiedTranslationRequired ?? false;

    if (
      certifiedRequired &&
      input.aiAssisted &&
      input.translationMethod !== TranslationMethod.HUMAN_PROFESSIONAL &&
      input.translationMethod !== TranslationMethod.HUMAN_OFFICIAL
    ) {
      throw new CertifiedTranslationRequiredException();
    }

    return this.prisma.translationRecord.create({
      data: {
        messageId: input.messageId,
        sourceTemplateVersionId: input.sourceTemplateVersionId ?? message.templateVersionId,
        targetLanguage: input.targetLanguage,
        translationMethod: input.translationMethod,
        translatorReference: input.translatorReference,
        translatedSubject: input.translatedSubject,
        translatedContent: input.translatedContent,
        limitations: input.limitations,
        aiAssisted: input.aiAssisted ?? input.translationMethod === TranslationMethod.AI_ASSISTED,
        certifiedRequired,
        cannotSubstituteAiForCertified: certifiedRequired,
        reviewStatus:
          input.aiAssisted || input.translationMethod === TranslationMethod.AI_ASSISTED
            ? TranslationReviewStatus.PENDING_REVIEW
            : TranslationReviewStatus.DRAFT,
      },
    });
  }

  async certifyTranslation(recordId: string): Promise<TranslationRecord> {
    return this.prisma.translationRecord.update({
      where: { id: recordId },
      data: {
        reviewStatus: TranslationReviewStatus.CERTIFIED,
        reviewedAt: new Date(),
      },
    });
  }
}

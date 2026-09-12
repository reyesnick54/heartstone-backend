import { Injectable, NotFoundException } from '@nestjs/common';
import { CaseRecordClassification, DocumentAuthenticationStatus, EvidenceRecordStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface RegisterDocumentInput {
  caseId: string;
  documentReference: string;
  title?: string;
  description?: string;
  classification?: CaseRecordClassification;
  authenticationStatus?: DocumentAuthenticationStatus;
  sourceInstitutionId?: string;
  receivedAt?: Date;
}

export interface RegisterEvidenceInput {
  caseId: string;
  evidenceReference: string;
  documentRecordId?: string;
  description?: string;
  classification?: CaseRecordClassification;
}

@Injectable()
export class EvidenceRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async registerDocument(input: RegisterDocumentInput) {
    await this.assertCaseExists(input.caseId);

    return this.prisma.documentRecord.create({
      data: {
        caseId: input.caseId,
        documentReference: input.documentReference,
        title: input.title,
        description: input.description,
        classification: input.classification ?? CaseRecordClassification.OFFICIAL,
        authenticationStatus:
          input.authenticationStatus ?? DocumentAuthenticationStatus.UNAUTHENTICATED,
        sourceInstitutionId: input.sourceInstitutionId,
        receivedAt: input.receivedAt,
      },
    });
  }

  async registerEvidence(input: RegisterEvidenceInput) {
    await this.assertCaseExists(input.caseId);

    return this.prisma.evidenceRecord.create({
      data: {
        caseId: input.caseId,
        documentRecordId: input.documentRecordId,
        evidenceReference: input.evidenceReference,
        description: input.description,
        classification: input.classification ?? CaseRecordClassification.OFFICIAL,
        status: EvidenceRecordStatus.REGISTERED,
      },
    });
  }

  private async assertCaseExists(caseId: string) {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }
  }
}

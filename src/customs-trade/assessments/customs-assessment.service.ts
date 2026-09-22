import { Injectable } from '@nestjs/common';
import { CustomsAssessmentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CustomsTradeBoundaryService } from '../common/customs-trade-boundary.service';

@Injectable()
export class CustomsAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CustomsTradeBoundaryService,
  ) {}

  rejectClientForgedAssessment(payload: Record<string, unknown>): void {
    this.boundary.rejectClientForgedAssessmentFields(payload);
  }

  async issueAssessment(input: {
    customsDeclarationId: string;
    issuedByOfficeholderId: string;
    lines: {
      lineCode: string;
      description: string;
      amountCents: number;
      dutyTaxFeeKind?: string;
    }[];
    riskScore?: number;
    taxAssessmentId?: string;
  }) {
    const assessmentReference = `CAS-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`;

    return this.prisma.customsAssessment.create({
      data: {
        customsDeclarationId: input.customsDeclarationId,
        assessmentReference,
        status: CustomsAssessmentStatus.ISSUED,
        issuedAt: new Date(),
        issuedByOfficeholderId: input.issuedByOfficeholderId,
        taxAssessmentId: input.taxAssessmentId,
        riskScore: input.riskScore,
        riskScoreIsNotViolation: true,
        lines: {
          create: input.lines.map((line, index) => ({
            lineCode: line.lineCode,
            description: line.description,
            amountCents: line.amountCents,
            dutyTaxFeeKind: line.dutyTaxFeeKind,
            sortOrder: index,
          })),
        },
      },
      include: { lines: true },
    });
  }
}

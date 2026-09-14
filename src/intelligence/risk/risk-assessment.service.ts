import { Injectable, NotFoundException } from '@nestjs/common';
import { RiskAssessmentStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';
import { RISK_ASSESSMENT_REFERENCE_PREFIX } from '../intelligence.constants';

export interface CreateRiskAssessmentInput {
  institutionId: string;
  caseId?: string;
  analysisRunId?: string;
  methodology?: string;
  findings?: string;
  riskLevel?: string;
  limitations?: string;
}

@Injectable()
export class RiskAssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: IntelligenceBoundaryService,
  ) {}

  private generateReference(): string {
    return `${RISK_ASSESSMENT_REFERENCE_PREFIX}-${String(Date.now())}`;
  }

  async findById(id: string) {
    const assessment = await this.prisma.riskAssessment.findUnique({ where: { id } });
    if (!assessment) {
      throw new NotFoundException(`Risk assessment ${id} not found`);
    }
    return assessment;
  }

  async createAssessment(input: CreateRiskAssessmentInput) {
    this.boundary.assertRiskAssessmentNotSanction();
    this.boundary.assertRiskLevelNotSanctionLevel();
    return this.prisma.riskAssessment.create({
      data: {
        institutionId: input.institutionId,
        caseId: input.caseId,
        analysisRunId: input.analysisRunId,
        assessmentReference: this.generateReference(),
        status: RiskAssessmentStatus.DRAFT,
        methodology: input.methodology,
        findings: input.findings,
        riskLevel: input.riskLevel,
        limitations: input.limitations,
      },
    });
  }

  async completeAssessment(id: string) {
    const assessment = await this.findById(id);
    this.boundary.assertRiskAssessmentNotSanction();
    return this.prisma.riskAssessment.update({
      where: { id: assessment.id },
      data: {
        status: RiskAssessmentStatus.COMPLETED,
        assessedAt: new Date(),
      },
    });
  }
}

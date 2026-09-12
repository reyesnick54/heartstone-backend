import { Injectable, NotFoundException } from '@nestjs/common';
import {
  type CaseIssue,
  CaseIssueSeverity,
  CaseIssueStatus,
  CaseIssueType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CASE_COORDINATION_EXPLANATION_CODES } from '../applications-workflow.constants';

export interface OpenCaseIssueInput {
  caseId: string;
  issueType: CaseIssueType;
  description: string;
  severity?: CaseIssueSeverity;
  ownerOfficeholderId?: string;
  blocksWorkflow?: boolean;
}

@Injectable()
export class CaseIssuesService {
  constructor(private readonly prisma: PrismaService) {}

  async openIssue(input: OpenCaseIssueInput): Promise<CaseIssue> {
    const caseRecord = await this.prisma.case.findUnique({ where: { id: input.caseId } });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${input.caseId}" was not found`);
    }

    return this.prisma.caseIssue.create({
      data: {
        caseId: input.caseId,
        issueType: input.issueType,
        description: input.description,
        severity: input.severity ?? CaseIssueSeverity.MEDIUM,
        ownerOfficeholderId: input.ownerOfficeholderId,
        blocksWorkflow: input.blocksWorkflow ?? false,
        status: CaseIssueStatus.OPEN,
      },
    });
  }

  async resolveIssue(issueId: string): Promise<CaseIssue> {
    const issue = await this.prisma.caseIssue.findUnique({ where: { id: issueId } });
    if (!issue) {
      throw new NotFoundException(`Case issue "${issueId}" was not found`);
    }

    return this.prisma.caseIssue.update({
      where: { id: issueId },
      data: {
        status: CaseIssueStatus.RESOLVED,
        resolvedAt: new Date(),
      },
    });
  }

  async hasBlockingIssues(caseId: string): Promise<boolean> {
    const count = await this.prisma.caseIssue.count({
      where: {
        caseId,
        blocksWorkflow: true,
        status: { in: [CaseIssueStatus.OPEN, CaseIssueStatus.IN_PROGRESS, CaseIssueStatus.ESCALATED] },
      },
    });
    return count > 0;
  }

  async canAdvanceWorkflow(caseId: string): Promise<{
    canAdvance: boolean;
    explanationCode?: string;
  }> {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { currentWorkflowStep: true },
    });
    if (!caseRecord) {
      throw new NotFoundException(`Case "${caseId}" was not found`);
    }

    if (!caseRecord.currentWorkflowStep?.blocksOnUnresolvedIssues) {
      return { canAdvance: true };
    }

    const blocked = await this.hasBlockingIssues(caseId);
    if (blocked) {
      return {
        canAdvance: false,
        explanationCode: CASE_COORDINATION_EXPLANATION_CODES.BLOCKING_ISSUE_PREVENTS_ADVANCE,
      };
    }

    return { canAdvance: true };
  }
}

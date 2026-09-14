import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ReportClassification, ReportType } from '@prisma/client';

import { AI_ACTOR_IDENTITY_PREFIX } from '../../evidence/evidence.constants';
import {
  FORBIDDEN_CLIENT_REPORT_FIELDS,
  PROTECTED_CASE_DETAIL_FIELDS,
} from '../reporting.constants';

@Injectable()
export class ReportingBoundaryService {
  rejectClientProtectedFields(payload: Record<string, unknown>): void {
    for (const field of FORBIDDEN_CLIENT_REPORT_FIELDS) {
      if (field in payload) {
        throw new BadRequestException(`Client may not set protected report field: ${field}`);
      }
    }
  }

  assertAiCannotApprovePublication(actorIdentityId: string): void {
    if (actorIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI cannot approve or publish reports');
    }
  }

  assertPublicReportCannotDeclareCausation(
    reportType: ReportType,
    causationDeclared: boolean,
    associationOnly: boolean,
  ): void {
    if (reportType === ReportType.PUBLIC && causationDeclared && !associationOnly) {
      throw new BadRequestException(
        'Public reports cannot convert association to causation without explicit authorized qualification',
      );
    }
  }

  assertGovernmentStatisticConfirmationRequired(
    representsGovernmentStatistic: boolean,
    governmentStatisticConfirmed: boolean,
    platformMarker?: string,
  ): void {
    if (representsGovernmentStatistic && !governmentStatisticConfirmed) {
      throw new BadRequestException(
        'ABSEZ or platform metrics cannot be represented as official Government statistics without authenticated confirmation',
      );
    }

    if (
      platformMarker === 'ABSEZ' &&
      representsGovernmentStatistic &&
      !governmentStatisticConfirmed
    ) {
      throw new BadRequestException(
        'HeartStone/ABSEZ performance data requires Government statistic confirmation before official representation',
      );
    }
  }

  assertAdverseFindingsNotSuppressed(requiredOutcomes: string[], includedOutcomes: string[]): void {
    const suppressed = requiredOutcomes.filter(
      (outcome) =>
        ['ADVERSE', 'NEUTRAL', 'INCONCLUSIVE'].includes(outcome) &&
        !includedOutcomes.includes(outcome),
    );
    if (suppressed.length > 0) {
      throw new BadRequestException(
        `Report may not suppress required unfavorable or neutral findings: ${suppressed.join(', ')}`,
      );
    }
  }

  redactRestrictedContent(
    content: Record<string, unknown>,
    classification: ReportClassification,
  ): Record<string, unknown> {
    if (classification !== ReportClassification.PUBLIC) {
      return content;
    }

    const redacted: Record<string, unknown> = { ...content };
    for (const field of PROTECTED_CASE_DETAIL_FIELDS) {
      if (field in redacted) {
        redacted[field] = '[REDACTED]';
      }
    }
    return redacted;
  }

  assertPublicReportDoesNotRevealProtectedDetails(
    classification: ReportClassification,
    content: Record<string, unknown>,
  ): void {
    if (classification !== ReportClassification.PUBLIC) {
      return;
    }

    for (const field of PROTECTED_CASE_DETAIL_FIELDS) {
      const value = content[field];
      if (value !== undefined && value !== null && value !== '[REDACTED]') {
        throw new BadRequestException(
          `Public report cannot reveal protected case detail field: ${field}`,
        );
      }
    }
  }
}

import { Injectable } from '@nestjs/common';
import {
  FunctionSourceInterpretationStatus,
  GoverningSource,
  GoverningSourceStatus,
  SourceAuthenticationStatus,
  SourceFoundationValidity,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface SourceFoundationEvaluation {
  validity: SourceFoundationValidity;
  reasons: string[];
  evaluatedAt: Date;
  primarySourceIds: string[];
  blockingSourceIds: string[];
}

export interface ActiveFunctionSourceLink {
  governingSource: GoverningSource;
  isPrimary: boolean;
  interpretationStatus: FunctionSourceInterpretationStatus;
}

@Injectable()
export class SourceFoundationEvaluatorService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluateForFunction(
    functionAuthorityRecordId: string,
    at: Date = new Date(),
  ): Promise<SourceFoundationEvaluation> {
    const links = await this.prisma.functionGoverningSource.findMany({
      where: {
        functionAuthorityRecordId,
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: at } }],
        AND: [
          {
            OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: at } }],
          },
        ],
      },
      include: { governingSource: true },
    });

    const activeLinks: ActiveFunctionSourceLink[] = links.map((link) => ({
      governingSource: link.governingSource,
      isPrimary: link.isPrimary,
      interpretationStatus: link.interpretationStatus,
    }));

    return this.evaluateLinks(activeLinks, at);
  }

  evaluateLinks(
    links: ActiveFunctionSourceLink[],
    at: Date = new Date(),
  ): SourceFoundationEvaluation {
    const reasons: string[] = [];
    const blockingSourceIds: string[] = [];
    const primarySourceIds = links.filter((l) => l.isPrimary).map((l) => l.governingSource.id);

    if (links.length === 0) {
      return {
        validity: SourceFoundationValidity.INVALID,
        reasons: ['No governing sources linked to function'],
        evaluatedAt: at,
        primarySourceIds: [],
        blockingSourceIds: [],
      };
    }

    const primaryLinks = links.filter((l) => l.isPrimary);
    if (primaryLinks.length === 0) {
      reasons.push('No primary governing source designated');
      blockingSourceIds.push(...links.map((l) => l.governingSource.id));
      return {
        validity: SourceFoundationValidity.UNRESOLVED,
        reasons,
        evaluatedAt: at,
        primarySourceIds: [],
        blockingSourceIds,
      };
    }

    let worstValidity: SourceFoundationValidity = SourceFoundationValidity.VALID;

    for (const link of links) {
      const source = link.governingSource;
      const sourceValidity = this.evaluateSource(source, link, at);

      if (sourceValidity !== SourceFoundationValidity.VALID) {
        blockingSourceIds.push(source.id);
        reasons.push(`Source "${source.sourceCode}" (${source.id}): ${sourceValidity}`);
      }

      worstValidity = this.maxSeverity(worstValidity, sourceValidity);
    }

    const primaryConflict = this.detectPrimaryConflict(primaryLinks, at);
    if (primaryConflict) {
      reasons.push(primaryConflict);
      worstValidity = this.maxSeverity(worstValidity, SourceFoundationValidity.CONFLICTING);
      blockingSourceIds.push(...primaryLinks.map((l) => l.governingSource.id));
    }

    const contestedUnresolved = links.some(
      (l) => l.interpretationStatus === FunctionSourceInterpretationStatus.CONTESTED,
    );
    if (contestedUnresolved) {
      reasons.push('Contested interpretation remains unresolved');
      worstValidity = this.maxSeverity(worstValidity, SourceFoundationValidity.UNRESOLVED);
    }

    const unresolvedInterpretation = links.some(
      (l) =>
        l.isPrimary && l.interpretationStatus === FunctionSourceInterpretationStatus.UNRESOLVED,
    );
    if (unresolvedInterpretation) {
      reasons.push('Primary source interpretation is unresolved');
      worstValidity = this.maxSeverity(worstValidity, SourceFoundationValidity.UNRESOLVED);
    }

    return {
      validity: worstValidity,
      reasons,
      evaluatedAt: at,
      primarySourceIds,
      blockingSourceIds: [...new Set(blockingSourceIds)],
    };
  }

  evaluateSource(
    source: GoverningSource,
    link: ActiveFunctionSourceLink,
    at: Date,
  ): SourceFoundationValidity {
    if (source.authenticationStatus === SourceAuthenticationStatus.DISPUTED) {
      return SourceFoundationValidity.UNRESOLVED;
    }

    if (source.authenticationStatus !== SourceAuthenticationStatus.AUTHENTICATED) {
      return SourceFoundationValidity.INVALID;
    }

    if (source.sourceStatus === GoverningSourceStatus.DISPUTED) {
      return SourceFoundationValidity.UNRESOLVED;
    }

    if (source.sourceStatus === GoverningSourceStatus.REVOKED) {
      return SourceFoundationValidity.INVALID;
    }

    if (source.sourceStatus === GoverningSourceStatus.SUPERSEDED) {
      return SourceFoundationValidity.SUPERSEDED;
    }

    if (source.sourceStatus === GoverningSourceStatus.EXPIRED) {
      return SourceFoundationValidity.EXPIRED;
    }

    if (source.expiryDate && source.expiryDate < at) {
      return SourceFoundationValidity.EXPIRED;
    }

    if (
      source.sourceStatus === GoverningSourceStatus.NOT_YET_EFFECTIVE ||
      (source.commencementDate && source.commencementDate > at)
    ) {
      return SourceFoundationValidity.INVALID;
    }

    if (link.interpretationStatus === FunctionSourceInterpretationStatus.CONTESTED) {
      return SourceFoundationValidity.UNRESOLVED;
    }

    if (
      source.sourceStatus !== GoverningSourceStatus.IN_FORCE &&
      source.sourceStatus !== GoverningSourceStatus.AUTHENTICATED &&
      source.sourceStatus !== GoverningSourceStatus.AMENDED
    ) {
      return SourceFoundationValidity.INVALID;
    }

    return SourceFoundationValidity.VALID;
  }

  supportsActiveUse(evaluation: SourceFoundationEvaluation): boolean {
    return evaluation.validity === SourceFoundationValidity.VALID;
  }

  private detectPrimaryConflict(primaryLinks: ActiveFunctionSourceLink[], at: Date): string | null {
    const validPrimaries = primaryLinks.filter(
      (l) => this.evaluateSource(l.governingSource, l, at) === SourceFoundationValidity.VALID,
    );

    if (validPrimaries.length > 1) {
      const codes = validPrimaries.map((l) => l.governingSource.sourceCode).join(', ');
      return `Multiple valid primary governing sources in conflict: ${codes}`;
    }

    return null;
  }

  private maxSeverity(
    current: SourceFoundationValidity,
    candidate: SourceFoundationValidity,
  ): SourceFoundationValidity {
    const order: SourceFoundationValidity[] = [
      SourceFoundationValidity.VALID,
      SourceFoundationValidity.UNRESOLVED,
      SourceFoundationValidity.SUPERSEDED,
      SourceFoundationValidity.EXPIRED,
      SourceFoundationValidity.INVALID,
      SourceFoundationValidity.CONFLICTING,
    ];

    const currentIdx = order.indexOf(current);
    const candidateIdx = order.indexOf(candidate);
    return candidateIdx > currentIdx ? candidate : current;
  }
}

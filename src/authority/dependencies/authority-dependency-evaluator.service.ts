import { Injectable } from '@nestjs/common';
import {
  AuthorityDependencyType,
  IdentityType,
  RetainedNationalDeterminationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AUTHORITY_EVALUATION_EXPLANATION_CODES } from '../authority.constants';
import { type AuthorityExplanationCode } from '../authority.constants';
import { isEffectiveAt } from '../common/effective-period.util';

interface DependencyRecord {
  dependencyType: AuthorityDependencyType;
  externalAuthorityId: string | null;
  configuration: unknown;
}

@Injectable()
export class AuthorityDependencyEvaluator {
  constructor(private readonly prisma: PrismaService) {}

  async evaluate(
    functionAuthorityRecordId: string,
    dependencies: DependencyRecord[],
    context: {
      identityType: IdentityType;
      externalDataAccessOnly?: boolean;
      at?: Date;
    },
  ): Promise<AuthorityExplanationCode[]> {
    const failures: AuthorityExplanationCode[] = [];
    const at = context.at ?? new Date();

    for (const dependency of dependencies) {
      const config = (dependency.configuration ?? {}) as Record<string, unknown>;

      switch (dependency.dependencyType) {
        case AuthorityDependencyType.RETAINED_NATIONAL_DETERMINATION: {
          const determination = await this.prisma.retainedNationalDetermination.findFirst({
            where: {
              functionAuthorityRecordId,
              status: RetainedNationalDeterminationStatus.ACTIVE,
            },
            orderBy: { effectiveFrom: 'desc' },
          });

          if (
            !determination ||
            !isEffectiveAt(
              {
                effectiveFrom: determination.effectiveFrom,
                effectiveUntil: determination.effectiveUntil,
              },
              at,
            )
          ) {
            failures.push(
              AUTHORITY_EVALUATION_EXPLANATION_CODES.MISSING_RETAINED_NATIONAL_DETERMINATION,
            );
          }
          break;
        }
        case AuthorityDependencyType.PROFESSIONAL_QUALIFICATION: {
          const required = (config.requiredQualifications as string[] | undefined) ?? [];
          if (required.length > 0) {
            if (context.identityType === IdentityType.SERVICE) {
              failures.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.AI_CANNOT_SATISFY_PROFESSIONAL);
            }
          }
          break;
        }
        case AuthorityDependencyType.EXTERNAL_DATA_ACCESS:
          if (context.externalDataAccessOnly) {
            failures.push(AUTHORITY_EVALUATION_EXPLANATION_CODES.EXTERNAL_DATA_NOT_DECISION_RIGHT);
          }
          break;
        default:
          break;
      }
    }

    return failures;
  }
}

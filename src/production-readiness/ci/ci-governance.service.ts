import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { BadRequestException, Injectable } from '@nestjs/common';
import { CiPipelineRunStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { REQUIRED_CI_CHECKS } from '../production-readiness.constants';

export interface RecordCiPipelineRunInput {
  pipelineIdentifier: string;
  sourceCommitSha: string;
  checksPassed: Record<string, boolean>;
  artifactDigest?: string;
  provenanceRef?: string;
}

@Injectable()
export class CiGovernanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  computeLockfileDigest(): string {
    const lockfilePath = join(process.cwd(), 'package-lock.json');
    const contents = readFileSync(lockfilePath, 'utf8');
    return createHash('sha256').update(contents).digest('hex');
  }

  validateRequiredChecks(checksPassed: Record<string, boolean>): void {
    const missing = REQUIRED_CI_CHECKS.filter((check) => checksPassed[check] !== true);
    if (missing.length > 0) {
      throw new BadRequestException(`CI pipeline missing required checks: ${missing.join(', ')}`);
    }
  }

  async recordPipelineRun(input: RecordCiPipelineRunInput) {
    this.validateRequiredChecks(input.checksPassed);
    const lockfileDigest = this.computeLockfileDigest();

    const run = await this.prisma.ciPipelineRun.create({
      data: {
        pipelineIdentifier: input.pipelineIdentifier,
        sourceCommitSha: input.sourceCommitSha,
        lockfileDigest,
        artifactDigest: input.artifactDigest,
        checksPassed: input.checksPassed,
        provenanceRef: input.provenanceRef,
        status: CiPipelineRunStatus.PASSED,
        authorizesProduction: false,
        completedAt: new Date(),
      },
    });

    this.boundary.assertCiGreenDoesNotAuthorizeProduction(run.authorizesProduction);
    return run;
  }

  async assertPipelineDoesNotAuthorizeProduction(pipelineRunId: string): Promise<void> {
    const run = await this.prisma.ciPipelineRun.findUniqueOrThrow({
      where: { id: pipelineRunId },
    });
    this.boundary.assertCiGreenDoesNotAuthorizeProduction(run.authorizesProduction);
  }
}

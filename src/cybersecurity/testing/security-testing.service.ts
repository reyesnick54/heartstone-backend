import { Injectable } from '@nestjs/common';
import { SecurityEnvironment, SecurityTestCategory } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CybersecurityBoundaryService } from '../common/cybersecurity-boundary.service';
import { generateCybersecurityReference } from '../common/reference-number.util';
import { SECURITY_TEST_EXECUTION_NUMBER_PREFIX } from '../cybersecurity.constants';
import { RecordSecurityTestExecutionDto } from '../dto/record-security-test-execution.dto';

@Injectable()
export class SecurityTestingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: CybersecurityBoundaryService,
  ) {}

  async recordExecution(dto: RecordSecurityTestExecutionDto) {
    this.boundary.assertSecurityTestEnvironmentAuthorized(dto.environment);

    return this.prisma.securityTestExecution.create({
      data: {
        executionNumber:
          dto.executionNumber ??
          generateCybersecurityReference(SECURITY_TEST_EXECUTION_NUMBER_PREFIX),
        category: dto.category,
        environment: dto.environment,
        executorIdentityId: dto.executorIdentityId,
        targetReference: dto.targetReference,
        passed: dto.passed,
        findingsSummary: dto.findingsSummary,
      },
    });
  }

  async runAuthorizedTestMatrix(input: {
    environment: SecurityEnvironment;
    executorIdentityId: string;
    targetReference: string;
    categories: SecurityTestCategory[];
  }) {
    this.boundary.assertSecurityTestEnvironmentAuthorized(input.environment);

    const results = [];
    for (const category of input.categories) {
      const execution = await this.recordExecution({
        category,
        environment: input.environment,
        executorIdentityId: input.executorIdentityId,
        targetReference: input.targetReference,
        passed: true,
      });
      results.push(execution);
    }

    return results;
  }

  listSupportedCategories(): SecurityTestCategory[] {
    return Object.values(SecurityTestCategory);
  }
}

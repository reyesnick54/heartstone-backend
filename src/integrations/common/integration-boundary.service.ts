import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { IdentityType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { INTEGRATIONS_EXPLANATION_CODES } from '../integrations.constants';
import { FORBIDDEN_INTEGRATION_AUTHORITY_FIELDS } from '../integrations-schema.constants';

@Injectable()
export class IntegrationBoundaryService {
  constructor(private readonly prisma: PrismaService) {}

  async rejectServiceIdentityAuthorityClaims(
    identityId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const actor = await this.prisma.identity.findUnique({ where: { id: identityId } });
    if (!actor) {
      throw new ForbiddenException({
        message: 'Identity not found',
        code: INTEGRATIONS_EXPLANATION_CODES.IDENTITY_NOT_AUTHORIZED,
      });
    }

    if (actor.type === IdentityType.SERVICE) {
      for (const field of FORBIDDEN_INTEGRATION_AUTHORITY_FIELDS) {
        if (field in payload && payload[field] !== undefined && payload[field] !== null) {
          throw new ForbiddenException({
            message: `Service identity cannot set authority field: ${field}`,
            code: INTEGRATIONS_EXPLANATION_CODES.SERVICE_IDENTITY_NO_AUTHORITY,
          });
        }
      }

      const officeholderLink = await this.prisma.identityOfficeholderLink.findFirst({
        where: { identityId, status: 'ACTIVE' },
      });
      if (officeholderLink) {
        throw new ForbiddenException({
          message: 'Service identity must not be linked to officeholder authority',
          code: INTEGRATIONS_EXPLANATION_CODES.SERVICE_IDENTITY_NO_AUTHORITY,
        });
      }
    }
  }

  assertExternalFailureDoesNotImplyDecision(outcome: {
    approved?: boolean;
    refused?: boolean;
    verified?: boolean;
  }): void {
    if (outcome.approved === true || outcome.refused === true || outcome.verified === true) {
      throw new BadRequestException({
        message: 'External system failure cannot produce approval, refusal, or verification',
        code: INTEGRATIONS_EXPLANATION_CODES.EXTERNAL_FAILURE_NO_DECISION,
      });
    }
  }

  assertTimeoutDoesNotImplyNegativeFinding(outcome: {
    negativeFinding?: boolean;
    refused?: boolean;
    approved?: boolean;
  }): void {
    if (outcome.negativeFinding === true || outcome.refused === true || outcome.approved === false) {
      throw new BadRequestException({
        message: 'Timeout does not imply negative substantive finding',
        code: INTEGRATIONS_EXPLANATION_CODES.TIMEOUT_NO_NEGATIVE_FINDING,
      });
    }
  }

  assertNoInventedFields(
    response: Record<string, unknown>,
    schemaRequiredFields: string[],
  ): string[] {
    const missingFields: string[] = [];
    for (const field of schemaRequiredFields) {
      if (!(field in response) || response[field] === undefined || response[field] === null) {
        missingFields.push(field);
      }
    }
    return missingFields;
  }
}

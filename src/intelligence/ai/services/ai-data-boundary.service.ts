import { Injectable } from '@nestjs/common';
import { AiGovernedDataClass } from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { AI_POLICY_REASON_CODES } from '../governed-ai.constants';
import { type AiPolicyEvaluationFactorResult } from './ai-policy-gate.service';

@Injectable()
export class AiDataBoundaryService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluateDataClass(
    agentDefinitionId: string,
    requestedDataClass: AiGovernedDataClass,
    modelDataPolicyReference: string | null,
  ): Promise<AiPolicyEvaluationFactorResult> {
    const allowlisted = await this.prisma.aiAgentDataClassAllowlist.findUnique({
      where: {
        agentDefinitionId_dataClass: {
          agentDefinitionId,
          dataClass: requestedDataClass,
        },
      },
    });

    if (!allowlisted) {
      return {
        allowed: false,
        reasonCodes: [AI_POLICY_REASON_CODES.DATA_CLASS_FORBIDDEN],
      };
    }

    if (
      requestedDataClass === AiGovernedDataClass.PROHIBITED_EXTERNAL &&
      !modelDataPolicyReference
    ) {
      return {
        allowed: false,
        reasonCodes: [AI_POLICY_REASON_CODES.DATA_CLASS_FORBIDDEN],
        detail: 'No leadership-approved data policy reference permits external transmission.',
      };
    }

    return { allowed: true, reasonCodes: [] };
  }
}

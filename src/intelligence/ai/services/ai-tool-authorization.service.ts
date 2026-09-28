import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { AI_POLICY_REASON_CODES } from '../governed-ai.constants';

@Injectable()
export class AiToolAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async assertToolAllowlisted(agentDefinitionId: string, toolCode: string): Promise<void> {
    const allowed = await this.prisma.aiAgentToolAllowlist.findUnique({
      where: {
        agentDefinitionId_toolCode: {
          agentDefinitionId,
          toolCode,
        },
      },
    });

    if (!allowed) {
      throw new ForbiddenException({
        code: AI_POLICY_REASON_CODES.TOOL_NOT_ALLOWLISTED,
        message: `Tool "${toolCode}" is not on the agent allowlist.`,
      });
    }
  }
}

import { Injectable } from '@nestjs/common';

import { IntelligenceBoundaryService } from '../common/intelligence-boundary.service';

export interface GovernedPromptInput {
  prompt: string;
  systemContext?: string;
  metadata?: Record<string, unknown>;
}

export interface GovernedPromptResult {
  sanitizedPrompt: string;
  sanitizedSystemContext?: string;
  injectionDetected: boolean;
}

@Injectable()
export class AiPromptGovernanceService {
  constructor(private readonly boundary: IntelligenceBoundaryService) {}

  govern(input: GovernedPromptInput): GovernedPromptResult {
    this.boundary.assertPromptGovernanceNotPolicyAuthority();
    const sanitizedPrompt = this.boundary.sanitizePromptInjection(input.prompt);
    const sanitizedSystemContext = input.systemContext
      ? this.boundary.sanitizePromptInjection(input.systemContext)
      : undefined;
    const injectionDetected = sanitizedPrompt !== input.prompt;
    return {
      sanitizedPrompt,
      sanitizedSystemContext,
      injectionDetected,
    };
  }

  assertPromptSafe(original: string, sanitized: string): void {
    this.boundary.assertPromptInjectionTreatedAsData(original, sanitized);
  }
}

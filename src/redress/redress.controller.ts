import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { AutomationChallengeService } from './automation/automation-challenge.service';
import { ClarificationService } from './clarification/clarification.service';
import { AdministrativeCorrectionService } from './correction/administrative-correction.service';

@Controller('redress')
export class RedressController {
  constructor(
    private readonly administrativeCorrectionService: AdministrativeCorrectionService,
    private readonly clarificationService: ClarificationService,
    private readonly automationChallengeService: AutomationChallengeService,
  ) {}

  @Post('administrative-corrections')
  requestAdministrativeCorrection(@Body() body: Record<string, unknown>) {
    return this.administrativeCorrectionService.requestCorrection(body as never);
  }

  @Post('administrative-corrections/:id/approve')
  approveAdministrativeCorrection(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.administrativeCorrectionService.approveCorrection({
      matterId: id,
      ...(body as object),
    } as never);
  }

  @Post('administrative-corrections/:id/implement')
  implementAdministrativeCorrection(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.administrativeCorrectionService.implementCorrection({
      matterId: id,
      ...(body as object),
    } as never);
  }

  @Get('administrative-corrections/:id')
  getAdministrativeCorrection(@Param('id') id: string) {
    return this.administrativeCorrectionService.getMatterWithHistory(id);
  }

  @Post('clarifications')
  fileClarification(@Body() body: Record<string, unknown>) {
    return this.clarificationService.fileRequest(body as never);
  }

  @Post('clarifications/:id/respond')
  respondToClarification(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.clarificationService.respond({
      clarificationRequestId: id,
      ...(body as object),
    } as never);
  }

  @Get('clarifications/:id')
  getClarification(@Param('id') id: string) {
    return this.clarificationService.findById(id);
  }

  @Post('automation-challenges')
  fileAutomationChallenge(@Body() body: Record<string, unknown>) {
    return this.automationChallengeService.fileChallenge(body as never);
  }

  @Post('automation-challenges/:id/explanation')
  attachExplanation(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.automationChallengeService.attachExplanation(id, body as never);
  }

  @Get('automation-challenges/:id/explanation')
  getAutomationExplanation(@Param('id') id: string) {
    return this.automationChallengeService.getPublicExplanation(id);
  }

  @Post('automation-challenges/:id/dispose')
  disposeAutomationChallenge(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.automationChallengeService.disposeChallenge({
      challengeId: id,
      ...(body as object),
    } as never);
  }
}

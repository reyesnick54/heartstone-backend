import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { RedressBoundaryService } from './common/redress-boundary.service';
import { RedressDecisionService } from './decisions/redress-decision.service';
import { RedressImplementationService } from './implementation/redress-implementation.service';
import { InterimReliefService } from './interim-relief/interim-relief.service';
import { RedressMatterService } from './matters/redress-matter.service';
import { RedressNoticeService } from './notices/redress-notice.service';
import { PHASE_10G_BOUNDARY_DISCLAIMER } from './redress.constants';

@Controller('redress')
export class RedressController {
  constructor(
    private readonly boundary: RedressBoundaryService,
    private readonly matters: RedressMatterService,
    private readonly decisions: RedressDecisionService,
    private readonly interimRelief: InterimReliefService,
    private readonly implementation: RedressImplementationService,
    private readonly notices: RedressNoticeService,
  ) {}

  @Get('boundary')
  getBoundaryDisclaimer(): { disclaimer: string } {
    return { disclaimer: PHASE_10G_BOUNDARY_DISCLAIMER };
  }

  @Post('matters')
  fileMatter(@Body() body: Parameters<RedressMatterService['fileMatter']>[0]) {
    return this.matters.fileMatter(body);
  }

  @Get('matters/:id')
  getMatter(@Param('id') id: string) {
    return this.matters.findById(id);
  }

  @Post('decisions')
  recordDecision(@Body() body: Parameters<RedressDecisionService['recordDecision']>[0]) {
    this.boundary.rejectClientProtectedFields(body as unknown as Record<string, unknown>);
    return this.decisions.recordDecision(body);
  }

  @Post('interim-relief/requests')
  requestInterimRelief(@Body() body: Parameters<InterimReliefService['requestInterimRelief']>[0]) {
    return this.interimRelief.requestInterimRelief(body);
  }

  @Post('interim-relief/decisions')
  decideInterimRelief(@Body() body: Parameters<InterimReliefService['decideInterimRelief']>[0]) {
    return this.interimRelief.decideInterimRelief(body);
  }

  @Get('decisions/:id/implementation-status')
  async getImplementationStatus(@Param('id') id: string) {
    const status = await this.implementation.getImplementationStatus(id);
    const implemented = await this.implementation.isRemedyFullyImplemented(id);
    return { status, implemented };
  }

  @Post('notices/prepare')
  prepareNotice(@Body() body: Parameters<RedressNoticeService['prepareNotice']>[0]) {
    return this.notices.prepareNotice(body);
  }
}

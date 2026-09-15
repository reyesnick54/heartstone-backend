import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { SupportCoverageService } from './support-coverage.service';

@Controller('production-readiness/support')
export class SupportController {
  constructor(private readonly supportCoverageService: SupportCoverageService) {}

  @Post('coverage-plans')
  createPlan(@Body() body: Parameters<SupportCoverageService['createPlan']>[0]) {
    return this.supportCoverageService.createPlan(body);
  }

  @Post('coverage-plans/:id/activate')
  activatePlan(@Param('id') id: string) {
    return this.supportCoverageService.activatePlan(id);
  }

  @Post('assignments')
  assignSupport(@Body() body: Parameters<SupportCoverageService['assignSupport']>[0]) {
    return this.supportCoverageService.assignSupport(body);
  }

  @Post('on-call')
  assignOnCall(@Body() body: Parameters<SupportCoverageService['assignOnCall']>[0]) {
    return this.supportCoverageService.assignOnCall(body);
  }

  @Post('succession')
  assignSuccession(@Body() body: Parameters<SupportCoverageService['assignSuccession']>[0]) {
    return this.supportCoverageService.assignSuccession(body);
  }

  @Get('coverage-plans/:id/contacts')
  getContacts(
    @Param('id') id: string,
    @Query('includeRestricted') includeRestricted?: string,
  ) {
    return this.supportCoverageService.getPlanContacts(id, includeRestricted === 'true');
  }

  @Get('coverage-plans/:id/gap')
  detectGap(@Param('id') id: string) {
    return this.supportCoverageService.detectCoverageGap(id).then((gap) => ({ coverageGap: gap }));
  }
}

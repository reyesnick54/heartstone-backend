import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApplicantFactsDto } from './dto/applicant-facts.dto';
import { EligibilityCheckRequestDto } from './dto/eligibility-check-request.dto';
import { EligibilityCheckService } from './eligibility-check.service';
import { EligibilityRulesService } from './eligibility-rules.service';
import { ServiceMatcherService } from './service-matcher.service';

@ApiTags('service-catalog-eligibility')
@Controller('service-catalog')
export class EligibilityController {
  constructor(
    private readonly eligibilityCheck: EligibilityCheckService,
    private readonly eligibilityRules: EligibilityRulesService,
    private readonly serviceMatcher: ServiceMatcherService,
  ) {}

  @Post('services/:id/eligibility/check')
  @ApiOperation({
    summary: 'Check preliminary eligibility guidance for a service (nonbinding, no persistence)',
  })
  @ApiOkResponse({ description: 'Preliminary eligibility guidance result' })
  checkEligibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EligibilityCheckRequestDto,
  ) {
    return this.eligibilityCheck.check(id, dto.facts ?? {}, dto.versionId);
  }

  @Get('services/:id/eligibility-rules')
  @ApiOperation({
    summary: 'List active eligibility rules for the current published service version',
  })
  @ApiOkResponse({ description: 'Published eligibility rules (public read)' })
  getEligibilityRules(@Param('id', ParseUUIDPipe) id: string) {
    return this.eligibilityRules.findByService(id);
  }

  @Post('match')
  @ApiOperation({
    summary: 'Suggest relevant services based on applicant attributes (navigation assistance only)',
  })
  @ApiOkResponse({ description: 'Service matching guidance' })
  matchServices(@Body() facts: ApplicantFactsDto) {
    return this.serviceMatcher.match(facts);
  }
}

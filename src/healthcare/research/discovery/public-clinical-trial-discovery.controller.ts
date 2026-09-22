import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClinicalTrialRecruitmentStatus } from '@prisma/client';

import { Public } from '../../../security/decorators/public.decorator';
import { ClinicalTrialDiscoveryService } from './clinical-trial-discovery.service';

@ApiTags('public-clinical-trials')
@Controller('public/clinical-trials')
export class PublicClinicalTrialDiscoveryController {
  constructor(private readonly discoveryService: ClinicalTrialDiscoveryService) {}

  @Public()
  @Get('discover')
  @ApiOperation({
    summary: 'Discover recruiting clinical trials without participant-identifying data',
  })
  @ApiOkResponse({ description: 'Public trial discovery listing' })
  discover(
    @Query('conditionCategoryCode') conditionCategoryCode?: string,
    @Query('recruitmentStatus') recruitmentStatus?: ClinicalTrialRecruitmentStatus,
    @Query('phaseCode') phaseCode?: string,
    @Query('jurisdictionId') jurisdictionId?: string,
    @Query('minimumAgeYears') minimumAgeYears?: string,
    @Query('maximumAgeYears') maximumAgeYears?: string,
    @Query('locationContains') locationContains?: string,
    @Query('sponsorDisplayNameContains') sponsorDisplayNameContains?: string,
  ) {
    return this.discoveryService.discoverRecruitingTrials({
      conditionCategoryCode,
      recruitmentStatus,
      phaseCode,
      jurisdictionId,
      minimumAgeYears: minimumAgeYears ? Number(minimumAgeYears) : undefined,
      maximumAgeYears: maximumAgeYears ? Number(maximumAgeYears) : undefined,
      locationContains,
      sponsorDisplayNameContains,
    });
  }
}

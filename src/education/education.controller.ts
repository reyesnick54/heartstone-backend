import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { EDUCATION_BOUNDARY_DISCLAIMER, EDUCATION_RULE_ENVIRONMENT } from './education.constants';

@ApiTags('education')
@Controller('education')
export class EducationController {
  @Get('boundary')
  @ApiOperation({ summary: 'Education domain boundary markers (NON_PRODUCTION templates)' })
  getBoundary() {
    return {
      ruleEnvironment: EDUCATION_RULE_ENVIRONMENT,
      disclaimer: EDUCATION_BOUNDARY_DISCLAIMER,
    };
  }
}

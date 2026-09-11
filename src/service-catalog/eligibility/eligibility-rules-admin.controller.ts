import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type Request } from 'express';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { CreateEligibilityRuleDto } from './dto/create-eligibility-rule.dto';
import { UpdateEligibilityRuleDto } from './dto/update-eligibility-rule.dto';
import { EligibilityRulesService } from './eligibility-rules.service';
import { ServiceCatalogAdminGuard } from './guards/service-catalog-admin.guard';

@ApiTags('service-catalog-eligibility-admin')
@ApiBearerAuth()
@UseGuards(ServiceCatalogAdminGuard)
@Controller('service-catalog')
export class EligibilityRulesAdminController {
  constructor(private readonly eligibilityRules: EligibilityRulesService) {}

  @Post('services/:serviceId/versions/:versionId/eligibility-rules')
  @ApiOperation({ summary: 'Create an eligibility rule (authorized admin only)' })
  @ApiCreatedResponse({ description: 'Created eligibility rule' })
  createRule(
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: CreateEligibilityRuleDto,
    @CurrentSession() session: SessionContextDto,
    @Req() req: Request,
  ) {
    return this.eligibilityRules.create(serviceId, versionId, dto, {
      actorIdentityId: session.identityId,
      ipAddress: req.ip,
    });
  }

  @Patch('eligibility-rules/:ruleId')
  @ApiOperation({ summary: 'Update an eligibility rule (authorized admin only)' })
  @ApiOkResponse({ description: 'Updated eligibility rule' })
  updateRule(
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() dto: UpdateEligibilityRuleDto,
    @CurrentSession() session: SessionContextDto,
    @Req() req: Request,
  ) {
    return this.eligibilityRules.update(ruleId, dto, {
      actorIdentityId: session.identityId,
      ipAddress: req.ip,
    });
  }
}

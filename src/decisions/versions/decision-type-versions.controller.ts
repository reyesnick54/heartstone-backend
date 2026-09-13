import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { DecisionTypeLifecycleService } from '../lifecycle/decision-type-lifecycle.service';
import { TransitionDecisionTypeVersionDto } from '../lifecycle/dto/transition-decision-type-version.dto';
import { DecisionTypeVersionsService } from './decision-type-versions.service';
import { CreateDecisionTypeVersionDto } from './dto/create-decision-type-version.dto';
import { DecisionTypeVersionResponseDto } from './dto/decision-type-version-response.dto';

@ApiTags('decision-catalog')
@Controller('decisions')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class DecisionTypeVersionsController {
  constructor(
    private readonly versionsService: DecisionTypeVersionsService,
    private readonly lifecycleService: DecisionTypeLifecycleService,
  ) {}

  @Post('types/:id/versions')
  @ApiOperation({
    summary: 'Create a versioned decision type configuration',
    description:
      'Creates an immutable version record when later activated. Does not decide a case.',
  })
  @ApiCreatedResponse({ type: DecisionTypeVersionResponseDto })
  createVersion(
    @Param('id', ParseUUIDPipe) decisionTypeDefinitionId: string,
    @Body() dto: CreateDecisionTypeVersionDto,
  ): Promise<DecisionTypeVersionResponseDto> {
    return this.versionsService.createForDefinition(decisionTypeDefinitionId, dto);
  }

  @Get('types/:id/versions')
  @ApiOperation({ summary: 'List historical versions for a decision type definition' })
  @ApiOkResponse({ type: DecisionTypeVersionResponseDto, isArray: true })
  findAllForDefinition(
    @Param('id', ParseUUIDPipe) decisionTypeDefinitionId: string,
  ): Promise<DecisionTypeVersionResponseDto[]> {
    return this.versionsService.findAllForDefinition(decisionTypeDefinitionId);
  }

  @Get('type-versions/:id')
  @ApiOperation({ summary: 'Retrieve a decision type version with historical configuration' })
  @ApiOkResponse({ type: DecisionTypeVersionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DecisionTypeVersionResponseDto> {
    return this.versionsService.findOne(id);
  }

  @Post('type-versions/:id/transitions')
  @ApiOperation({
    summary: 'Advance decision type version lifecycle through controlled pathway',
  })
  @ApiOkResponse({ type: DecisionTypeVersionResponseDto })
  async transition(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionDecisionTypeVersionDto,
  ): Promise<DecisionTypeVersionResponseDto> {
    await this.lifecycleService.transition(
      id,
      dto.targetStatus,
      { identityId: session.identityId },
      dto.reason,
    );

    return this.versionsService.findOne(id);
  }
}

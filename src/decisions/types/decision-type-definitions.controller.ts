import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { DecisionTypeDefinitionsService } from './decision-type-definitions.service';
import { CreateDecisionTypeDto } from './dto/create-decision-type.dto';
import { DecisionTypeResponseDto } from './dto/decision-type-response.dto';

@ApiTags('decision-catalog')
@Controller('decisions/types')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class DecisionTypeDefinitionsController {
  constructor(private readonly decisionTypesService: DecisionTypeDefinitionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a decision type definition',
    description:
      'Configures an institutional decision route. Does not create a final government decision.',
  })
  @ApiCreatedResponse({ type: DecisionTypeResponseDto })
  create(@Body() dto: CreateDecisionTypeDto): Promise<DecisionTypeResponseDto> {
    return this.decisionTypesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List decision type definitions' })
  @ApiOkResponse({ type: DecisionTypeResponseDto, isArray: true })
  findAll(): Promise<DecisionTypeResponseDto[]> {
    return this.decisionTypesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get decision type definition by id' })
  @ApiOkResponse({ type: DecisionTypeResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<DecisionTypeResponseDto> {
    return this.decisionTypesService.findOne(id);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DelegationService } from './delegation.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { DelegationQueryDto } from './dto/delegation-query.dto';
import { DelegationResponseDto } from './dto/delegation-response.dto';
import { UpdateDelegationDto } from './dto/update-delegation.dto';

@ApiTags('delegations')
@Controller('delegations')
export class DelegationController {
  constructor(private readonly delegationService: DelegationService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a structural delegation record',
    description:
      'Records an explicit bounded delegation relationship. Does not confer legal authority.',
  })
  @ApiCreatedResponse({ type: DelegationResponseDto })
  create(@Body() dto: CreateDelegationDto): Promise<DelegationResponseDto> {
    return this.delegationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List delegation records with optional filters' })
  @ApiOkResponse({ type: DelegationResponseDto, isArray: true })
  findAll(@Query() query: DelegationQueryDto): Promise<DelegationResponseDto[]> {
    return this.delegationService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a delegation record by id' })
  @ApiOkResponse({ type: DelegationResponseDto })
  findOne(@Param('id') id: string): Promise<DelegationResponseDto> {
    return this.delegationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a delegation record',
    description:
      'Updates structural fields and status. Historical records are preserved; no deletion.',
  })
  @ApiOkResponse({ type: DelegationResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDelegationDto,
  ): Promise<DelegationResponseDto> {
    return this.delegationService.update(id, dto);
  }
}

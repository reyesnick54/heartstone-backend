import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateGovernmentBodyDto } from './dto/create-government-body.dto';
import { GovernmentBodyResponseDto } from './dto/government-body-response.dto';
import { ListGovernmentBodiesQueryDto } from './dto/list-government-bodies-query.dto';
import { UpdateGovernmentBodyDto } from './dto/update-government-body.dto';
import { GovernmentBodyService } from './government-body.service';

@ApiTags('government-bodies')
@Controller('government-bodies')
export class GovernmentBodyController {
  constructor(private readonly governmentBodyService: GovernmentBodyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a government body' })
  @ApiCreatedResponse({ type: GovernmentBodyResponseDto })
  create(@Body() dto: CreateGovernmentBodyDto): Promise<GovernmentBodyResponseDto> {
    return this.governmentBodyService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List government bodies' })
  @ApiOkResponse({ type: GovernmentBodyResponseDto, isArray: true })
  findAll(@Query() query: ListGovernmentBodiesQueryDto): Promise<GovernmentBodyResponseDto[]> {
    return this.governmentBodyService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a government body by id' })
  @ApiOkResponse({ type: GovernmentBodyResponseDto })
  findById(@Param('id') id: string): Promise<GovernmentBodyResponseDto> {
    return this.governmentBodyService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a government body' })
  @ApiOkResponse({ type: GovernmentBodyResponseDto })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGovernmentBodyDto,
  ): Promise<GovernmentBodyResponseDto> {
    return this.governmentBodyService.update(id, dto);
  }
}

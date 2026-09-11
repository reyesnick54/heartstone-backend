import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateIdentityDto } from './dto/create-identity.dto';
import { IdentityResponseDto } from './dto/identity-response.dto';
import { QueryIdentitiesDto } from './dto/query-identities.dto';
import { UpdateIdentityDto } from './dto/update-identity.dto';
import { IdentitiesService } from './identities.service';

@ApiTags('identity-identities')
@Controller('identity/identities')
export class IdentitiesController {
  constructor(private readonly identitiesService: IdentitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an identity' })
  @ApiCreatedResponse({ type: IdentityResponseDto })
  create(@Body() dto: CreateIdentityDto): Promise<IdentityResponseDto> {
    return this.identitiesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List identities' })
  @ApiOkResponse({ type: IdentityResponseDto, isArray: true })
  findAll(@Query() query: QueryIdentitiesDto): Promise<IdentityResponseDto[]> {
    return this.identitiesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an identity by id' })
  @ApiOkResponse({ type: IdentityResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IdentityResponseDto> {
    return this.identitiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update identity metadata' })
  @ApiOkResponse({ type: IdentityResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateIdentityDto,
  ): Promise<IdentityResponseDto> {
    return this.identitiesService.update(id, dto);
  }
}

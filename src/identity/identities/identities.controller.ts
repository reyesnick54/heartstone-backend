import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateIdentityDto } from './dto/create-identity.dto';
import { IdentityResponseDto } from './dto/identity-response.dto';
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

  @Get(':id')
  @ApiOperation({ summary: 'Get an identity by id' })
  @ApiOkResponse({ type: IdentityResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<IdentityResponseDto> {
    return this.identitiesService.findOne(id);
  }
}

import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CredentialResponseDto } from './dto/credential-response.dto';
import { QueryCredentialsDto } from './dto/query-credentials.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';

@ApiTags('identity-credentials')
@Controller('identity/credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a credential for an identity' })
  @ApiCreatedResponse({ type: CredentialResponseDto })
  create(@Body() dto: CreateCredentialDto): Promise<CredentialResponseDto> {
    return this.credentialsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List credentials' })
  @ApiOkResponse({ type: CredentialResponseDto, isArray: true })
  findAll(@Query() query: QueryCredentialsDto): Promise<CredentialResponseDto[]> {
    return this.credentialsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get credential metadata by id' })
  @ApiOkResponse({ type: CredentialResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CredentialResponseDto> {
    return this.credentialsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update credential metadata' })
  @ApiOkResponse({ type: CredentialResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCredentialDto,
  ): Promise<CredentialResponseDto> {
    return this.credentialsService.update(id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a credential' })
  @ApiOkResponse({ type: CredentialResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<CredentialResponseDto> {
    return this.credentialsService.activate(id);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend a credential (deactivate without revoking)' })
  @ApiOkResponse({ type: CredentialResponseDto })
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<CredentialResponseDto> {
    return this.credentialsService.suspend(id);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke a credential' })
  @ApiOkResponse({ type: CredentialResponseDto })
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<CredentialResponseDto> {
    return this.credentialsService.revoke(id);
  }
}

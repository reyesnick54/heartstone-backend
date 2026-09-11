import { Body, Controller, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CredentialsService } from './credentials.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { CredentialResponseDto } from './dto/credential-response.dto';

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

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke a credential' })
  @ApiOkResponse({ type: CredentialResponseDto })
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<CredentialResponseDto> {
    return this.credentialsService.revoke(id);
  }
}

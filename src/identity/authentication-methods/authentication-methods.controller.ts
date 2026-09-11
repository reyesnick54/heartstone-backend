import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthenticationMethodsService } from './authentication-methods.service';
import { AuthenticationMethodResponseDto } from './dto/authentication-method-response.dto';
import { CreateAuthenticationMethodDto } from './dto/create-authentication-method.dto';

@ApiTags('identity-authentication-methods')
@Controller('identity/authentication-methods')
export class AuthenticationMethodsController {
  constructor(private readonly authenticationMethodsService: AuthenticationMethodsService) {}

  @Post()
  @ApiOperation({ summary: 'Configure an authentication method for an identity' })
  @ApiCreatedResponse({ type: AuthenticationMethodResponseDto })
  create(@Body() dto: CreateAuthenticationMethodDto): Promise<AuthenticationMethodResponseDto> {
    return this.authenticationMethodsService.create(dto);
  }
}

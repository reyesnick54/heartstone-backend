import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { CurrentPrincipal } from './current-principal.decorator';
import { ServiceLoginDto, UserLoginDto } from './dto/login.dto';
import { LoginResponseDto, PrincipalResponseDto } from './dto/principal-response.dto';
import { AuthenticatedPrincipal } from './principal.types';

@ApiTags('identity-auth')
@Controller('identity/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate a user account' })
  @ApiOkResponse({ type: LoginResponseDto })
  async loginUser(@Body() dto: UserLoginDto): Promise<LoginResponseDto> {
    const result = await this.authService.loginUser({
      username: dto.username,
      password: dto.password,
      source: 'api',
    });

    return {
      token: result.token,
      principal: PrincipalResponseDto.fromPrincipal(result.principal),
    };
  }

  @Post('service-login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Authenticate a service identity' })
  @ApiOkResponse({ type: LoginResponseDto })
  async loginService(@Body() dto: ServiceLoginDto): Promise<LoginResponseDto> {
    const result = await this.authService.loginService({
      code: dto.code,
      apiKey: dto.apiKey,
      source: 'api',
    });

    return {
      token: result.token,
      principal: PrincipalResponseDto.fromPrincipal(result.principal),
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get the authenticated principal context' })
  @ApiOkResponse({ type: PrincipalResponseDto })
  getCurrentPrincipal(@CurrentPrincipal() principal: AuthenticatedPrincipal): PrincipalResponseDto {
    return PrincipalResponseDto.fromPrincipal(principal);
  }
}

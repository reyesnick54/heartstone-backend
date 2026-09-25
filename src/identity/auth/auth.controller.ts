import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type Request } from 'express';

import { Public } from '../../security/decorators/public.decorator';
import { AuthService } from './auth.service';
import { CurrentSession } from './decorators/current-session.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { OidcLoginDto } from './dto/oidc-login.dto';
import { ServiceLoginDto } from './dto/service-login.dto';
import { SessionContextDto } from './dto/session-context.dto';
import { ClientIdentitySubstitutionGuard } from './guards/client-identity-substitution.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';

@ApiTags('identity-auth')
@Controller('identity/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Authenticate with password and create a session' })
  @ApiCreatedResponse({ type: LoginResponseDto })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<LoginResponseDto> {
    return this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('login/oidc')
  @ApiOperation({ summary: 'Authenticate with a verified OIDC access token' })
  @ApiCreatedResponse({ type: LoginResponseDto })
  loginWithOidc(@Body() dto: OidcLoginDto, @Req() req: Request): Promise<LoginResponseDto> {
    return this.authService.loginWithOidc(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Public()
  @Post('login/service')
  @ApiOperation({ summary: 'Authenticate a service identity with API key credentials' })
  @ApiCreatedResponse({ type: LoginResponseDto })
  loginWithService(
    @Body() dto: ServiceLoginDto,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    return this.authService.loginWithServiceCredentials(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('logout')
  @UseGuards(SessionAuthGuard, ClientIdentitySubstitutionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current session' })
  @ApiOkResponse({ description: 'Session revoked' })
  async logout(@CurrentSession() session: SessionContextDto): Promise<{ revoked: boolean }> {
    await this.authService.logout(session);
    return { revoked: true };
  }

  @Post('logout-all')
  @UseGuards(SessionAuthGuard, ClientIdentitySubstitutionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke all sessions for the current user account' })
  @ApiOkResponse({ description: 'Sessions revoked' })
  async logoutAll(
    @CurrentSession() session: SessionContextDto,
  ): Promise<{ revokedCount: number }> {
    const revokedCount = await this.authService.logoutAllSessions(session);
    return { revokedCount };
  }
}

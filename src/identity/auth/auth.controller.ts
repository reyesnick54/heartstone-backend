import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type Request } from 'express';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { Public } from '../../security/decorators/public.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { AuthService } from './auth.service';
import { CurrentSession } from './decorators/current-session.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SessionContextDto } from './dto/session-context.dto';
import { ClientIdentitySubstitutionGuard } from './guards/client-identity-substitution.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';

@ApiTags('identity-auth')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Identity administration or authenticated self-service session",
  authorityRequirement: "No government authority inferred from identity alone",
  actorSource: "Session identity or institutional administrator",
  primarySecurityInvariant: "User != Officeholder != Role != Permission != Authority",
})
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

  @Post('logout')
  @UseGuards(SessionAuthGuard, ClientIdentitySubstitutionGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current session' })
  @ApiOkResponse({ description: 'Session revoked' })
  async logout(@CurrentSession() session: SessionContextDto): Promise<{ revoked: boolean }> {
    await this.authService.logout(session);
    return { revoked: true };
  }
}

import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type Request } from 'express';

import { AuthService } from './auth.service';
import { CurrentSession } from './decorators/current-session.decorator';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SessionContextDto } from './dto/session-context.dto';
import { SessionAuthGuard } from './guards/session-auth.guard';

@ApiTags('identity-auth')
@Controller('identity/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  @UseGuards(SessionAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current session' })
  @ApiOkResponse({ description: 'Session revoked' })
  async logout(@CurrentSession() session: SessionContextDto): Promise<{ revoked: boolean }> {
    await this.authService.logout(session);
    return { revoked: true };
  }
}

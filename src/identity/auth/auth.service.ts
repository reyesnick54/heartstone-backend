import { Injectable } from '@nestjs/common';

import { SessionsService } from '../sessions/sessions.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { SessionContextDto } from './dto/session-context.dto';

@Injectable()
export class AuthService {
  constructor(private readonly sessionsService: SessionsService) {}

  async login(
    dto: LoginDto,
    context?: { ipAddress?: string; userAgent?: string },
  ): Promise<LoginResponseDto> {
    const { session, sessionToken } = await this.sessionsService.authenticateWithPassword(
      dto.loginIdentifier,
      dto.password,
      context,
    );

    return {
      sessionToken,
      sessionId: session.id,
      identityId: session.identityId,
      expiresAt: session.expiresAt,
      assuranceLevel: session.assuranceLevel,
    };
  }

  async logout(session: SessionContextDto): Promise<void> {
    await this.sessionsService.revokeSession(session.sessionId, session.identityId);
  }
}

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';

import { SecurityAuditService } from '../audit/security-audit.service';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import { SessionContextDto } from '../auth/dto/session-context.dto';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { AuthorityBoundaryService } from '../common/authority-boundary.service';

export class ProtectedProfileResponseDto {
  @ApiProperty()
  identityId!: string;

  @ApiProperty()
  sessionId!: string;

  @ApiProperty()
  assuranceLevel!: string;

  @ApiProperty({ example: false })
  hasGovernmentAuthority!: false;

  @ApiProperty()
  governmentAuthorityNote!: string;
}

@ApiTags('identity-protected')
@Controller('identity/me')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class ProtectedController {
  constructor(
    private readonly authorityBoundary: AuthorityBoundaryService,
    private readonly audit: SecurityAuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Access protected identity profile (technical access only)' })
  @ApiOkResponse({ type: ProtectedProfileResponseDto })
  async getProfile(
    @CurrentSession() session: SessionContextDto,
  ): Promise<ProtectedProfileResponseDto> {
    const authority = this.authorityBoundary.resolveGovernmentAuthority({
      identityId: session.identityId,
      userAccountId: session.userAccountId ?? undefined,
      assuranceLevel: session.assuranceLevel,
    });

    await this.audit.record({
      eventType: 'PROTECTED_ENDPOINT_ACCESS',
      identityId: session.identityId,
      userAccountId: session.userAccountId ?? undefined,
      sessionId: session.sessionId,
    });

    return {
      identityId: session.identityId,
      sessionId: session.sessionId,
      assuranceLevel: session.assuranceLevel,
      hasGovernmentAuthority: false,
      governmentAuthorityNote:
        authority === null
          ? 'Government authority is not evaluated in Phase 3'
          : 'Unexpected authority resolution',
    };
  }
}

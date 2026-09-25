import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';

import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { SecurityAuditService } from '../audit/security-audit.service';
import { type ActorContext } from '../auth/context/actor-context.types';
import { CurrentActor } from '../auth/decorators/current-actor.decorator';
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

  @ApiProperty({ example: false })
  hasInstitutionalRelationships!: boolean;
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
  @RequirePermissions(PermissionCodes.IDENTITY_SELF_READ)
  @ApiOperation({ summary: 'Access protected identity profile (technical access only)' })
  @ApiOkResponse({ type: ProtectedProfileResponseDto })
  async getProfile(
    @CurrentSession() session: SessionContextDto,
    @CurrentActor() actor: ActorContext,
  ): Promise<ProtectedProfileResponseDto> {
    this.authorityBoundary.assertNoGovernmentAuthorityFromAuthenticationOnly({
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
        'Authentication establishes identity only; government authority requires function-level evaluation.',
      hasInstitutionalRelationships: actor.hasInstitutionalRelationships,
    };
  }
}

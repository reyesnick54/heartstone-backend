import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
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
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Identity administration or authenticated self-service session",
  authorityRequirement: "No government authority inferred from identity alone",
  actorSource: "Session identity or institutional administrator",
  primarySecurityInvariant: "User != Officeholder != Role != Permission != Authority",
})
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

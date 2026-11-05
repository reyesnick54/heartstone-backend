import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { RequirePermissions } from '../../technical-access/authorization/require-permissions.decorator';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { type VerifiedExternalDependencyResult } from '../contracts/verified-external-dependency-result.contract';
import { AuthorityDependenciesService } from './authority-dependencies.service';
import { RecordInstitutionalActDto } from './dto/record-institutional-act.dto';
import { RegisterExternalDeterminationDto } from './dto/register-external-determination.dto';

@ApiTags('authority-dependencies')
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: 'Authority configuration or evaluated institutional action scope',
  authorityRequirement: 'Explicit function authority evaluation for consequential actions',
  actorSource: 'Session identity with officeholder linkage when evaluating authority',
  primarySecurityInvariant: 'Technical permission does not create legal authority',
})
@Controller('authority-dependencies')
@UseGuards(SessionAuthGuard)
export class AuthorityDependenciesController {
  constructor(private readonly service: AuthorityDependenciesService) {}

  @Post('external-determinations')
  @RequirePermissions(PermissionCodes.AUTHORITY_EXTERNAL_DETERMINATION_RECORD)
  @ApiOperation({ summary: 'Register a verified external dependency determination' })
  @ApiCreatedResponse({ description: 'External determination registered' })
  registerExternalDetermination(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: RegisterExternalDeterminationDto,
  ): Promise<VerifiedExternalDependencyResult> {
    return this.service.registerExternalDetermination(dto, {
      recordedByIdentityId: session.identityId,
      sessionId: session.sessionId,
    });
  }

  @Post('institutional-acts')
  @RequirePermissions(PermissionCodes.AUTHORITY_INSTITUTIONAL_ACT_RECORD)
  @ApiOperation({ summary: 'Record a separate institutional authority act' })
  recordInstitutionalAct(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: RecordInstitutionalActDto,
  ) {
    return this.service.recordInstitutionalAct(dto, {
      recordedByIdentityId: session.identityId,
      sessionId: session.sessionId,
    });
  }
}

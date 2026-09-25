import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';

import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { CurrentActor } from '../../identity/auth/decorators/current-actor.decorator';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { IntelligenceForbiddenClientFieldsInterceptor } from '../common/intelligence-forbidden-client-fields.interceptor';
import { IntelligenceInstitutionalScopeService } from '../common/intelligence-institutional-scope.service';
import { IntelligenceSuspendedAiGuard } from '../common/intelligence-suspended-ai.guard';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';
import { CreateStrategicProjectProfileDto } from '../dto/create-strategic-project-profile.dto';
import { DeriveProjectStatusProjectionDto } from '../dto/derive-project-status-projection.dto';
import { RecordStrategicProjectStageDto } from '../dto/record-strategic-project-stage.dto';
import { ProjectStatusProjectionService } from './project-status-projection.service';
import { StrategicProjectProfileService } from './strategic-project-profile.service';
import { StrategicProjectStageService } from './strategic-project-stage.service';

const STRATEGIC_PROJECT_GUARDS = [IntelligenceSuspendedAiGuard] as const;

@ApiTags('intelligence/strategic-projects')
@ApiBearerAuth()
@UseGuards(...STRATEGIC_PROJECT_GUARDS)
@UseInterceptors(IntelligenceForbiddenClientFieldsInterceptor)
@ControllerRouteAccess({
  routeClass: RouteClass.RESTRICTED_ADMINISTRATIVE,
  authenticationRequired: true,
  scopeRequirement: "Analytics, metrics, and command-console institutional scope",
  authorityRequirement: "Intelligence module access; analytics do not create authority",
  actorSource: "Authenticated institutional analyst or administrator",
  primarySecurityInvariant: "Analytics and AI outputs are advisory, not official decisions",
})
@Controller('intelligence/strategic-projects')
export class StrategicProjectController {
  constructor(
    private readonly profileService: StrategicProjectProfileService,
    private readonly stageService: StrategicProjectStageService,
    private readonly projectionService: ProjectStatusProjectionService,
    private readonly boundary: StrategicProjectBoundaryService,
    private readonly scopeService: IntelligenceInstitutionalScopeService,
  ) {}

  @Post()
  createProfile(
    @CurrentActor() actor: ActorContext,
    @Body() dto: CreateStrategicProjectProfileDto,
  ) {
    this.guardPayload(actor, dto as unknown as Record<string, unknown>);
    this.boundary.rejectClientProtectedProjectFields(dto as unknown as Record<string, unknown>);
    this.scopeService.assertInstitutionalTarget(actor, {
      institutionId: dto.sponsoringInstitutionId,
      departmentId: dto.responsibleDepartmentId,
      caseId: dto.caseId,
    });

    return this.profileService.createProfile({
      projectCode: dto.projectCode,
      title: dto.title,
      description: dto.description,
      sponsoringInstitutionId: dto.sponsoringInstitutionId,
      responsibleDepartmentId: dto.responsibleDepartmentId,
      caseId: dto.caseId,
      sectorCode: dto.sectorCode,
      attributionMetadata: dto.attributionMetadata as Prisma.InputJsonValue,
      externalFactorNotes: dto.externalFactorNotes,
      announcementDate: dto.announcementDate ? new Date(dto.announcementDate) : undefined,
    });
  }

  @Get(':profileId')
  async getProfile(
    @CurrentActor() actor: ActorContext,
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    const profile = await this.profileService.getProfile(profileId);
    this.scopeService.assertInstitutionalTarget(actor, {
      institutionId: profile.sponsoringInstitutionId,
      departmentId: profile.responsibleDepartmentId,
      caseId: profile.caseId,
    });
    return profile;
  }

  @Post(':profileId/stages')
  async recordStage(
    @CurrentActor() actor: ActorContext,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: RecordStrategicProjectStageDto,
  ) {
    this.guardPayload(actor, dto as unknown as Record<string, unknown>);
    this.boundary.rejectClientProtectedProjectFields(dto as unknown as Record<string, unknown>);
    const profile = await this.profileService.getProfile(profileId);
    this.scopeService.assertInstitutionalTarget(actor, {
      institutionId: profile.sponsoringInstitutionId,
      departmentId: profile.responsibleDepartmentId,
      caseId: profile.caseId,
    });

    return this.stageService.recordStage({
      profileId,
      stage: dto.stage,
      institutionalStateReference: dto.institutionalStateReference,
      effectiveFrom: new Date(dto.effectiveFrom),
      recordedByIdentityId: actor.identityId,
      sourceRecordType: dto.sourceRecordType,
      sourceRecordId: dto.sourceRecordId,
    });
  }

  @Post(':profileId/projections/derive')
  async deriveProjection(
    @CurrentActor() actor: ActorContext,
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Body() dto: DeriveProjectStatusProjectionDto,
  ) {
    this.guardPayload(actor, dto as unknown as Record<string, unknown>);
    this.boundary.rejectClientProtectedProjectFields(dto as unknown as Record<string, unknown>);
    const profile = await this.profileService.getProfile(profileId);
    this.scopeService.assertInstitutionalTarget(actor, {
      institutionId: profile.sponsoringInstitutionId,
      departmentId: profile.responsibleDepartmentId,
      caseId: profile.caseId,
    });

    return this.projectionService.deriveProjection({
      profileId,
      audience: dto.audience,
      evidenceCutoffAt: dto.evidenceCutoffAt ? new Date(dto.evidenceCutoffAt) : undefined,
      derivedByIdentityId: actor.identityId,
    });
  }

  private guardPayload(actor: ActorContext, payload: Record<string, unknown>): void {
    this.scopeService.rejectForgedActorIdentityFields(payload, actor);
    this.scopeService.rejectClientAuthorityIndicators(payload);
  }
}

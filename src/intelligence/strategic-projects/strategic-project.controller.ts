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

import { CurrentActor } from '../../identity/auth/decorators/current-actor.decorator';
import { type ActorContextDto } from '../../identity/auth/dto/actor-context.dto';
import { ActorContextGuard } from '../../identity/auth/guards/actor-context.guard';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { IntelligenceForbiddenClientFieldsInterceptor } from '../common/intelligence-forbidden-client-fields.interceptor';
import { IntelligenceInstitutionalScopeService } from '../common/intelligence-institutional-scope.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';
import { CreateStrategicProjectProfileDto } from '../dto/create-strategic-project-profile.dto';
import { DeriveProjectStatusProjectionDto } from '../dto/derive-project-status-projection.dto';
import { RecordStrategicProjectStageDto } from '../dto/record-strategic-project-stage.dto';
import { ProjectStatusProjectionService } from './project-status-projection.service';
import { StrategicProjectProfileService } from './strategic-project-profile.service';
import { StrategicProjectStageService } from './strategic-project-stage.service';

const STRATEGIC_PROJECT_GUARDS = [SessionAuthGuard, ActorContextGuard] as const;

@ApiTags('intelligence/strategic-projects')
@ApiBearerAuth()
@UseGuards(...STRATEGIC_PROJECT_GUARDS)
@UseInterceptors(IntelligenceForbiddenClientFieldsInterceptor)
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
    @CurrentActor() actor: ActorContextDto,
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
    @CurrentActor() actor: ActorContextDto,
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
    @CurrentActor() actor: ActorContextDto,
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
    @CurrentActor() actor: ActorContextDto,
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

  private guardPayload(actor: ActorContextDto, payload: Record<string, unknown>): void {
    this.scopeService.rejectForgedActorIdentityFields(payload, actor);
    this.scopeService.rejectClientAuthorityIndicators(payload);
  }
}

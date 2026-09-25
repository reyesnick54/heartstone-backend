import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type Response } from 'express';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { ActorContextService } from '../../security/services/actor-context.service';
import { ForbiddenDocumentFieldsInterceptor } from '../common/forbidden-document-fields.interceptor';
import { DocumentAccessService } from './document-access.service';
import { DocumentAssociationsService } from './document-associations.service';
import { DocumentRecordsService } from './document-records.service';
import { DocumentVersionsService } from './document-versions.service';
import { AssociateDocumentDto } from './dto/associate-document.dto';
import { CreateDocumentRecordDto } from './dto/create-document-record.dto';
import { UpdateClassificationDto } from './dto/update-classification.dto';
import { UploadDocumentVersionDto } from './dto/upload-document-version.dto';

@ApiTags('evidence-records-documents')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Evidence governance, document custody, or applicant document scope",
  authorityRequirement: "Document/evidence access guard or institutional evidence role",
  actorSource: "Session identity with applicant or official actor context",
  primarySecurityInvariant: "Evidence quality and verification cannot be client-asserted",
})
@Controller('documents')
@UseGuards(SessionAuthGuard)
@UseInterceptors(ForbiddenDocumentFieldsInterceptor)
@ApiBearerAuth()
export class DocumentsController {
  constructor(
    private readonly records: DocumentRecordsService,
    private readonly versions: DocumentVersionsService,
    private readonly associations: DocumentAssociationsService,
    private readonly access: DocumentAccessService,
    private readonly actorContext: ActorContextService,
  ) {}

  @Get('integrity-disclaimer')
  getIntegrityDisclaimer() {
    return { disclaimer: this.records.getIntegrityDisclaimer() };
  }

  @Post()
  createRecord(
    @CurrentSession() _session: SessionContextDto,
    @Body() dto: CreateDocumentRecordDto,
  ) {
    this.versions.rejectClientStorageFields(dto as unknown as Record<string, unknown>);
    return this.records.create(dto);
  }

  @Get(':id')
  async findRecord(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const actor = await this.actorContext.resolveFromIdentityId(session.identityId);
    await this.access.assertRecordMetadataAccess(id, {
      actorIdentityId: session.identityId,
      isOfficial: actor.hasActiveOfficeholderLink,
    });
    return this.records.findById(id);
  }

  @Post(':id/versions')
  uploadVersion(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) documentRecordId: string,
    @Body() dto: UploadDocumentVersionDto,
  ) {
    const content = Buffer.from(dto.contentBase64, 'base64');
    return this.versions.uploadVersion({
      documentRecordId,
      dto,
      content,
      actorIdentityId: session.identityId,
    });
  }

  @Get(':id/versions')
  async listVersions(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) documentRecordId: string,
  ) {
    const actor = await this.actorContext.resolveFromIdentityId(session.identityId);
    await this.access.assertRecordMetadataAccess(documentRecordId, {
      actorIdentityId: session.identityId,
      isOfficial: actor.hasActiveOfficeholderLink,
    });
    return this.versions.listVersions(documentRecordId);
  }

  @Get('versions/:versionId')
  async getVersion(
    @CurrentSession() session: SessionContextDto,
    @Param('versionId', ParseUUIDPipe) versionId: string,
  ) {
    const actor = await this.actorContext.resolveFromIdentityId(session.identityId);
    await this.access.assertVersionMetadataAccess(versionId, {
      actorIdentityId: session.identityId,
      isOfficial: actor.hasActiveOfficeholderLink,
    });
    return this.versions.getVersion(versionId);
  }

  @Patch('versions/:versionId/classification')
  updateClassification(
    @CurrentSession() session: SessionContextDto,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: UpdateClassificationDto,
  ) {
    return this.versions.updateClassification(versionId, dto, session.identityId);
  }

  @Get('versions/:versionId/download')
  @Header('Cache-Control', 'no-store')
  async downloadVersion(
    @CurrentSession() session: SessionContextDto,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Res({ passthrough: false }) res: Response,
  ): Promise<void> {
    const actor = await this.actorContext.resolveFromIdentityId(session.identityId);
    const result = await this.access.downloadVersion(versionId, {
      actorIdentityId: session.identityId,
      isOfficial: actor.hasActiveOfficeholderLink,
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename.replace(/"/g, '')}"`,
    );
    res.send(result.content);
  }

  @Get('versions/*path/download')
  rejectStorageKeyDownload(): never {
    throw new BadRequestException('Storage object keys cannot be used for download authorization');
  }

  @Post('associations')
  associate(@CurrentSession() session: SessionContextDto, @Body() dto: AssociateDocumentDto) {
    return this.associations.associate(dto, session.identityId);
  }

  @Get('associations')
  async listAssociations(
    @CurrentSession() session: SessionContextDto,
    @Query('targetType') targetType: string,
    @Query('targetId', ParseUUIDPipe) targetId: string,
  ) {
    const actor = await this.actorContext.resolveFromIdentityId(session.identityId);
    await this.access.assertAssociationTargetAccess(targetType, targetId, {
      actorIdentityId: session.identityId,
      isOfficial: actor.hasActiveOfficeholderLink,
    });
    return this.associations.listByTarget(targetType, targetId);
  }
}

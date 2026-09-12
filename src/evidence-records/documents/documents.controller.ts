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
  findRecord(@Param('id', ParseUUIDPipe) id: string) {
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
  listVersions(@Param('id', ParseUUIDPipe) documentRecordId: string) {
    return this.versions.listVersions(documentRecordId);
  }

  @Get('versions/:versionId')
  getVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
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
    @Query('official') official?: string,
  ): Promise<void> {
    const result = await this.access.downloadVersion(versionId, {
      actorIdentityId: session.identityId,
      isOfficial: official === 'true',
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
    throw new BadRequestException(
      'Storage object keys cannot be used for download authorization',
    );
  }

  @Post('associations')
  associate(@CurrentSession() session: SessionContextDto, @Body() dto: AssociateDocumentDto) {
    return this.associations.associate(dto, session.identityId);
  }

  @Get('associations')
  listAssociations(
    @Query('targetType') targetType: string,
    @Query('targetId', ParseUUIDPipe) targetId: string,
  ) {
    return this.associations.listByTarget(targetType, targetId);
  }
}

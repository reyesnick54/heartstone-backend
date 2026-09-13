import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { AddPacketItemDto } from './dto/add-packet-item.dto';
import { AssemblePacketDto } from './dto/assemble-packet.dto';
import { CreateEvidencePacketDto } from './dto/create-evidence-packet.dto';
import { ExcludePacketItemDto } from './dto/exclude-packet-item.dto';
import { FreezePacketDto } from './dto/freeze-packet.dto';
import { EvidencePacketsService } from './evidence-packets.service';

@ApiTags('evidence-packets')
@Controller('evidence/packets')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class EvidencePacketsController {
  constructor(private readonly packetsService: EvidencePacketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new evidence packet with initial draft version' })
  @ApiCreatedResponse()
  create(
    @CurrentSession() session: SessionContextDto,
    @Body() dto: CreateEvidencePacketDto,
  ) {
    return this.packetsService.createPacket(session.identityId, dto);
  }

  @Get(':packetId')
  @ApiOperation({ summary: 'Fetch evidence packet with version history' })
  @ApiOkResponse()
  get(@Param('packetId', ParseUUIDPipe) packetId: string) {
    return this.packetsService.getPacket(packetId);
  }

  @Get('versions/:versionId')
  @ApiOperation({ summary: 'Retrieve a historical evidence packet version' })
  getVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return this.packetsService.getPacketVersion(versionId);
  }

  @Post(':packetId/items')
  @ApiOperation({ summary: 'Add item to draft packet version' })
  addItem(@Param('packetId', ParseUUIDPipe) packetId: string, @Body() dto: AddPacketItemDto) {
    return this.packetsService.addItem(packetId, dto);
  }

  @Delete(':packetId/items/:itemId')
  @ApiOperation({ summary: 'Remove item from draft packet version' })
  removeItem(
    @Param('packetId', ParseUUIDPipe) packetId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.packetsService.removeItem(packetId, itemId);
  }

  @Post(':packetId/exclusions')
  @ApiOperation({ summary: 'Record controlled exclusion with reason and authorization' })
  excludeItem(
    @CurrentSession() session: SessionContextDto,
    @Param('packetId', ParseUUIDPipe) packetId: string,
    @Body() dto: ExcludePacketItemDto,
  ) {
    return this.packetsService.excludeItem(packetId, session.identityId, dto);
  }

  @Post(':packetId/assemble')
  @ApiOperation({ summary: 'Assemble draft packet after validation' })
  assemble(
    @CurrentSession() session: SessionContextDto,
    @Param('packetId', ParseUUIDPipe) packetId: string,
    @Body() dto: AssemblePacketDto,
  ) {
    return this.packetsService.assemble(packetId, session.identityId, dto);
  }

  @Post(':packetId/validate')
  @ApiOperation({ summary: 'Validate packet for adverse/disputed evidence visibility' })
  validate(@Param('packetId', ParseUUIDPipe) packetId: string) {
    return this.packetsService.validate(packetId);
  }

  @Post(':packetId/freeze')
  @ApiOperation({
    summary: 'Freeze assembled packet version with deterministic manifest hash',
    description:
      'Freezing creates an immutable snapshot. It does not approve or refuse. readyForDecisionReview may be set for future decision engine reference.',
  })
  freeze(@Param('packetId', ParseUUIDPipe) packetId: string, @Body() dto: FreezePacketDto) {
    return this.packetsService.freeze(packetId, dto);
  }

  @Post(':packetId/versions')
  @ApiOperation({ summary: 'Create new draft version from frozen packet, superseding prior version' })
  createVersion(
    @CurrentSession() session: SessionContextDto,
    @Param('packetId', ParseUUIDPipe) packetId: string,
  ) {
    return this.packetsService.createNewVersion(packetId, session.identityId);
  }

  @Get('versions/:versionIdA/compare/:versionIdB')
  @ApiOperation({ summary: 'Compare two packet versions' })
  compare(
    @Param('versionIdA', ParseUUIDPipe) versionIdA: string,
    @Param('versionIdB', ParseUUIDPipe) versionIdB: string,
  ) {
    return this.packetsService.compareVersions(versionIdA, versionIdB);
  }
}

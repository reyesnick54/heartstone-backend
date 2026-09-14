import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { hashDocumentContent } from '../../evidence-records/common/document-hash.util';
import {
  DOCUMENT_STORAGE_PORT,
  DocumentStoragePort,
} from '../../evidence-records/ports/document-storage.port';
import { InstrumentDeliveryAuditService } from '../audit/instrument-delivery-audit.service';
import {
  InstrumentDownloadForbiddenException,
  InstrumentNotFoundException,
  InstrumentVersionNotFoundException,
} from '../common/exceptions/decisions-issuance.exceptions';

export interface InstrumentDownloadResult {
  content: Buffer;
  contentType: string;
  contentSha256: string;
  originalFilename: string;
  instrumentVersionId: string;
  versionNumber: number;
}

@Injectable()
export class InstrumentDownloadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: InstrumentDeliveryAuditService,
    @Inject(DOCUMENT_STORAGE_PORT)
    private readonly storage: DocumentStoragePort,
  ) {}

  async downloadIssuedVersion(
    officialInstrumentId: string,
    actorIdentityId: string,
    instrumentVersionId?: string,
  ): Promise<InstrumentDownloadResult> {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: officialInstrumentId },
      include: {
        case: true,
        currentVersion: {
          include: { documentVersion: true },
        },
        versions: {
          include: { documentVersion: true },
        },
      },
    });

    if (!instrument) {
      throw new InstrumentNotFoundException(officialInstrumentId);
    }

    const authorized = this.isAuthorizedDownloader(instrument, actorIdentityId);
    if (!authorized) {
      await this.prisma.instrumentDownloadEvent.create({
        data: {
          officialInstrumentId,
          instrumentVersionId:
            instrument.currentVersionId ?? instrument.versions[0]?.id ?? officialInstrumentId,
          actorIdentityId,
          contentSha256: 'unauthorized',
          authorized: false,
        },
      });

      throw new InstrumentDownloadForbiddenException(
        'Actor is not an authorized holder or recipient',
      );
    }

    const version =
      instrument.versions.find((candidate) => candidate.id === instrumentVersionId) ??
      instrument.currentVersion ??
      instrument.versions[0];

    if (!version) {
      throw new InstrumentVersionNotFoundException(instrumentVersionId ?? officialInstrumentId);
    }

    const documentVersion = version.documentVersion;
    if (!documentVersion) {
      throw new InstrumentVersionNotFoundException(instrumentVersionId ?? officialInstrumentId);
    }

    const content = await this.storage.get(documentVersion.storageObjectKey);
    const contentType = documentVersion.contentType;
    const originalFilename =
      documentVersion.originalFilename ||
      `instrument-${String(instrument.instrumentNumber)}-v${String(version.versionNumber)}`;

    const actualSha256 = hashDocumentContent(content);
    if (actualSha256 !== version.contentHash) {
      throw new InstrumentDownloadForbiddenException('Stored issued version integrity mismatch');
    }

    await this.prisma.instrumentDownloadEvent.create({
      data: {
        officialInstrumentId,
        instrumentVersionId: version.id,
        actorIdentityId,
        contentSha256: version.contentHash,
        authorized: true,
      },
    });

    await this.audit.record({
      officialInstrumentId,
      instrumentVersionId: version.id,
      eventType: 'DOWNLOAD',
      actorIdentityId,
      metadata: {
        versionNumber: version.versionNumber,
      },
    });

    return {
      content,
      contentType,
      contentSha256: version.contentHash,
      originalFilename,
      instrumentVersionId: version.id,
      versionNumber: version.versionNumber,
    };
  }

  private isAuthorizedDownloader(
    instrument: {
      holderIdentityId: string | null;
      case: { applicantIdentityId: string } | null;
    },
    actorIdentityId: string,
  ): boolean {
    if (instrument.holderIdentityId === actorIdentityId) {
      return true;
    }

    if (instrument.case?.applicantIdentityId === actorIdentityId) {
      return true;
    }

    return false;
  }
}

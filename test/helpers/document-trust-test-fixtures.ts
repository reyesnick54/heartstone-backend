import { type INestApplication } from '@nestjs/common';
import { DocumentSealStatus, DocumentSignatureStatus } from '@prisma/client';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { type TestDigitalSigningAdapter } from '../../src/document-trust/adapters/test-digital-signing.adapter';
import { DIGITAL_SIGNING_PORT } from '../../src/document-trust/ports/digital-signing.port';
import { DocumentCryptographicEvidenceService } from '../../src/document-trust/services/document-cryptographic-evidence.service';

export async function attachTestCryptographicEvidence(
  app: INestApplication<App>,
  prisma: PrismaService,
  versionId: string,
  options: { signature?: boolean; seal?: boolean },
): Promise<void> {
  const version = await prisma.documentVersion.findUniqueOrThrow({ where: { id: versionId } });
  const signing = app.get<TestDigitalSigningAdapter>(DIGITAL_SIGNING_PORT);
  const evidenceService = app.get(DocumentCryptographicEvidenceService);
  const content = Buffer.from('fixture-document-content', 'utf8');

  const updates: {
    signatureStatus?: DocumentSignatureStatus;
    sealStatus?: DocumentSealStatus;
    signatureEvidence?: object;
    sealEvidence?: object;
    sha256?: string;
  } = {};

  if (options.signature) {
    const signed = await signing.signContent({
      content,
      contentHashSha256: version.sha256,
    });
    updates.signatureStatus = DocumentSignatureStatus.SIGNED;
    updates.signatureEvidence = evidenceService.toJsonSignatureEvidence(signed);
  }

  if (options.seal) {
    const sealed = await signing.applySeal({
      content,
      contentHashSha256: version.sha256,
    });
    updates.sealStatus = DocumentSealStatus.SEALED;
    updates.sealEvidence = evidenceService.toJsonSealEvidence(sealed);
  }

  await prisma.documentVersion.update({
    where: { id: versionId },
    data: updates,
  });
}

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DOCUMENT_STORAGE_PROVIDER_IN_MEMORY } from '../../evidence-records/evidence-records.constants';
import {
  DOCUMENT_STORAGE_PORT,
  DocumentStoragePort,
} from '../../evidence-records/ports/document-storage.port';
import {
  MALWARE_SCANNING_PORT,
  MalwareScanningPort,
} from '../../evidence-records/ports/malware-scanning.port';
import {
  buildDocumentTrustSovereigntySnapshot,
  type DocumentTrustConfig,
  type DocumentTrustSovereigntySnapshot,
} from '../config/document-trust.config';
import { DOCUMENT_TRUST_CONFIG_KEY } from '../document-trust.constants';
import { DOCUMENT_TRUST_READINESS_CODES } from '../document-trust.constants';
import { DIGITAL_SIGNING_PORT, DigitalSigningPort } from '../ports/digital-signing.port';

export interface DocumentTrustProductionGateResult {
  allowed: boolean;
  reasons: string[];
  sovereignty: DocumentTrustSovereigntySnapshot;
}

@Injectable()
export class DocumentTrustProductionGateService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    @Inject(DOCUMENT_STORAGE_PORT)
    private readonly storage: DocumentStoragePort,
    @Inject(MALWARE_SCANNING_PORT)
    private readonly malwareScanner: MalwareScanningPort,
    @Inject(DIGITAL_SIGNING_PORT)
    private readonly digitalSigning: DigitalSigningPort,
  ) {}

  onModuleInit(): void {
    const nodeEnv = this.configService.get<{ nodeEnv: string }>('app')?.nodeEnv ?? 'development';
    if (nodeEnv !== 'production') {
      return;
    }

    const evaluation = this.evaluateProhibitedAdapters();
    if (!evaluation.allowed) {
      throw new Error(`Production document trust gate failed: ${evaluation.reasons.join('; ')}`);
    }
  }

  evaluateProhibitedAdapters(): DocumentTrustProductionGateResult {
    const config = this.configService.getOrThrow<DocumentTrustConfig>(DOCUMENT_TRUST_CONFIG_KEY);
    const sovereignty = buildDocumentTrustSovereigntySnapshot(config);
    const reasons: string[] = [];

    if (
      !this.storage.isProductionAdapter ||
      this.storage.providerName === DOCUMENT_STORAGE_PROVIDER_IN_MEMORY
    ) {
      reasons.push(DOCUMENT_TRUST_READINESS_CODES.PROHIBITED_STORAGE_ADAPTER);
    }

    if (!this.malwareScanner.isProductionAdapter) {
      reasons.push(DOCUMENT_TRUST_READINESS_CODES.PROHIBITED_MALWARE_ADAPTER);
    }

    if (!this.digitalSigning.isProductionAdapter) {
      reasons.push(DOCUMENT_TRUST_READINESS_CODES.PROHIBITED_SIGNING_ADAPTER);
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      sovereignty,
    };
  }

  evaluate(): DocumentTrustProductionGateResult {
    const config = this.configService.getOrThrow<DocumentTrustConfig>(DOCUMENT_TRUST_CONFIG_KEY);
    const sovereignty = buildDocumentTrustSovereigntySnapshot(config);
    const prohibited = this.evaluateProhibitedAdapters();
    const reasons = [...prohibited.reasons];

    if (
      config.storageProvider !== 'filesystem-encrypted' ||
      !config.storageRootPath ||
      !config.storageDataEncryptionKeyBase64
    ) {
      reasons.push(DOCUMENT_TRUST_READINESS_CODES.STORAGE_NOT_CONFIGURED);
    }

    if (!config.malwareScanningEndpoint) {
      reasons.push(DOCUMENT_TRUST_READINESS_CODES.MALWARE_SCANNER_NOT_CONFIGURED);
    }

    if (!config.digitalSigningTrustServiceEndpoint) {
      reasons.push(DOCUMENT_TRUST_READINESS_CODES.SIGNING_NOT_CONFIGURED);
    }

    if (!config.sovereigntyDeclarationReference) {
      reasons.push(DOCUMENT_TRUST_READINESS_CODES.SOVEREIGNTY_NOT_DECLARED);
    }

    return {
      allowed: prohibited.allowed,
      reasons,
      sovereignty,
    };
  }

  isProductionRuntimeReady(): boolean {
    const evaluation = this.evaluate();
    return (
      evaluation.allowed &&
      evaluation.sovereignty.operationalReadinessState === 'READY' &&
      evaluation.reasons.length === 0
    );
  }
}

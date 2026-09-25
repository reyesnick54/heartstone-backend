import { Module } from '@nestjs/common';

import { CasesModule } from '../application-processing/cases/cases.module';
import { AuthorityModule } from '../authority/authority.module';
import { EvidenceRecordsModule } from '../evidence-records/evidence-records.module';
import { SessionAuthGuardModule } from '../identity/auth/session-auth-guard.module';
import { InstrumentDeliveryAuditService } from './audit/instrument-delivery-audit.service';
import { InstrumentCatalogService } from './catalog/instrument-catalog.service';
import { InstrumentNumberingService } from './catalog/instrument-numbering.service';
import { IssuanceController } from './controllers/issuance.controller';
import {
  ControlledDownloadDeliveryAdapter,
  PortalDeliveryAdapter,
} from './delivery/adapters/delivery-channel.adapters';
import { InstrumentDeliveryService } from './delivery/instrument-delivery.service';
import { InstrumentDownloadController } from './download/instrument-download.controller';
import { InstrumentDownloadService } from './download/instrument-download.service';
import { IssuanceService } from './issuance/issuance.service';
import { IssuanceReadinessService } from './issuance/issuance-readiness.service';
import { InstrumentReceiptService } from './receipt/instrument-receipt.service';
import { InstrumentVerificationService } from './verification/instrument-verification.service';
import { InstrumentVerificationRateLimiterService } from './verification/instrument-verification-rate-limiter.service';
import { PublicInstrumentVerificationController } from './verification/public-instrument-verification.controller';

@Module({
  imports: [SessionAuthGuardModule, AuthorityModule, CasesModule, EvidenceRecordsModule],
  controllers: [
    IssuanceController,
    PublicInstrumentVerificationController,
    InstrumentDownloadController,
  ],
  providers: [
    InstrumentCatalogService,
    InstrumentNumberingService,
    IssuanceReadinessService,
    IssuanceService,
    InstrumentDeliveryAuditService,
    PortalDeliveryAdapter,
    ControlledDownloadDeliveryAdapter,
    InstrumentDeliveryService,
    InstrumentReceiptService,
    InstrumentVerificationRateLimiterService,
    InstrumentVerificationService,
    InstrumentDownloadService,
  ],
  exports: [
    InstrumentCatalogService,
    InstrumentNumberingService,
    IssuanceReadinessService,
    IssuanceService,
    InstrumentDeliveryService,
    InstrumentReceiptService,
    InstrumentVerificationService,
    InstrumentDownloadService,
    InstrumentDeliveryAuditService,
  ],
})
export class DecisionsIssuanceModule {}

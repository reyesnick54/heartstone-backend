import { Module } from '@nestjs/common';

import { CasesModule } from '../application-processing/cases/cases.module';
import { AuthorityModule } from '../authority/authority.module';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { InstrumentCatalogService } from './catalog/instrument-catalog.service';
import { InstrumentNumberingService } from './catalog/instrument-numbering.service';
import { IssuanceController } from './controllers/issuance.controller';
import { IssuanceService } from './issuance/issuance.service';
import { IssuanceReadinessService } from './issuance/issuance-readiness.service';

@Module({
  imports: [SessionsModule, AuthorityModule, CasesModule],
  controllers: [IssuanceController],
  providers: [
    SessionAuthGuard,
    InstrumentCatalogService,
    InstrumentNumberingService,
    IssuanceReadinessService,
    IssuanceService,
  ],
  exports: [
    InstrumentCatalogService,
    InstrumentNumberingService,
    IssuanceReadinessService,
    IssuanceService,
  ],
})
export class DecisionsIssuanceModule {}

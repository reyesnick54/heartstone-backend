import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { FinancialBoundaryService } from './common/financial-boundary.service';
import { FeeAssessmentService } from './fee-assessments/fee-assessment.service';
import { FeeScheduleService } from './fee-schedules/fee-schedule.service';
import { FinancialAdministrationController } from './financial-administration.controller';
import { InvoiceService } from './invoices/invoice.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [FinancialAdministrationController],
  providers: [FinancialBoundaryService, FeeScheduleService, FeeAssessmentService, InvoiceService],
  exports: [FinancialBoundaryService, FeeScheduleService, FeeAssessmentService, InvoiceService],
})
export class FinancialAdministrationModule {}

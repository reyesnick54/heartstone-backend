import { Module } from '@nestjs/common';

import { CorporateRegistryModule } from '../../corporate-registry/corporate-registry.module';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { RevenueModule } from '../../revenue/revenue.module';
import { SchedulingModule } from '../../scheduling/scheduling.module';
import { BusinessAccessService } from '../common/business-access.service';
import { BusinessAppointmentsController } from './business-appointments.controller';
import { BusinessCorporateRegistryController } from './business-corporate-registry.controller';
import { BusinessExperienceController } from './business-experience.controller';
import { BusinessRevenueController } from './business-revenue.controller';
import { BusinessActionCenterService } from './services/business-action-center.service';
import { BusinessApplicationsService } from './services/business-applications.service';
import { BusinessAppointmentsService } from './services/business-appointments.service';
import { BusinessComplianceService } from './services/business-compliance.service';
import { BusinessCorporateRegistryService } from './services/business-corporate-registry.service';
import { BusinessHomeService } from './services/business-home.service';
import { BusinessLicensesService } from './services/business-licenses.service';
import { BusinessMessagesService } from './services/business-messages.service';
import { BusinessOrganizationDetailService } from './services/business-organization-detail.service';
import { BusinessOrganizationsService } from './services/business-organizations.service';
import { BusinessPaymentsService } from './services/business-payments.service';
import { BusinessProjectsService } from './services/business-projects.service';
import { BusinessRevenueService } from './services/business-revenue.service';

@Module({
  imports: [SessionsModule, SchedulingModule, CorporateRegistryModule, RevenueModule],
  controllers: [
    BusinessExperienceController,
    BusinessAppointmentsController,
    BusinessCorporateRegistryController,
    BusinessRevenueController,
  ],
  providers: [
    SessionAuthGuard,
    BusinessAccessService,
    BusinessOrganizationsService,
    BusinessOrganizationDetailService,
    BusinessHomeService,
    BusinessActionCenterService,
    BusinessApplicationsService,
    BusinessLicensesService,
    BusinessComplianceService,
    BusinessPaymentsService,
    BusinessMessagesService,
    BusinessProjectsService,
    BusinessAppointmentsService,
    BusinessCorporateRegistryService,
    BusinessRevenueService,
  ],
})
export class BusinessExperienceModule {}

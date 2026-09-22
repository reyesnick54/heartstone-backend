import { Module } from '@nestjs/common';

import { CorporateRegistryModule } from '../../corporate-registry/corporate-registry.module';
import { CustomsTradeModule } from '../../customs-trade/customs-trade.module';
import { EducationModule } from '../../education/education.module';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { LabourModule } from '../../labour/labour.module';
import { PlanningConstructionModule } from '../../planning-construction/planning-construction.module';
import { PropertyRegistryModule } from '../../property-registry/property-registry.module';
import { RevenueModule } from '../../revenue/revenue.module';
import { SchedulingModule } from '../../scheduling/scheduling.module';
import { TransportationModule } from '../../transportation/transportation.module';
import { BusinessAccessService } from '../common/business-access.service';
import { BusinessAppointmentsController } from './business-appointments.controller';
import { BusinessCorporateRegistryController } from './business-corporate-registry.controller';
import { BusinessDevelopmentController } from './business-development.controller';
import { BusinessEducationController } from './business-education.controller';
import { BusinessExperienceController } from './business-experience.controller';
import { BusinessPropertyController } from './business-property.controller';
import { BusinessRevenueController } from './business-revenue.controller';
import { BusinessTradeController } from './business-trade.controller';
import { BusinessTransportationController } from './business-transportation.controller';
import { BusinessWorkforceController } from './business-workforce.controller';
import { BusinessActionCenterService } from './services/business-action-center.service';
import { BusinessApplicationsService } from './services/business-applications.service';
import { BusinessAppointmentsService } from './services/business-appointments.service';
import { BusinessComplianceService } from './services/business-compliance.service';
import { BusinessCorporateRegistryService } from './services/business-corporate-registry.service';
import { BusinessEducationService } from './services/business-education.service';
import { BusinessEducationAccessService } from './services/business-education-access.service';
import { BusinessHomeService } from './services/business-home.service';
import { BusinessLicensesService } from './services/business-licenses.service';
import { BusinessMessagesService } from './services/business-messages.service';
import { BusinessOrganizationDetailService } from './services/business-organization-detail.service';
import { BusinessOrganizationsService } from './services/business-organizations.service';
import { BusinessPaymentsService } from './services/business-payments.service';
import { BusinessProjectsService } from './services/business-projects.service';
import { BusinessPropertyService } from './services/business-property.service';
import { BusinessRevenueService } from './services/business-revenue.service';
import { BusinessTradeService } from './services/business-trade.service';
import { BusinessTradeAccessService } from './services/business-trade-access.service';
import { BusinessTransportationService } from './services/business-transportation.service';
import { BusinessWorkforceService } from './services/business-workforce.service';

@Module({
  imports: [
    SessionsModule,
    SchedulingModule,
    CorporateRegistryModule,
    RevenueModule,
    CustomsTradeModule,
    EducationModule,
    PlanningConstructionModule,
    LabourModule,
    PropertyRegistryModule,
    TransportationModule,
  ],
  controllers: [
    BusinessExperienceController,
    BusinessAppointmentsController,
    BusinessCorporateRegistryController,
    BusinessRevenueController,
    BusinessTradeController,
    BusinessEducationController,
    BusinessDevelopmentController,
    BusinessWorkforceController,
    BusinessPropertyController,
    BusinessTransportationController,
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
    BusinessTradeAccessService,
    BusinessTradeService,
    BusinessEducationAccessService,
    BusinessEducationService,
    BusinessWorkforceService,
    BusinessPropertyService,
    BusinessTransportationService,
  ],
})
export class BusinessExperienceModule {}

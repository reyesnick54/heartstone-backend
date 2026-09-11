import { Module } from '@nestjs/common';

import { FormsModule } from './forms/forms.module';
import { GovernmentServicesModule } from './government-services/government-services.module';

@Module({
  imports: [GovernmentServicesModule, FormsModule],
  exports: [GovernmentServicesModule, FormsModule],
})
export class ServiceCatalogModule {}

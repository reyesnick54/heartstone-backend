import { Module } from '@nestjs/common';

import { GovernmentServicesService } from './government-services.service';

@Module({
  providers: [GovernmentServicesService],
  exports: [GovernmentServicesService],
})
export class GovernmentServicesModule {}

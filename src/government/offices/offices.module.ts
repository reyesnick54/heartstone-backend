import { Module } from '@nestjs/common';

import { GovernmentCommonModule } from '../common/government-common.module';
import { OfficesController } from './offices.controller';
import { OfficesService } from './offices.service';

@Module({
  imports: [GovernmentCommonModule],
  controllers: [OfficesController],
  providers: [OfficesService],
})
export class OfficesModule {}

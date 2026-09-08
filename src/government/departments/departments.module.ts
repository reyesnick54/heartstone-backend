import { Module } from '@nestjs/common';

import { GovernmentCommonModule } from '../common/government-common.module';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  imports: [GovernmentCommonModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
})
export class DepartmentsModule {}

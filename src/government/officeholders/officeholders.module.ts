import { Module } from '@nestjs/common';

import { GovernmentCommonModule } from '../common/government-common.module';
import { OfficeholdersController } from './officeholders.controller';
import { OfficeholdersService } from './officeholders.service';

@Module({
  imports: [GovernmentCommonModule],
  controllers: [OfficeholdersController],
  providers: [OfficeholdersService],
})
export class OfficeholdersModule {}

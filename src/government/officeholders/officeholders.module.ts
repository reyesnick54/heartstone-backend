import { Module } from '@nestjs/common';

import { OfficeholdersController } from './officeholders.controller';
import { OfficeholdersService } from './officeholders.service';

@Module({
  controllers: [OfficeholdersController],
  providers: [OfficeholdersService],
})
export class OfficeholdersModule {}

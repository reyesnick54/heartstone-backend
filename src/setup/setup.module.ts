import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AbsezSetupBootstrapService } from './bootstrap/absez-setup-bootstrap.service';

@Module({
  imports: [DatabaseModule],
  providers: [AbsezSetupBootstrapService],
  exports: [AbsezSetupBootstrapService],
})
export class SetupModule {}

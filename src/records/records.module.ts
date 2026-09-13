import { Module } from '@nestjs/common';

import { SessionsModule } from '../identity/sessions/sessions.module';
import { MasterAdministrativeFileController } from './master-administrative-file.controller';
import { MasterAdministrativeFileService } from './master-administrative-file.service';
import { MasterAdministrativeFileAccessService } from './master-administrative-file-access.service';
import { MasterAdministrativeFileIndexService } from './master-administrative-file-index.service';

@Module({
  imports: [SessionsModule],
  controllers: [MasterAdministrativeFileController],
  providers: [
    MasterAdministrativeFileService,
    MasterAdministrativeFileIndexService,
    MasterAdministrativeFileAccessService,
  ],
  exports: [MasterAdministrativeFileService, MasterAdministrativeFileIndexService],
})
export class RecordsModule {}

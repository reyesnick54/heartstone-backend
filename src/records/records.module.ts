import { Module } from '@nestjs/common';

import { MasterFileCompletenessService } from '../evidence-records/completeness/master-file-completeness.service';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { MasterFileCompletenessAssessmentService } from './completeness/master-file-completeness-assessment.service';
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
    MasterFileCompletenessService,
    MasterFileCompletenessAssessmentService,
  ],
  exports: [
    MasterAdministrativeFileService,
    MasterAdministrativeFileIndexService,
    MasterFileCompletenessAssessmentService,
  ],
})
export class RecordsModule {}

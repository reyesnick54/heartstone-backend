import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { LabourAccessService } from './common/labour-access.service';
import { LabourBoundaryService } from './common/labour-boundary.service';
import { EmploymentComplaintService } from './complaints/employment-complaint.service';
import { EmployerRegistryService } from './employers/employer-registry.service';
import { EmploymentContractReferenceService } from './employment/employment-contract-reference.service';
import { EmploymentRelationshipService } from './employment/employment-relationship.service';
import { CitizenEmploymentController } from './experience/citizen-employment.controller';
import { LabourExperienceBoundaryService } from './experience/labour-experience-boundary.service';
import { OfficialLabourController } from './experience/official-labour.controller';
import { CitizenEmploymentProjectionService } from './experience/services/citizen-employment-projection.service';
import { LabourScopeService } from './experience/services/labour-scope.service';
import { OfficialLabourProjectionService } from './experience/services/official-labour-projection.service';
import { LabourController } from './labour.controller';
import { WorkPermitApplicationProfileService } from './work-permits/work-permit-application-profile.service';
import { WorkPermitRecordService } from './work-permits/work-permit-record.service';
import { WorkerProfileReferenceService } from './workers/worker-profile-reference.service';

@Module({
  imports: [DatabaseModule, SessionsModule, OfficialModule, AuthorityModule],
  controllers: [LabourController, CitizenEmploymentController, OfficialLabourController],
  providers: [
    LabourBoundaryService,
    LabourAccessService,
    LabourExperienceBoundaryService,
    LabourScopeService,
    CitizenEmploymentProjectionService,
    OfficialLabourProjectionService,
    EmployerRegistryService,
    WorkerProfileReferenceService,
    EmploymentRelationshipService,
    EmploymentContractReferenceService,
    WorkPermitApplicationProfileService,
    WorkPermitRecordService,
    EmploymentComplaintService,
  ],
  exports: [
    LabourBoundaryService,
    LabourAccessService,
    LabourExperienceBoundaryService,
    LabourScopeService,
    EmployerRegistryService,
    WorkerProfileReferenceService,
    EmploymentRelationshipService,
    EmploymentContractReferenceService,
    WorkPermitApplicationProfileService,
    WorkPermitRecordService,
    EmploymentComplaintService,
  ],
})
export class LabourModule {}

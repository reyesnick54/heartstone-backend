import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { LabourAccessService } from './common/labour-access.service';
import { LabourBoundaryService } from './common/labour-boundary.service';
import { EmploymentComplaintService } from './complaints/employment-complaint.service';
import { EmployerRegistryService } from './employers/employer-registry.service';
import { EmploymentContractReferenceService } from './employment/employment-contract-reference.service';
import { EmploymentRelationshipService } from './employment/employment-relationship.service';
import { LabourController } from './labour.controller';
import { WorkPermitApplicationProfileService } from './work-permits/work-permit-application-profile.service';
import { WorkPermitRecordService } from './work-permits/work-permit-record.service';
import { WorkerProfileReferenceService } from './workers/worker-profile-reference.service';

@Module({
  imports: [DatabaseModule],
  controllers: [LabourController],
  providers: [
    LabourBoundaryService,
    LabourAccessService,
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

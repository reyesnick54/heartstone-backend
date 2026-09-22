import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { LabourBoundaryService } from '../common/labour-boundary.service';
import { EMPLOYMENT_COMPLAINT_PREFIX } from '../labour.constants';

@Injectable()
export class EmploymentComplaintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: LabourBoundaryService,
  ) {}

  async fileComplaint(input: {
    workerProfileReferenceId?: string;
    employerRegistryRecordId?: string;
    caseId?: string;
    redressMatterId?: string;
    complaintSummary?: string;
  }) {
    this.boundary.assertComplaintIsNotVerifiedViolation(false, input.complaintSummary);

    const complaintReference = `${EMPLOYMENT_COMPLAINT_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.employmentComplaint.create({
      data: {
        id: randomUUID(),
        complaintReference,
        workerProfileReferenceId: input.workerProfileReferenceId,
        employerRegistryRecordId: input.employerRegistryRecordId,
        caseId: input.caseId,
        redressMatterId: input.redressMatterId,
        complaintSummary: input.complaintSummary,
        isVerifiedViolation: false,
      },
    });
  }
}

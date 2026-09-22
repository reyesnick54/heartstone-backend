import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { DriverTestRecordOutcome } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { TransportationBoundaryService } from '../common/transportation-boundary.service';
import { DRIVER_TEST_REFERENCE_PREFIX } from '../transportation.constants';

@Injectable()
export class DriverTestRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: TransportationBoundaryService,
  ) {}

  async recordTestResult(input: {
    driverProfileId: string;
    caseId?: string;
    testTypeCode?: string;
    outcome: DriverTestRecordOutcome;
    serviceAppointmentId?: string;
  }) {
    this.boundary.assertTestPassDoesNotIssueLicense({
      outcome: input.outcome,
      doesNotIssueLicense: true,
      isLicenseIssuance: false,
    });

    const testReference = `${DRIVER_TEST_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const record = await this.prisma.driverTestRecord.create({
      data: {
        id: randomUUID(),
        testReference,
        driverProfileId: input.driverProfileId,
        caseId: input.caseId,
        serviceAppointmentId: input.serviceAppointmentId,
        testTypeCode: input.testTypeCode,
        outcome: input.outcome,
        testedAt: new Date(),
        doesNotIssueLicense: true,
        isLicenseIssuance: false,
      },
    });

    return { record, driverLicensesIssued: 0 };
  }
}

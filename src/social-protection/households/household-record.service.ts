import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { HOUSEHOLD_RECORD_PREFIX } from '../social-protection.constants';

@Injectable()
export class HouseholdRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async createHouseholdRecord(input: {
    benefitApplicantProfileId: string;
    jurisdictionId?: string;
    addressReferenceToken?: string;
  }) {
    const householdReferenceNumber = `${HOUSEHOLD_RECORD_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;

    return this.prisma.householdRecord.create({
      data: {
        id: randomUUID(),
        householdReferenceNumber,
        benefitApplicantProfileId: input.benefitApplicantProfileId,
        jurisdictionId: input.jurisdictionId,
        addressReferenceToken: input.addressReferenceToken,
        isSameAsFamily: false,
        isSameAsAddress: false,
      },
    });
  }
}

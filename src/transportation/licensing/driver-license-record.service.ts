import { randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DriverLicenseLifecycleStatus,
  TransportationActorPersona,
  TransportationRegistryLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { TransportationBoundaryService } from '../common/transportation-boundary.service';
import { resolveDriverLicenseLifecycle } from '../common/transportation-credential.util';
import { TransportationStatusService } from '../status/transportation-status.service';
import { DRIVER_LICENSE_NUMBER_PREFIX } from '../transportation.constants';

export interface AuthorizeDriverLicenseIssuanceInput {
  driverProfileId: string;
  driverLicenseApplicationProfileId?: string;
  governmentDecisionId: string;
  officialInstrumentId?: string;
  licenseClassCode?: string;
  validFrom?: Date;
  validUntil?: Date;
  actorIdentityId?: string;
  actorPersona: TransportationActorPersona;
}

@Injectable()
export class DriverLicenseRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: TransportationBoundaryService,
    private readonly statusService: TransportationStatusService,
  ) {}

  async authorizeIssuance(input: AuthorizeDriverLicenseIssuanceInput) {
    this.boundary.assertAiCannotApproveDriverLicense('ISSUE_DRIVER_LICENSE');
    this.boundary.assertPaymentDoesNotIssueDriverLicense(input.actorPersona);
    this.boundary.assertTechnicalAdminCannotIssueDriverLicense(
      input.actorPersona,
      'DRIVER_LICENSE',
    );

    const licenseNumber = `${DRIVER_LICENSE_NUMBER_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const record = await this.prisma.driverLicenseRecord.create({
      data: {
        id: randomUUID(),
        licenseNumber,
        driverProfileId: input.driverProfileId,
        driverLicenseApplicationProfileId: input.driverLicenseApplicationProfileId,
        governmentDecisionId: input.governmentDecisionId,
        officialInstrumentId: input.officialInstrumentId,
        licenseClassCode: input.licenseClassCode,
        validFrom: input.validFrom ?? new Date(),
        validUntil: input.validUntil,
        lifecycleStatus: DriverLicenseLifecycleStatus.EFFECTIVE,
        requiresGovernmentDecision: true,
      },
    });

    this.boundary.assertLicenseRequiresGovernmentDecision({
      requiresGovernmentDecision: record.requiresGovernmentDecision,
      governmentDecisionId: record.governmentDecisionId,
      lifecycleStatus: record.lifecycleStatus,
    });

    await this.statusService.recordDriverLicenseStatus({
      driverProfileId: input.driverProfileId,
      driverLicenseRecordId: record.id,
      toLifecycleStatus: TransportationRegistryLifecycleStatus.ACTIVE,
      statusCode: record.lifecycleStatus,
      actorIdentityId: input.actorIdentityId,
      actorPersona: input.actorPersona,
      reason: 'Authorized driver license issuance',
    });

    await this.prisma.driverProfile.update({
      where: { id: input.driverProfileId },
      data: { currentDriverLicenseRecordId: record.id },
    });

    return record;
  }

  async suspendLicense(input: {
    driverLicenseRecordId: string;
    driverProfileId: string;
    actorIdentityId?: string;
    actorPersona: TransportationActorPersona;
    reason?: string;
  }) {
    const license = await this.prisma.driverLicenseRecord.findUnique({
      where: { id: input.driverLicenseRecordId },
    });
    if (!license) {
      throw new NotFoundException('Driver license record not found');
    }

    const updated = await this.prisma.driverLicenseRecord.update({
      where: { id: input.driverLicenseRecordId },
      data: { lifecycleStatus: DriverLicenseLifecycleStatus.SUSPENDED },
    });

    await this.statusService.recordDriverLicenseStatus({
      driverProfileId: input.driverProfileId,
      driverLicenseRecordId: input.driverLicenseRecordId,
      toLifecycleStatus: TransportationRegistryLifecycleStatus.SUSPENDED,
      statusCode: DriverLicenseLifecycleStatus.SUSPENDED,
      actorIdentityId: input.actorIdentityId,
      actorPersona: input.actorPersona,
      reason: input.reason ?? 'License suspended',
    });

    return updated;
  }

  async getLicenseLifecycle(licenseId: string) {
    const license = await this.prisma.driverLicenseRecord.findUnique({ where: { id: licenseId } });
    if (!license) {
      throw new NotFoundException('Driver license record not found');
    }
    const effectiveStatus = resolveDriverLicenseLifecycle({
      lifecycleStatus: license.lifecycleStatus,
      validUntil: license.validUntil,
    });
    return { license, effectiveStatus };
  }

  rejectDirectIssuanceWithoutDecision(): never {
    throw new BadRequestException(
      'Driver license cannot be issued without a government decision and governed issuance workflow',
    );
  }
}

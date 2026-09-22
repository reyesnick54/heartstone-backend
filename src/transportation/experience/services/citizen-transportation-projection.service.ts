import { Injectable } from '@nestjs/common';
import {
  DriverLicenseLifecycleStatus,
  DriverTestRecordOutcome,
  ServiceAppointmentStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { TransportationExperienceBoundaryService } from '../../boundary/transportation-experience-boundary.service';
import { TRANSPORTATION_EXPERIENCE_DISCLAIMER } from '../../transportation.constants';
import { TransportationScopeService } from './transportation-scope.service';

@Injectable()
export class CitizenTransportationProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: TransportationScopeService,
    private readonly boundary: TransportationExperienceBoundaryService,
  ) {}

  async getTransportationHome(identityId: string) {
    const profile = await this.scope.findDriverProfile(identityId);
    const vehicles = await this.scope.listAuthorizedVehicleRecords(identityId);

    const driverTestRecords = profile
      ? await this.prisma.driverTestRecord.findMany({
          where: { driverProfileId: profile.id },
          include: { serviceAppointment: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      : [];

    const vehicleIds = vehicles.map((vehicle) => vehicle.id);
    const pendingTransfers =
      vehicleIds.length === 0
        ? []
        : await this.prisma.vehicleTransfer.findMany({
            where: {
              vehicleRecordId: { in: vehicleIds },
              governmentDecisionId: null,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          });

    const license = profile?.currentDriverLicenseRecord;

    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: 'NON_PRODUCTION',
      disclaimer: TRANSPORTATION_EXPERIENCE_DISCLAIMER,
      driverLicense: license
        ? {
            licenseNumber: license.licenseNumber,
            lifecycleStatus: license.lifecycleStatus,
            expiresAt: license.validUntil?.toISOString() ?? null,
            classes: license.licenseClasses.map((item) => item.classCode),
            endorsements: license.licenseEndorsements.map((item) => item.endorsementCode),
            isSuspended: this.scope.isSuspendedLicense(license.lifecycleStatus),
          }
        : null,
      vehicles: vehicles.map((vehicle) =>
        this.boundary.sanitizeCitizenPayload({
          vehicleRecordId: vehicle.id,
          vehicleReferenceNumber: vehicle.vehicleReferenceNumber,
          registrationStatus: vehicle.currentRegistration?.lifecycleStatus ?? 'UNKNOWN',
          expiresAt: vehicle.currentRegistration?.registeredUntil?.toISOString() ?? null,
          inspectionStatus: vehicle.inspections[0]?.resultSummaryCode ?? 'UNKNOWN',
          lastInspectionAt: vehicle.inspections[0]?.completedAt?.toISOString() ?? null,
        }),
      ),
      scheduledTests: driverTestRecords
        .filter((test) => test.outcome === DriverTestRecordOutcome.INCOMPLETE)
        .map((test) => ({
          testReference: test.testReference,
          outcome: test.outcome,
          appointmentReference: test.serviceAppointment?.appointmentReference ?? null,
          scheduledStartsAt: test.serviceAppointment?.scheduledStartsAt?.toISOString() ?? null,
        })),
      pendingTransfers: pendingTransfers.map((transfer) => ({
        transferReference: transfer.transferReference,
        decisionRequired: transfer.governmentDecisionId == null,
      })),
      payments: [],
      governmentMessages: [],
      renewalActionsAvailable: license
        ? license.lifecycleStatus === DriverLicenseLifecycleStatus.EFFECTIVE ||
          license.lifecycleStatus === DriverLicenseLifecycleStatus.EXPIRED
        : false,
    };
  }

  async listDriverLicenses(identityId: string) {
    const profile = await this.scope.findDriverProfile(identityId);
    if (!profile) {
      return [];
    }

    const records = await this.prisma.driverLicenseRecord.findMany({
      where: { driverProfileId: profile.id },
      include: { licenseClasses: true, licenseEndorsements: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => ({
      licenseNumber: record.licenseNumber,
      lifecycleStatus: record.lifecycleStatus,
      expiresAt: record.validUntil?.toISOString() ?? null,
      classes: record.licenseClasses.map((item) => item.classCode),
      endorsements: record.licenseEndorsements.map((item) => item.endorsementCode),
      isSuspended: this.scope.isSuspendedLicense(record.lifecycleStatus),
    }));
  }

  async listVehicles(identityId: string) {
    const vehicles = await this.scope.listAuthorizedVehicleRecords(identityId);
    return vehicles.map((vehicle) =>
      this.boundary.sanitizeCitizenPayload({
        vehicleRecordId: vehicle.id,
        vehicleReferenceNumber: vehicle.vehicleReferenceNumber,
        registrationStatus: vehicle.currentRegistration?.lifecycleStatus ?? 'UNKNOWN',
      }),
    );
  }

  async listVehicleApplications(identityId: string) {
    const cases = await this.prisma.case.findMany({
      where: { applicantIdentityId: identityId },
      include: {
        governmentService: true,
        application: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return cases
      .filter((caseRecord) => caseRecord.governmentService.code.startsWith('TEMPLATE-TRANS'))
      .map((caseRecord) => ({
        caseId: caseRecord.id,
        caseStatus: caseRecord.status,
        applicationId: caseRecord.applicationId,
        serviceCode: caseRecord.governmentService.code,
      }));
  }

  async listActions(identityId: string) {
    const home = await this.getTransportationHome(identityId);
    const actions: { actionCode: string; label: string; priority: string }[] = [];

    if (!home.driverLicense) {
      actions.push({
        actionCode: 'APPLY_DRIVER_LICENSE',
        label: 'Apply for driver license',
        priority: 'HIGH',
      });
    }
    if (home.renewalActionsAvailable) {
      actions.push({
        actionCode: 'RENEW_DRIVER_LICENSE',
        label: 'Renew driver license',
        priority: 'HIGH',
      });
    }
    if (home.scheduledTests.length === 0 && !home.driverLicense) {
      actions.push({
        actionCode: 'SCHEDULE_DRIVER_TEST',
        label: 'Schedule driver test',
        priority: 'MEDIUM',
      });
    }

    actions.push(
      { actionCode: 'REGISTER_VEHICLE', label: 'Register vehicle', priority: 'LOW' },
      { actionCode: 'SCHEDULE_VEHICLE_INSPECTION', label: 'Schedule inspection', priority: 'LOW' },
      { actionCode: 'FILE_TRANSPORT_APPEAL', label: 'Appeal transportation decision', priority: 'LOW' },
    );

    return { generatedAt: new Date().toISOString(), actions };
  }

  async listScheduledAppointments(identityId: string) {
    return this.prisma.serviceAppointment.findMany({
      where: {
        participants: { some: { identityId } },
        status: {
          in: [
            ServiceAppointmentStatus.REQUESTED,
            ServiceAppointmentStatus.SCHEDULED,
            ServiceAppointmentStatus.CONFIRMED,
            ServiceAppointmentStatus.RESCHEDULED,
          ],
        },
      },
      include: { appointmentReason: true },
      orderBy: { scheduledStartsAt: 'asc' },
    });
  }
}

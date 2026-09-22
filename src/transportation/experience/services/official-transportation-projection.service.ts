import { Injectable } from '@nestjs/common';
import {
  CaseStatus,
  DriverLicenseLifecycleStatus,
  DriverTestRecordOutcome,
  FleetVehicleLinkStatus,
  TransportationApplicationProfileStatus,
  TransportPermitLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { type ResolvedOfficialContext } from '../../../experience/official/types/official-context.types';
import { TransportationExperienceBoundaryService } from '../../boundary/transportation-experience-boundary.service';
import { TRANSPORTATION_EXPERIENCE_DISCLAIMER } from '../../transportation.constants';
import { TransportationAvailableActionsService } from './transportation-available-actions.service';

@Injectable()
export class OfficialTransportationProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: TransportationExperienceBoundaryService,
    private readonly availableActions: TransportationAvailableActionsService,
  ) {}

  private emptyWorkspace() {
    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: 'NON_PRODUCTION',
      disclaimer: TRANSPORTATION_EXPERIENCE_DISCLAIMER,
      queues: {
        driverLicenseQueue: 0,
        testingQueue: 0,
        registrationQueue: 0,
        vehicleTransferQueue: 0,
        inspectionQueue: 0,
        commercialOperatorLicensing: 0,
        fleetCompliance: 0,
        suspensionsRevocationsAwaitingAction: 0,
        appeals: 0,
        slaRisk: 0,
      },
      authorityGatedActions: [],
    };
  }

  async buildWorkspace(context: ResolvedOfficialContext) {
    if (!context.technicalCapabilities.substantiveAccessAllowed) {
      return this.emptyWorkspace();
    }

    const [
      driverLicenseQueue,
      testingQueue,
      registrationQueue,
      vehicleTransferQueue,
      inspectionQueue,
      commercialOperatorLicensing,
      fleetCompliance,
      suspensionsRevocationsAwaitingAction,
      appeals,
      slaRisk,
      authorityGatedActions,
    ] = await Promise.all([
      this.prisma.driverLicenseRecord.count({
        where: { lifecycleStatus: DriverLicenseLifecycleStatus.PENDING_ISSUANCE },
      }),
      this.prisma.driverTestRecord.count({
        where: { outcome: DriverTestRecordOutcome.INCOMPLETE },
      }),
      this.prisma.driverLicenseApplicationProfile.count({
        where: { status: TransportationApplicationProfileStatus.LINKED },
      }),
      this.prisma.vehicleTransfer.count({ where: { governmentDecisionId: null } }),
      this.prisma.vehicleInspection.count({ where: { completedAt: null } }),
      this.prisma.transportOperatorLicense.count({
        where: { lifecycleStatus: TransportPermitLifecycleStatus.PENDING_ISSUANCE },
      }),
      this.prisma.fleetVehicle.count({ where: { linkStatus: FleetVehicleLinkStatus.ACTIVE } }),
      this.prisma.driverLicenseRecord.count({
        where: {
          lifecycleStatus: {
            in: [DriverLicenseLifecycleStatus.SUSPENDED, DriverLicenseLifecycleStatus.REVOKED],
          },
        },
      }),
      this.prisma.case.count({
        where: {
          status: CaseStatus.PENDING_EXTERNAL,
          governmentService: { code: { startsWith: 'TEMPLATE-TRANS' } },
        },
      }),
      this.prisma.case.count({
        where: {
          status: { in: [CaseStatus.SUBSTANTIVE_REVIEW, CaseStatus.DECISION_PENDING] },
          governmentService: { code: { startsWith: 'TEMPLATE-TRANS' } },
          updatedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.availableActions.evaluateOfficialActions(context),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      ruleEnvironment: 'NON_PRODUCTION',
      disclaimer: this.boundary.disclaimer,
      queues: {
        driverLicenseQueue,
        testingQueue,
        registrationQueue,
        vehicleTransferQueue,
        inspectionQueue,
        commercialOperatorLicensing,
        fleetCompliance,
        suspensionsRevocationsAwaitingAction,
        appeals,
        slaRisk,
      },
      authorityGatedActions,
    };
  }
}

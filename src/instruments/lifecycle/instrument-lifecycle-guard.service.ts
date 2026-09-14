import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  InstrumentControllingDecisionStatus,
  InstrumentLifecycleEventType,
  LifecycleOfficialInstrumentStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { INCOMPATIBLE_CONCURRENT_OPERATIONS } from '../instruments.constants';

@Injectable()
export class InstrumentLifecycleGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async assertNoConflictingPendingOperations(
    instrumentId: string,
    proposedEventType: InstrumentLifecycleEventType,
  ): Promise<void> {
    const instrument = await this.prisma.lifecycleOfficialInstrument.findUnique({
      where: { id: instrumentId },
      include: {
        lifecycleEvents: {
          orderBy: { effectiveAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!instrument) {
      throw new BadRequestException(`Instrument ${instrumentId} not found`);
    }

    const incompatible = INCOMPATIBLE_CONCURRENT_OPERATIONS[instrument.currentStatus];
    if (incompatible?.includes(proposedEventType)) {
      throw new ConflictException(
        `Cannot perform ${proposedEventType} while instrument is ${instrument.currentStatus}`,
      );
    }

    const pendingRevocation = await this.prisma.instrumentControllingDecision.findFirst({
      where: {
        status: InstrumentControllingDecisionStatus.PENDING,
        decisionType: { in: ['REVOKE', 'REVOCATION_DECIDED'] },
        lifecycleEvents: {
          some: { instrumentId },
        },
      },
    });

    if (pendingRevocation && ['RENEWED', 'AMENDED', 'REPLACED'].includes(proposedEventType)) {
      throw new ConflictException('Cannot amend or renew instrument while revocation is pending');
    }

    const recentDuplicate = await this.prisma.instrumentLifecycleEvent.findFirst({
      where: {
        instrumentId,
        eventType: proposedEventType,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });

    if (recentDuplicate) {
      throw new ConflictException(
        `Duplicate lifecycle action ${proposedEventType} detected within concurrency window`,
      );
    }
  }

  assertReinstatementPrerequisitesResolved(input: {
    priorSuspensionExpired: boolean;
    correctiveEvidenceProvided: boolean;
    inspectionVerified: boolean;
    professionalVerified: boolean;
    newDecisionFinalized: boolean;
  }): void {
    if (input.priorSuspensionExpired && !input.newDecisionFinalized) {
      throw new BadRequestException(
        'Expiration of a suspension period alone does not automatically reinstate; a new government decision is required',
      );
    }

    if (
      !input.correctiveEvidenceProvided ||
      !input.inspectionVerified ||
      !input.professionalVerified ||
      !input.newDecisionFinalized
    ) {
      throw new BadRequestException(
        'Reinstatement prerequisites remain unresolved: corrective evidence, verification, and new decision required',
      );
    }
  }

  assertRenewalEligibility(input: {
    currentEvidenceIds: string[];
    identityVerified: boolean;
    ownershipVerified: boolean;
    conditionsPerformanceVerified: boolean;
    priorApprovalReliedUpon: boolean;
    paymentReceived: boolean;
    decisionFinalized: boolean;
  }): void {
    if (input.currentEvidenceIds.length === 0) {
      throw new BadRequestException('Renewal requires current evidence');
    }

    if (input.priorApprovalReliedUpon && !input.decisionFinalized) {
      throw new BadRequestException(
        'Prior approval does not automatically establish current eligibility for renewal',
      );
    }

    if (input.paymentReceived && !input.decisionFinalized) {
      throw new BadRequestException('Payment alone does not constitute renewal');
    }

    if (
      !input.identityVerified ||
      !input.ownershipVerified ||
      !input.conditionsPerformanceVerified
    ) {
      throw new BadRequestException(
        'Renewal requires verified current identity, ownership, and conditions performance',
      );
    }
  }

  assertConsequentialEventHasDecision(
    eventType: InstrumentLifecycleEventType,
    controllingDecisionId?: string,
  ): void {
    const systemDetectedEvents: InstrumentLifecycleEventType[] = [
      InstrumentLifecycleEventType.EXPIRED,
      InstrumentLifecycleEventType.BECAME_EFFECTIVE,
    ];

    if (!systemDetectedEvents.includes(eventType) && !controllingDecisionId) {
      throw new BadRequestException(
        `Consequential lifecycle event ${eventType} requires a controlling InstrumentControllingDecision`,
      );
    }
  }

  getAllowedStatusesForAction(
    action: InstrumentLifecycleEventType,
  ): LifecycleOfficialInstrumentStatus[] {
    const map: Partial<Record<InstrumentLifecycleEventType, LifecycleOfficialInstrumentStatus[]>> =
      {
        AMENDED: [
          LifecycleOfficialInstrumentStatus.EFFECTIVE,
          LifecycleOfficialInstrumentStatus.AMENDED,
          LifecycleOfficialInstrumentStatus.RENEWED,
          LifecycleOfficialInstrumentStatus.REINSTATED,
        ],
        VARIED: [
          LifecycleOfficialInstrumentStatus.EFFECTIVE,
          LifecycleOfficialInstrumentStatus.AMENDED,
          LifecycleOfficialInstrumentStatus.VARIED,
        ],
        RENEWED: [
          LifecycleOfficialInstrumentStatus.EFFECTIVE,
          LifecycleOfficialInstrumentStatus.RENEWED,
          LifecycleOfficialInstrumentStatus.AMENDED,
        ],
        SUSPENDED: [
          LifecycleOfficialInstrumentStatus.EFFECTIVE,
          LifecycleOfficialInstrumentStatus.RENEWED,
          LifecycleOfficialInstrumentStatus.AMENDED,
          LifecycleOfficialInstrumentStatus.REINSTATED,
        ],
        PARTIALLY_SUSPENDED: [
          LifecycleOfficialInstrumentStatus.EFFECTIVE,
          LifecycleOfficialInstrumentStatus.RENEWED,
          LifecycleOfficialInstrumentStatus.AMENDED,
        ],
        REVOKED: [
          LifecycleOfficialInstrumentStatus.EFFECTIVE,
          LifecycleOfficialInstrumentStatus.SUSPENDED,
          LifecycleOfficialInstrumentStatus.PARTIALLY_SUSPENDED,
          LifecycleOfficialInstrumentStatus.REVOCATION_DECIDED,
        ],
        REINSTATED: [
          LifecycleOfficialInstrumentStatus.SUSPENDED,
          LifecycleOfficialInstrumentStatus.PARTIALLY_SUSPENDED,
          LifecycleOfficialInstrumentStatus.REVOKED,
          LifecycleOfficialInstrumentStatus.EXPIRED,
        ],
        SURRENDERED: [
          LifecycleOfficialInstrumentStatus.EFFECTIVE,
          LifecycleOfficialInstrumentStatus.RENEWED,
          LifecycleOfficialInstrumentStatus.SUSPENDED,
        ],
        REPLACED: [
          LifecycleOfficialInstrumentStatus.EFFECTIVE,
          LifecycleOfficialInstrumentStatus.RENEWED,
          LifecycleOfficialInstrumentStatus.AMENDED,
        ],
        CORRECTED_CLERICAL: [
          LifecycleOfficialInstrumentStatus.EFFECTIVE,
          LifecycleOfficialInstrumentStatus.ISSUED,
          LifecycleOfficialInstrumentStatus.AMENDED,
        ],
      };

    return map[action] ?? [];
  }
}

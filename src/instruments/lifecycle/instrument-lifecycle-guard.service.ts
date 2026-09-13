import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import {
  InstrumentLifecycleDecisionStatus,
  InstrumentLifecycleEventType,
  InstrumentLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { INCOMPATIBLE_CONCURRENT_OPERATIONS } from '../instruments.constants';

@Injectable()
export class InstrumentLifecycleGuardService {
  constructor(private readonly prisma: PrismaService) {}

  async assertNoConflictingPendingOperations(
    officialInstrumentId: string,
    proposedEventType: InstrumentLifecycleEventType,
  ): Promise<void> {
    const instrument = await this.prisma.officialInstrument.findUnique({
      where: { id: officialInstrumentId },
      include: {
        lifecycleEvents: {
          orderBy: { effectiveAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!instrument) {
      throw new BadRequestException(`Instrument ${officialInstrumentId} not found`);
    }

    const incompatible = INCOMPATIBLE_CONCURRENT_OPERATIONS[instrument.lifecycleStatus];
    if (incompatible?.includes(proposedEventType)) {
      throw new ConflictException(
        `Cannot perform ${proposedEventType} while instrument is ${instrument.lifecycleStatus}`,
      );
    }

    const pendingRevocation = await this.prisma.instrumentLifecycleDecision.findFirst({
      where: {
        status: InstrumentLifecycleDecisionStatus.PENDING,
        decisionType: { in: ['REVOKE', 'REVOCATION_DECIDED'] },
        lifecycleEvents: {
          some: { officialInstrumentId },
        },
      },
    });

    if (
      pendingRevocation &&
      ['RENEWED', 'AMENDED', 'REPLACED'].includes(proposedEventType)
    ) {
      throw new ConflictException(
        'Cannot amend or renew instrument while revocation is pending',
      );
    }

    const recentDuplicate = await this.prisma.instrumentLifecycleEvent.findFirst({
      where: {
        officialInstrumentId,
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
        `Consequential lifecycle event ${eventType} requires a controlling GovernmentDecision`,
      );
    }
  }

  getAllowedStatusesForAction(
    action: InstrumentLifecycleEventType,
  ): InstrumentLifecycleStatus[] {
    const map: Partial<Record<InstrumentLifecycleEventType, InstrumentLifecycleStatus[]>> = {
      AMENDED: [
        InstrumentLifecycleStatus.EFFECTIVE,
        InstrumentLifecycleStatus.AMENDED,
        InstrumentLifecycleStatus.RENEWED,
        InstrumentLifecycleStatus.REINSTATED,
      ],
      VARIED: [
        InstrumentLifecycleStatus.EFFECTIVE,
        InstrumentLifecycleStatus.AMENDED,
        InstrumentLifecycleStatus.VARIED,
      ],
      RENEWED: [
        InstrumentLifecycleStatus.EFFECTIVE,
        InstrumentLifecycleStatus.RENEWED,
        InstrumentLifecycleStatus.AMENDED,
      ],
      SUSPENDED: [
        InstrumentLifecycleStatus.EFFECTIVE,
        InstrumentLifecycleStatus.RENEWED,
        InstrumentLifecycleStatus.AMENDED,
        InstrumentLifecycleStatus.REINSTATED,
      ],
      PARTIALLY_SUSPENDED: [
        InstrumentLifecycleStatus.EFFECTIVE,
        InstrumentLifecycleStatus.RENEWED,
        InstrumentLifecycleStatus.AMENDED,
      ],
      REVOKED: [
        InstrumentLifecycleStatus.EFFECTIVE,
        InstrumentLifecycleStatus.SUSPENDED,
        InstrumentLifecycleStatus.PARTIALLY_SUSPENDED,
        InstrumentLifecycleStatus.REVOCATION_DECIDED,
      ],
      REINSTATED: [
        InstrumentLifecycleStatus.SUSPENDED,
        InstrumentLifecycleStatus.PARTIALLY_SUSPENDED,
        InstrumentLifecycleStatus.REVOKED,
        InstrumentLifecycleStatus.EXPIRED,
      ],
      SURRENDERED: [
        InstrumentLifecycleStatus.EFFECTIVE,
        InstrumentLifecycleStatus.RENEWED,
        InstrumentLifecycleStatus.SUSPENDED,
      ],
      REPLACED: [
        InstrumentLifecycleStatus.EFFECTIVE,
        InstrumentLifecycleStatus.RENEWED,
        InstrumentLifecycleStatus.AMENDED,
      ],
      CORRECTED_CLERICAL: [
        InstrumentLifecycleStatus.EFFECTIVE,
        InstrumentLifecycleStatus.ISSUED,
        InstrumentLifecycleStatus.AMENDED,
      ],
    };

    return map[action] ?? [];
  }
}

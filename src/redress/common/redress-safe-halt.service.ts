import { BadRequestException, Injectable } from '@nestjs/common';
import { RedressMatterStatus, RedressSafeHaltReason } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface TriggerSafeHaltInput {
  matterId: string;
  reason: RedressSafeHaltReason;
  explanation?: string;
}

@Injectable()
export class RedressSafeHaltService {
  constructor(private readonly prisma: PrismaService) {}

  async triggerSafeHalt(input: TriggerSafeHaltInput) {
    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.matterId },
    });

    if (!matter) {
      throw new BadRequestException(`RedressMatter ${input.matterId} not found`);
    }

    return this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: {
        status: RedressMatterStatus.SAFE_HALTED,
        safeHaltReason: input.reason,
        safeHaltAt: new Date(),
      },
    });
  }

  assertNotSafeHalted(status: RedressMatterStatus, action: string): void {
    if (status === RedressMatterStatus.SAFE_HALTED) {
      throw new BadRequestException(
        `Matter is safe-halted; ${action} cannot proceed until resolved`,
      );
    }
  }

  async assertMatterNotSafeHalted(matterId: string, action: string): Promise<void> {
    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: matterId },
      select: { status: true },
    });

    if (matter) {
      this.assertNotSafeHalted(matter.status, action);
    }
  }

  forAuthorityUnresolved(): RedressSafeHaltReason {
    return RedressSafeHaltReason.AUTHORITY_UNRESOLVED;
  }

  forReviewerInvalid(): RedressSafeHaltReason {
    return RedressSafeHaltReason.REVIEWER_APPOINTMENT_INVALID;
  }

  forIndependenceNotEstablished(): RedressSafeHaltReason {
    return RedressSafeHaltReason.INDEPENDENCE_NOT_ESTABLISHED;
  }

  forRouteSuperseded(): RedressSafeHaltReason {
    return RedressSafeHaltReason.ROUTE_SUPERSEDED;
  }

  forEvidenceIntegrity(): RedressSafeHaltReason {
    return RedressSafeHaltReason.EVIDENCE_INTEGRITY_COMPROMISED;
  }

  forExternalAuthenticity(): RedressSafeHaltReason {
    return RedressSafeHaltReason.EXTERNAL_AUTHENTICITY_UNRESOLVED;
  }
}

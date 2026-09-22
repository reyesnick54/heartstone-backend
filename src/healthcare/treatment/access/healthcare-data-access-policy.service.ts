import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { TreatmentBoundaryService } from '../common/treatment-boundary.service';
import { type HealthcareProviderScope } from '../treatment.constants';

export interface HealthcareDataAccessContext {
  actorIdentityId: string;
  patientSubjectIdentityId: string;
  organizationId?: string | null;
  requestedScope: keyof HealthcareProviderScope;
}

@Injectable()
export class HealthcareDataAccessPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: TreatmentBoundaryService,
  ) {}

  assertPatientSelfAccess(requesterIdentityId: string, subjectIdentityId: string): void {
    this.boundary.assertCrossPatientBlocked(requesterIdentityId, subjectIdentityId);
  }

  async assertProviderMayAccessPatient(context: HealthcareDataAccessContext): Promise<void> {
    const granteeOr: Record<string, string>[] = [
      { granteeProviderIdentityId: context.actorIdentityId },
    ];
    if (context.organizationId) {
      granteeOr.push({ granteeOrganizationId: context.organizationId });
    }

    const policy = await this.prisma.treatmentPatientDataAccessGrant.findFirst({
      where: {
        patientSubjectIdentityId: context.patientSubjectIdentityId,
        isActive: true,
        effectiveFrom: { lte: new Date() },
        AND: [
          { OR: granteeOr },
          { OR: [{ effectiveUntil: null }, { effectiveUntil: { gt: new Date() } }] },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    if (!policy) {
      throw new ForbiddenException(
        'No TreatmentPatientDataAccessGrant grants provider access to patient',
      );
    }

    const categories = policy.authorizedDataCategories as string[];
    if (!categories.includes(context.requestedScope)) {
      throw new ForbiddenException(
        `TreatmentPatientDataAccessGrant does not authorize scope: ${context.requestedScope}`,
      );
    }
  }

  async assertProviderEnrollmentAccess(
    providerIdentityId: string,
    enrollmentId: string,
    organizationId?: string | null,
  ): Promise<void> {
    const enrollment = await this.prisma.treatmentEnrollment.findUnique({
      where: { id: enrollmentId },
      select: { patientIdentityId: true },
    });
    if (!enrollment) {
      throw new NotFoundException('Treatment enrollment not found');
    }

    await this.assertProviderMayAccessPatient({
      actorIdentityId: providerIdentityId,
      patientSubjectIdentityId: enrollment.patientIdentityId,
      organizationId,
      requestedScope: 'viewEnrollments',
    });
  }
}

import { Injectable } from '@nestjs/common';
import {
  AdverseEventCausalityStatus,
  AdverseEventReportStatus,
  IdentityType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import { HealthcareBoundaryService } from '../common/healthcare-boundary.service';

@Injectable()
export class ClinicalSafetyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: HealthcareBoundaryService,
  ) {}

  async fileAdverseEventReport(input: {
    reportReference: string;
    patientReferenceId?: string;
    narrativeSummary?: string;
    severityCode?: string;
    seriousnessCode?: string;
  }) {
    this.boundary.assertReportDoesNotAutoEstablishCausality({
      causalityEstablished: false,
      causalityAssessmentStatus: AdverseEventCausalityStatus.NOT_ASSESSED,
    });

    return this.prisma.adverseEventReport.create({
      data: {
        reportReference: input.reportReference,
        patientReferenceId: input.patientReferenceId,
        narrativeSummary: input.narrativeSummary,
        severityCode: input.severityCode,
        seriousnessCode: input.seriousnessCode,
        status: AdverseEventReportStatus.REPORTED,
        causalityEstablished: false,
        causalityAssessmentStatus: AdverseEventCausalityStatus.NOT_ASSESSED,
        aiAssistedTriageOnly: true,
      },
    });
  }

  async recordProfessionalCausalityAssessment(
    actor: ActorContext,
    input: {
      reportId: string;
      causalityStatus: AdverseEventCausalityStatus;
      assessmentSummary?: string;
      assessorIsAi?: boolean;
    },
  ) {
    this.boundary.assertAiCannotEstablishAdverseEventCausality(
      actor.identityType,
      'ESTABLISH_ADVERSE_EVENT_CAUSALITY',
    );
    this.boundary.assertAssessorCannotBeAi(input.assessorIsAi ?? false);

    const assessment = await this.prisma.adverseEventAssessment.create({
      data: {
        reportId: input.reportId,
        assessorIdentityId: actor.identityId,
        causalityStatus: input.causalityStatus,
        assessmentSummary: input.assessmentSummary,
        assessorIsAi: false,
      },
    });

    const causalityEstablished =
      input.causalityStatus === AdverseEventCausalityStatus.CONFIRMED ||
      input.causalityStatus === AdverseEventCausalityStatus.PROBABLE;

    await this.prisma.adverseEventReport.update({
      where: { id: input.reportId },
      data: {
        causalityAssessmentStatus: input.causalityStatus,
        causalityEstablished,
      },
    });

    return assessment;
  }

  assertCannotSilentlyDeleteSafetyRecord(): void {
    this.boundary.assertSafetyRecordCannotBeSilentlyDeleted('delete');
  }

  assertAiActorType(actor: ActorContext): boolean {
    return actor.identityType === IdentityType.SERVICE;
  }
}

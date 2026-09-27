import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  HealthcareAccessDecision,
  HealthcareDataAccessPurpose,
  type HealthDataRecordSensitivityClassification,
} from '@prisma/client';

import { type ActorContext } from '../../identity/auth/context/actor-context.types';
import {
  type HealthcareAccessEvaluationContext,
  HealthcareDataAccessPolicyService,
} from '../privacy/healthcare-data-access-policy.service';
import { TreatmentPatientDataAccessPolicyService } from '../treatment/access/healthcare-data-access-policy.service';
import {
  type HealthcareDataAccessRequest,
  HealthcareFoundationAccessPolicyService,
} from './healthcare-data-access-policy.service';

export type HealthcareAccessRoute = 'FOUNDATION' | 'PRIVACY_REGISTRY' | 'TREATMENT_PROGRAM';

export interface HealthcareUnifiedAccessRequest {
  route: HealthcareAccessRoute;
  actor: ActorContext;
  foundation?: HealthcareDataAccessRequest;
  privacy?: HealthcareAccessEvaluationContext;
  treatment?: {
    patientSubjectIdentityId: string;
    organizationId?: string | null;
    requestedScope: Parameters<
      TreatmentPatientDataAccessPolicyService['assertProviderMayAccessPatient']
    >[0]['requestedScope'];
  };
}

@Injectable()
export class HealthcareCanonicalAccessPolicyService {
  constructor(
    private readonly foundationPolicy: HealthcareFoundationAccessPolicyService,
    private readonly privacyPolicy: HealthcareDataAccessPolicyService,
    private readonly treatmentPolicy: TreatmentPatientDataAccessPolicyService,
  ) {}

  async assertUnifiedAccess(request: HealthcareUnifiedAccessRequest): Promise<void> {
    switch (request.route) {
      case 'FOUNDATION': {
        if (!request.foundation) {
          throw new ForbiddenException('Foundation healthcare access request is required');
        }
        await this.foundationPolicy.assertMayAccessHealthcareData(
          request.actor,
          request.foundation,
        );
        return;
      }
      case 'PRIVACY_REGISTRY': {
        if (!request.privacy) {
          throw new ForbiddenException('Privacy registry access evaluation context is required');
        }
        const result = this.privacyPolicy.evaluateAccess(request.privacy);
        if (result.decision !== HealthcareAccessDecision.ALLOW) {
          throw new ForbiddenException(result.reasonCode ?? 'Healthcare access denied');
        }
        return;
      }
      case 'TREATMENT_PROGRAM': {
        if (!request.treatment) {
          throw new ForbiddenException('Treatment program access context is required');
        }
        await this.treatmentPolicy.assertProviderMayAccessPatient({
          actorIdentityId: request.actor.identityId,
          patientSubjectIdentityId: request.treatment.patientSubjectIdentityId,
          organizationId: request.treatment.organizationId,
          requestedScope: request.treatment.requestedScope,
        });
        return;
      }
      default:
        throw new ForbiddenException(
          `Unsupported healthcare access route: ${String(request.route)}`,
        );
    }
  }

  /** Ensures privacy and foundation paths agree for patient-self reads. */
  evaluatePrivacyDecision(context: HealthcareAccessEvaluationContext): HealthcareAccessDecision {
    return this.privacyPolicy.evaluateAccess(context).decision;
  }

  normalizeFoundationClassification(
    classification: HealthDataRecordSensitivityClassification,
  ): HealthDataRecordSensitivityClassification {
    return classification;
  }

  normalizePrivacyPurpose(purpose: HealthcareDataAccessPurpose): HealthcareDataAccessPurpose {
    return purpose;
  }

  async assertMayAccessHealthcareData(
    actor: ActorContext,
    request: HealthcareDataAccessRequest,
  ): Promise<void> {
    await this.assertUnifiedAccess({
      route: 'FOUNDATION',
      actor,
      foundation: request,
    });
  }

  resolveActorPersona(actor: ActorContext) {
    return this.foundationPolicy.resolveActorPersona(actor);
  }
}

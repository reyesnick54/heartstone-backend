import { Injectable } from '@nestjs/common';

import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { DEPARTMENT_AUTHORITY_DISCLAIMER } from '../department-experience.constants';
import { DepartmentMeResponseDto } from '../dto/department-me-response.dto';
import { DepartmentAccessService } from './department-access.service';

@Injectable()
export class DepartmentMeService {
  constructor(private readonly accessService: DepartmentAccessService) {}

  async buildMeResponse(actor: ActorContext): Promise<DepartmentMeResponseDto> {
    this.accessService.assertActorEligible(actor);

    const departments = await this.accessService.listAccessibleDepartments(actor);

    return {
      identityId: actor.identityId,
      assuranceLevel: actor.assuranceLevel,
      activeAppointments: actor.activeAppointments.map((appointment) => ({
        appointmentId: appointment.appointmentId,
        officeId: appointment.officeId,
        departmentId: appointment.departmentId,
        institutionId: appointment.institutionId,
        status: appointment.status,
        effectiveFrom: appointment.effectiveFrom.toISOString(),
        effectiveUntil: appointment.effectiveUntil?.toISOString() ?? null,
      })),
      departments,
      hasUniversalAuthority: false,
      dashboardVisibilityDoesNotCreateAuthority: true,
      authorityDisclaimer: DEPARTMENT_AUTHORITY_DISCLAIMER,
    };
  }
}

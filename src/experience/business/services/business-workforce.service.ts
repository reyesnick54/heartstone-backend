import { Injectable, NotFoundException } from '@nestjs/common';
import {
  EmployerRegistryStatus,
  EmploymentRelationshipStatus,
  WorkPermitApplicationProfileStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import { LabourExperienceBoundaryService } from '../../../labour/experience/labour-experience-boundary.service';
import { LabourScopeService } from '../../../labour/experience/services/labour-scope.service';
import { BusinessAccessService } from '../../common/business-access.service';

@Injectable()
export class BusinessWorkforceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: BusinessAccessService,
    private readonly scope: LabourScopeService,
    private readonly boundary: LabourExperienceBoundaryService,
  ) {}

  private async requireEmployer(identityId: string, organizationId: string) {
    await this.access.assertOrganizationAccess(organizationId, identityId);
    const employer = await this.scope.findEmployerRegistryRecord(organizationId);
    if (!employer) {
      throw new NotFoundException('No employer registry record exists for this organization');
    }
    return employer;
  }

  async getHome(identityId: string, organizationId: string) {
    const employer = await this.requireEmployer(identityId, organizationId);
    const employees = await this.prisma.employmentRelationship.count({
      where: {
        employerRegistryRecordId: employer.id,
        status: EmploymentRelationshipStatus.ACTIVE,
      },
    });

    return {
      organizationId,
      employerRegistryRecordId: employer.id,
      registrationStatus: employer.registrationStatus,
      ruleEnvironment: this.boundary.ruleEnvironment,
      disclaimer: this.boundary.rulesDisclaimer,
      activeEmployees: employees,
    };
  }

  async listEmployees(identityId: string, organizationId: string) {
    const employer = await this.requireEmployer(identityId, organizationId);
    return this.prisma.employmentRelationship.findMany({
      where: { employerRegistryRecordId: employer.id },
      include: { workerProfileReference: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listWorkPermits(identityId: string, organizationId: string) {
    const employer = await this.requireEmployer(identityId, organizationId);
    return this.prisma.workPermitRecord.findMany({
      where: { employerRegistryRecordId: employer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listDeclarations(identityId: string, organizationId: string) {
    const employer = await this.requireEmployer(identityId, organizationId);
    return this.prisma.employerWorkforceDeclaration.findMany({
      where: { employerRegistryRecordId: employer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listCompliance(identityId: string, organizationId: string) {
    const employer = await this.requireEmployer(identityId, organizationId);
    return this.prisma.labourComplianceMatterReference.findMany({
      where: { employerRegistryRecordId: employer.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listActions(identityId: string, organizationId: string) {
    const employer = await this.requireEmployer(identityId, organizationId);
    const [undeclaredWorkforce, pendingPermits, openInspections] = await Promise.all([
      this.prisma.employerWorkforceDeclaration.count({
        where: {
          employerRegistryRecordId: employer.id,
          declaredAt: null,
        },
      }),
      this.prisma.workPermitApplicationProfile.count({
        where: {
          workerProfileReference: {
            employmentRelationships: {
              some: { employerRegistryRecordId: employer.id },
            },
          },
          status: {
            in: [
              WorkPermitApplicationProfileStatus.LINKED,
              WorkPermitApplicationProfileStatus.ACTIVE,
            ],
          },
        },
      }),
      this.prisma.labourInspectionReference.count({
        where: {
          employerRegistryRecordId: employer.id,
          isFinalEnforcementDecision: false,
        },
      }),
    ]);

    const items = [];
    if (
      employer.registrationStatus === EmployerRegistryStatus.REGISTERED &&
      undeclaredWorkforce === 0
    ) {
      items.push({
        actionKey: 'submit_workforce_declaration',
        label: 'Submit workforce declaration',
        available: true,
        configuredObligation: false,
      });
    }
    if (pendingPermits > 0) {
      items.push({
        actionKey: 'respond_to_rfi',
        label: 'Respond to request for information',
        available: true,
        configuredObligation: true,
      });
    }
    if (openInspections > 0) {
      items.push({
        actionKey: 'respond_labour_inspection',
        label: 'Respond to labour inspection',
        available: true,
        configuredObligation: true,
      });
    }
    items.push({
      actionKey: 'apply_work_permit',
      label: 'Apply for work permit',
      available: employer.registrationStatus === EmployerRegistryStatus.REGISTERED,
      configuredObligation: false,
    });

    return {
      disclaimer: this.boundary.rulesDisclaimer,
      items,
    };
  }
}

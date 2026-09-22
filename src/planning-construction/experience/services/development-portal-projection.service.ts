import { Injectable } from '@nestjs/common';
import {
  DevelopmentApplicationStatus,
  DevelopmentFeeStatus,
  DevelopmentInspectionStatus,
  DevelopmentOccupancyCertificateStatus,
  DevelopmentPlanningAppealStatus,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma.service';
import {
  PLANNING_BOUNDARY_DISCLAIMER,
  PLANNING_CONSTRUCTION_RULE_ENVIRONMENT,
} from '../../planning-construction.constants';

@Injectable()
export class DevelopmentPortalProjectionService {
  constructor(private readonly prisma: PrismaService) {}

  async buildProjectPortalView(developmentProjectId: string) {
    const project = await this.prisma.developmentProject.findUnique({
      where: { id: developmentProjectId },
      include: {
        site: true,
        applications: { orderBy: { submittedAt: 'desc' } },
        permits: { include: { currentVersion: true }, orderBy: { createdAt: 'desc' } },
        inspections: { orderBy: { scheduledAt: 'asc' } },
        correctiveActions: { orderBy: { createdAt: 'desc' } },
        externalDependencies: { orderBy: { createdAt: 'asc' } },
        professionals: { include: { identity: { select: { id: true } } } },
        fees: { orderBy: { createdAt: 'asc' } },
        occupancyCertificates: { orderBy: { createdAt: 'desc' } },
        appeals: { orderBy: { filedAt: 'desc' } },
      },
    });

    if (!project) {
      return null;
    }

    const evidenceOutstanding = await this.prisma.developmentExternalDependency.count({
      where: {
        developmentProjectId,
        status: { not: 'RESOLVED' },
      },
    });

    const outstandingFees = project.fees.filter(
      (fee) => fee.status === DevelopmentFeeStatus.OUTSTANDING,
    );

    const upcomingAppointments = project.organizationId
      ? await this.prisma.serviceAppointment.findMany({
          where: {
            organizationId: project.organizationId,
            scheduledStartsAt: { gte: new Date() },
          },
          orderBy: { scheduledStartsAt: 'asc' },
          take: 5,
        })
      : [];

    const latestOccupancy = project.occupancyCertificates[0];

    return {
      disclaimer: PLANNING_BOUNDARY_DISCLAIMER,
      ruleEnvironment: PLANNING_CONSTRUCTION_RULE_ENVIRONMENT,
      project: {
        id: project.id,
        projectReference: project.projectReference,
        title: project.title,
        status: project.status,
      },
      propertySite: project.site,
      submittedApplications: project.applications.filter(
        (application) => application.status !== DevelopmentApplicationStatus.DRAFT,
      ),
      permits: project.permits,
      permitStatusSummary: project.permits.map((permit) => ({
        permitId: permit.id,
        permitNumber: permit.permitNumber,
        status: permit.status,
        currentVersionNumber: permit.currentVersion?.versionNumber ?? null,
      })),
      evidenceOutstandingCount: evidenceOutstanding,
      professionals: project.professionals.map((professional) => ({
        professionalId: professional.id,
        identityId: professional.identityId,
        role: professional.role,
        registrationReference: professional.registrationReference,
      })),
      externalDependencies: project.externalDependencies,
      inspections: project.inspections,
      correctiveActions: project.correctiveActions,
      outstandingFees,
      upcomingAppointments: upcomingAppointments.map((appointment) => ({
        appointmentId: appointment.id,
        scheduledStartAt: appointment.scheduledStartsAt?.toISOString() ?? null,
        status: appointment.status,
      })),
      completionOccupancyStatus: {
        latestCertificateStatus:
          latestOccupancy?.status ?? DevelopmentOccupancyCertificateStatus.REQUESTED,
        certificates: project.occupancyCertificates,
      },
      appeals: project.appeals.filter(
        (appeal) => appeal.status !== DevelopmentPlanningAppealStatus.WITHDRAWN,
      ),
      deadlines: project.applications
        .filter((application) => application.status === DevelopmentApplicationStatus.UNDER_REVIEW)
        .map((application) => ({
          applicationReference: application.applicationReference,
          submittedAt: application.submittedAt?.toISOString() ?? null,
          indicativeReviewDeadline: application.submittedAt
            ? new Date(application.submittedAt.getTime() + 30 * 86400000).toISOString()
            : null,
        })),
      openInspections: project.inspections.filter(
        (inspection) => inspection.status === DevelopmentInspectionStatus.SCHEDULED,
      ).length,
    };
  }
}

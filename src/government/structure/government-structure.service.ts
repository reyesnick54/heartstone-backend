import { Injectable, NotFoundException } from '@nestjs/common';
import { Appointment, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { isAppointmentCurrent } from '../common/appointment-current.util';
import {
  InstitutionStructureDto,
  JurisdictionStructureDto,
  StructureAppointmentDto,
  StructureOfficeholderDto,
} from './dto/government-structure.dto';

const institutionStructureInclude = {
  governmentBodies: {
    orderBy: [{ name: 'asc' as const }, { code: 'asc' as const }],
  },
  departments: {
    orderBy: [{ name: 'asc' as const }, { code: 'asc' as const }],
    include: {
      offices: {
        orderBy: [{ name: 'asc' as const }, { code: 'asc' as const }],
        include: {
          appointments: {
            orderBy: [{ effectiveFrom: 'desc' as const }, { createdAt: 'desc' as const }],
            include: {
              officeholder: true,
            },
          },
        },
      },
    },
  },
  externalAuthorityRelations: {
    orderBy: [{ createdAt: 'asc' as const }],
    include: {
      externalAuthority: true,
    },
  },
} satisfies Prisma.InstitutionInclude;

type InstitutionWithStructure = Prisma.InstitutionGetPayload<{
  include: typeof institutionStructureInclude;
}>;

@Injectable()
export class GovernmentStructureService {
  constructor(private readonly prisma: PrismaService) {}

  async getJurisdictionStructure(jurisdictionId: string): Promise<JurisdictionStructureDto> {
    const jurisdiction = await this.prisma.jurisdiction.findUnique({
      where: { id: jurisdictionId },
      include: {
        institutions: {
          orderBy: [{ name: 'asc' }, { code: 'asc' }],
          include: institutionStructureInclude,
        },
      },
    });

    if (!jurisdiction) {
      throw new NotFoundException(`Jurisdiction with id "${jurisdictionId}" was not found`);
    }

    const now = new Date();

    return {
      jurisdiction: {
        id: jurisdiction.id,
        code: jurisdiction.code,
        name: jurisdiction.name,
        type: jurisdiction.type,
        status: jurisdiction.status,
      },
      institutions: jurisdiction.institutions.map((institution) =>
        this.mapInstitutionStructure(institution, now),
      ),
    };
  }

  async getInstitutionStructure(institutionId: string): Promise<InstitutionStructureDto> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      include: institutionStructureInclude,
    });

    if (!institution) {
      throw new NotFoundException(`Institution with id "${institutionId}" was not found`);
    }

    const now = new Date();

    return this.mapInstitutionStructure(institution, now);
  }

  private mapInstitutionStructure(
    institution: InstitutionWithStructure,
    now: Date,
  ): InstitutionStructureDto {
    return {
      id: institution.id,
      jurisdictionId: institution.jurisdictionId,
      code: institution.code,
      name: institution.name,
      type: institution.type,
      status: institution.status,
      governmentBodies: institution.governmentBodies.map((body) => ({
        id: body.id,
        code: body.code,
        name: body.name,
        type: body.type,
        status: body.status,
      })),
      departments: institution.departments.map((department) => ({
        id: department.id,
        code: department.code,
        name: department.name,
        status: department.status,
        offices: department.offices.map((office) => ({
          id: office.id,
          code: office.code,
          name: office.name,
          status: office.status,
          currentAppointment: this.resolveCurrentAppointment(office.appointments, now),
        })),
      })),
      externalAuthorities: institution.externalAuthorityRelations.map((relation) => ({
        id: relation.externalAuthority.id,
        code: relation.externalAuthority.code,
        name: relation.externalAuthority.name,
        type: relation.externalAuthority.type,
        status: relation.status,
        relationshipLabel: relation.relationshipLabel,
        effectiveFrom: relation.effectiveFrom,
        effectiveUntil: relation.effectiveUntil,
      })),
    };
  }

  private resolveCurrentAppointment(
    appointments: (Appointment & {
      officeholder?: {
        id: string;
        code: string;
        name: string;
        status: StructureOfficeholderDto['status'];
      };
    })[],
    now: Date,
  ): StructureAppointmentDto | null {
    const current = appointments.find((appointment) => isAppointmentCurrent(appointment, now));

    if (!current) {
      return null;
    }

    const officeholder = current.officeholder;

    return {
      id: current.id,
      status: current.status,
      effectiveFrom: current.effectiveFrom,
      effectiveUntil: current.effectiveUntil,
      officeholder: officeholder
        ? {
            id: officeholder.id,
            code: officeholder.code,
            name: officeholder.name,
            status: officeholder.status,
          }
        : null,
    };
  }
}

export type { InstitutionStructureDto as InstitutionStructureResponse };

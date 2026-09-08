import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class GovernmentStructureValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureJurisdictionExists(jurisdictionId: string): Promise<void> {
    const jurisdiction = await this.prisma.jurisdiction.findUnique({
      where: { id: jurisdictionId },
      select: { id: true },
    });

    if (!jurisdiction) {
      throw new NotFoundException(`Jurisdiction with id "${jurisdictionId}" was not found`);
    }
  }

  async ensureInstitutionExists(institutionId: string): Promise<void> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with id "${institutionId}" was not found`);
    }
  }

  async ensureInstitutionBelongsToJurisdiction(
    institutionId: string,
    jurisdictionId: string,
  ): Promise<void> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true, jurisdictionId: true },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with id "${institutionId}" was not found`);
    }

    if (institution.jurisdictionId !== jurisdictionId) {
      throw new BadRequestException(
        `Institution "${institutionId}" does not belong to jurisdiction "${jurisdictionId}"`,
      );
    }
  }

  async ensureDepartmentBelongsToInstitution(
    departmentId: string,
    institutionId: string,
  ): Promise<void> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, institutionId: true },
    });

    if (!department) {
      throw new NotFoundException(`Department with id "${departmentId}" was not found`);
    }

    if (department.institutionId !== institutionId) {
      throw new BadRequestException(
        `Department "${departmentId}" does not belong to institution "${institutionId}"`,
      );
    }
  }

  async ensureOfficeBelongsToInstitution(officeId: string, institutionId: string): Promise<void> {
    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
      select: {
        id: true,
        department: {
          select: { institutionId: true },
        },
      },
    });

    if (!office) {
      throw new NotFoundException(`Office with id "${officeId}" was not found`);
    }

    if (office.department.institutionId !== institutionId) {
      throw new BadRequestException(
        `Office "${officeId}" does not belong to institution "${institutionId}"`,
      );
    }
  }

  async ensureDepartmentExists(departmentId: string): Promise<void> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });

    if (!department) {
      throw new NotFoundException(`Department with id "${departmentId}" was not found`);
    }
  }

  async ensureOfficeExists(officeId: string): Promise<void> {
    const office = await this.prisma.office.findUnique({
      where: { id: officeId },
      select: { id: true },
    });

    if (!office) {
      throw new NotFoundException(`Office with id "${officeId}" was not found`);
    }
  }

  async ensureOfficeholderExists(officeholderId: string): Promise<void> {
    const officeholder = await this.prisma.officeholder.findUnique({
      where: { id: officeholderId },
      select: { id: true },
    });

    if (!officeholder) {
      throw new NotFoundException(`Officeholder with id "${officeholderId}" was not found`);
    }
  }

  async ensureExternalAuthorityExists(externalAuthorityId: string): Promise<void> {
    const externalAuthority = await this.prisma.externalAuthority.findUnique({
      where: { id: externalAuthorityId },
      select: { id: true },
    });

    if (!externalAuthority) {
      throw new NotFoundException(
        `External authority with id "${externalAuthorityId}" was not found`,
      );
    }
  }

  validateDelegationParties(input: {
    delegatorOfficeId?: string;
    delegatorOfficeholderId?: string;
    recipientOfficeId?: string;
    recipientOfficeholderId?: string;
  }): void {
    const hasDelegator = Boolean(input.delegatorOfficeId ?? input.delegatorOfficeholderId);
    const hasRecipient = Boolean(input.recipientOfficeId ?? input.recipientOfficeholderId);

    if (!hasDelegator) {
      throw new BadRequestException('Delegation must identify a delegator office or officeholder');
    }

    if (!hasRecipient) {
      throw new BadRequestException('Delegation must identify a recipient office or officeholder');
    }
  }

  async validateDelegationStructuralIntegrity(input: {
    institutionId: string;
    delegatorOfficeId?: string;
    delegatorOfficeholderId?: string;
    recipientOfficeId?: string;
    recipientOfficeholderId?: string;
  }): Promise<void> {
    this.validateDelegationParties(input);
    await this.ensureInstitutionExists(input.institutionId);

    if (input.delegatorOfficeId) {
      await this.ensureOfficeBelongsToInstitution(input.delegatorOfficeId, input.institutionId);
    }

    if (input.recipientOfficeId) {
      await this.ensureOfficeBelongsToInstitution(input.recipientOfficeId, input.institutionId);
    }
  }

  validateEffectivePeriod(effectiveFrom: Date, effectiveUntil?: Date | null): void {
    if (
      effectiveUntil !== undefined &&
      effectiveUntil !== null &&
      effectiveUntil <= effectiveFrom
    ) {
      throw new BadRequestException('effectiveUntil must be after effectiveFrom');
    }
  }
}

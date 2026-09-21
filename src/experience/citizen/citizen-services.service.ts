import { Injectable, UnprocessableEntityException } from '@nestjs/common';

import { ApplicationsService } from '../../application-processing/applications/applications.service';
import { CreateApplicationDto } from '../../application-processing/applications/dto/create-application.dto';
import {
  type PublicEligibilityResult,
  type PublicServiceDetail,
  type PublicServiceSummary,
  type ServiceStartPackage,
} from '../../service-catalog/common/public-service.mapper';
import { FormRenderService } from '../../service-catalog/forms/form-render.service';
import {
  type FormDeclarationOptions,
  type RenderedFormSchema,
} from '../../service-catalog/forms/types/form-engine.types';
import { MatchPublicServicesDto } from '../../service-catalog/public/dto/match-public-services.dto';
import { PublicServiceEligibilityDto } from '../../service-catalog/public/dto/public-service-eligibility.dto';
import { QueryPublicServicesDto } from '../../service-catalog/public/dto/query-public-services.dto';
import { QueryServiceStartPackageDto } from '../../service-catalog/public/dto/query-service-start-package.dto';
import { PublicServiceDiscoveryService } from '../../service-catalog/public/public-service-discovery.service';
import { CreateCitizenApplicationDto } from './dto/create-citizen-application.dto';

export interface CitizenStartExperience extends Omit<ServiceStartPackage, 'formSchema'> {
  formSchema: RenderedFormSchema | null;
  requiredFields: string[];
  declarations: FormDeclarationOptions[];
  expectedNextStep: string;
}

const CITIZEN_START_NEXT_STEP =
  'Review the checklist and required documents, complete the application form, then submit your draft application for official intake.';

@Injectable()
export class CitizenServicesService {
  constructor(
    private readonly publicServiceDiscoveryService: PublicServiceDiscoveryService,
    private readonly formRenderService: FormRenderService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  listServices(query: QueryPublicServicesDto): Promise<{
    items: PublicServiceSummary[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> {
    return this.publicServiceDiscoveryService.listServices(query);
  }

  matchServices(dto: MatchPublicServicesDto): Promise<PublicServiceSummary[]> {
    return this.publicServiceDiscoveryService.matchServices(dto);
  }

  getServiceBySlug(slug: string): Promise<PublicServiceDetail> {
    return this.publicServiceDiscoveryService.getServiceBySlug(slug);
  }

  evaluateEligibility(
    slug: string,
    dto: PublicServiceEligibilityDto,
  ): Promise<PublicEligibilityResult> {
    return this.publicServiceDiscoveryService.evaluateEligibility(slug, dto);
  }

  async getStartExperience(
    slug: string,
    query: QueryServiceStartPackageDto,
  ): Promise<CitizenStartExperience> {
    const startPackage = await this.publicServiceDiscoveryService.getStartPackage(slug, query);
    const formSchema = startPackage.formVersionId
      ? await this.formRenderService.renderFormSchema(startPackage.formVersionId)
      : null;

    return {
      ...startPackage,
      formSchema,
      requiredFields: extractRequiredFields(formSchema),
      declarations: extractDeclarations(formSchema),
      expectedNextStep: CITIZEN_START_NEXT_STEP,
    };
  }

  async createApplication(
    slug: string,
    applicantIdentityId: string,
    dto: CreateCitizenApplicationDto,
  ) {
    const startPackage = await this.publicServiceDiscoveryService.getStartPackage(slug, {
      serviceVersionId: dto.serviceVersionId,
      configurationFingerprint: dto.configurationFingerprint,
    });

    if (!startPackage.formDefinitionId || !startPackage.formVersionId) {
      throw new UnprocessableEntityException(
        'Service start package is missing required form configuration',
      );
    }

    const createDto: CreateApplicationDto = {
      governmentServiceVersionId: startPackage.serviceVersionId,
      formDefinitionId: startPackage.formDefinitionId,
      formVersionId: startPackage.formVersionId,
      configurationFingerprint: startPackage.configurationFingerprint,
      applicantCategory: dto.applicantCategory,
      organizationId: dto.organizationId,
      representativeAuthorityId: dto.representativeAuthorityId,
      draftAnswers: dto.draftAnswers,
    };

    return this.applicationsService.createDraft(applicantIdentityId, createDto);
  }
}

function extractRequiredFields(formSchema: RenderedFormSchema | null): string[] {
  if (!formSchema) {
    return [];
  }

  return formSchema.sections.flatMap((section) =>
    section.fields.filter((field) => field.required).map((field) => field.fieldKey),
  );
}

function extractDeclarations(formSchema: RenderedFormSchema | null): FormDeclarationOptions[] {
  if (!formSchema) {
    return [];
  }

  return formSchema.sections.flatMap((section) =>
    section.fields.flatMap((field) => (field.declaration ? [field.declaration] : [])),
  );
}

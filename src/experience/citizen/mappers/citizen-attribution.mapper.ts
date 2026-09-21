import { type InstitutionAttributionDto } from '../../common/dto/institution-attribution.dto';

interface ServiceAttributionSource {
  governmentService: {
    id: string;
    slug: string;
    publicName: string;
    responsibleInstitution: {
      id: string;
      code: string;
      name: string;
    };
    responsibleDepartment?: {
      id: string;
      name: string;
    } | null;
  };
}

export function mapInstitutionAttribution(
  source: ServiceAttributionSource,
): InstitutionAttributionDto {
  return {
    institutionId: source.governmentService.responsibleInstitution.id,
    institutionCode: source.governmentService.responsibleInstitution.code,
    institutionName: source.governmentService.responsibleInstitution.name,
    departmentId: source.governmentService.responsibleDepartment?.id,
    departmentName: source.governmentService.responsibleDepartment?.name,
    serviceId: source.governmentService.id,
    serviceSlug: source.governmentService.slug,
    serviceName: source.governmentService.publicName,
  };
}

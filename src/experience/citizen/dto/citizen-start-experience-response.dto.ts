import { ApiProperty, OmitType } from '@nestjs/swagger';

import {
  FormDeclarationOptionsDto,
  RenderedFormSchemaDto,
} from '../../../service-catalog/forms/dto/rendered-form-schema.dto';
import { ServiceStartPackageResponseDto } from '../../../service-catalog/public/dto/public-service-response.dto';

/** Mirrors `CitizenStartExperience` in ../citizen-services.service.ts. */
export class CitizenStartExperienceResponseDto extends OmitType(ServiceStartPackageResponseDto, [
  'formSchema',
] as const) {
  @ApiProperty({ type: () => RenderedFormSchemaDto, nullable: true })
  formSchema!: RenderedFormSchemaDto | null;

  @ApiProperty({ type: [String] })
  requiredFields!: string[];

  @ApiProperty({ type: () => [FormDeclarationOptionsDto] })
  declarations!: FormDeclarationOptionsDto[];

  @ApiProperty()
  expectedNextStep!: string;
}

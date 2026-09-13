import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssessMasterFileCompletenessDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  requiredRequirementCodes!: string[];
}

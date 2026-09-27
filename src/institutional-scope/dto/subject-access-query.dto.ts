import { IsOptional, IsUUID } from 'class-validator';

/** Optional representative authority for subject-bound reads (never a substitute for session identity). */
export class SubjectAccessQueryDto {
  @IsOptional()
  @IsUUID()
  representativeAuthorityId?: string;
}

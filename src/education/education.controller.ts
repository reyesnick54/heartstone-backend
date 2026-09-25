import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SubjectAccessQueryDto } from '../institutional-scope/dto/subject-access-query.dto';
import { EducationAdmissionApplicationProfileService } from './admissions/education-admission-application-profile.service';
import { EducationInstitutionService } from './institutions/education-institution.service';
import { ScholarshipApplicationProfileService } from './scholarships/scholarship-application-profile.service';
import { StudentEducationProfileService } from './students/student-education-profile.service';

@ApiTags('education')
@Controller('api/v1/education')
export class EducationController {
  constructor(
    private readonly institutionService: EducationInstitutionService,
    private readonly studentProfileService: StudentEducationProfileService,
    private readonly admissionApplicationProfileService: EducationAdmissionApplicationProfileService,
    private readonly scholarshipApplicationProfileService: ScholarshipApplicationProfileService,
  ) {}

  @Post('institutions')
  @ApiOkResponse({ description: 'Education institution registered' })
  registerInstitution(
    @Body() body: Parameters<EducationInstitutionService['registerInstitution']>[0],
  ) {
    return this.institutionService.registerInstitution(body);
  }

  @Post('institutions/registrations')
  submitInstitutionRegistration(
    @Body() body: Parameters<EducationInstitutionService['submitRegistration']>[0],
  ) {
    return this.institutionService.submitRegistration(body);
  }

  @Post('students/profiles')
  createStudentProfile(
    @Body() body: Parameters<StudentEducationProfileService['createStudentEducationProfile']>[0],
  ) {
    return this.studentProfileService.createStudentEducationProfile(body);
  }

  @Get('students/profiles/:id')
  getStudentProfile(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: SubjectAccessQueryDto,
  ) {
    return this.studentProfileService.getStudentProfileForSubject(session, id, query);
  }

  @Post('admission-application-profiles')
  linkAdmissionApplicationProfile(
    @Body()
    body: Parameters<
      EducationAdmissionApplicationProfileService['linkAdmissionApplicationProfile']
    >[0],
  ) {
    return this.admissionApplicationProfileService.linkAdmissionApplicationProfile(body);
  }

  @Post('scholarship-application-profiles')
  linkScholarshipApplicationProfile(
    @Body()
    body: Parameters<ScholarshipApplicationProfileService['linkScholarshipApplicationProfile']>[0],
  ) {
    return this.scholarshipApplicationProfileService.linkScholarshipApplicationProfile(body);
  }
}

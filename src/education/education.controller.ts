import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { EducationAdmissionApplicationProfileService } from './admissions/education-admission-application-profile.service';
import { EducationInstitutionService } from './institutions/education-institution.service';
import { ScholarshipApplicationProfileService } from './scholarships/scholarship-application-profile.service';
import { StudentEducationProfileService } from './students/student-education-profile.service';

@ApiTags('education')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
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
    @Param('id', ParseUUIDPipe) id: string,
    @Query('requesterIdentityId', ParseUUIDPipe) requesterIdentityId: string,
  ) {
    return this.studentProfileService.getStudentProfileForSubject(id, requesterIdentityId);
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

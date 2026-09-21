import { type INestApplication } from '@nestjs/common';
import {
  AppointmentStatus,
  DelegationStatus,
  ExternalAuthorityType,
  GovernmentBodyType,
  InstitutionType,
  JurisdictionType,
  StructuralLifecycleStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import {
  asAppointmentBody,
  asDelegationBody,
  asDepartmentBody,
  asExternalAuthorityBody,
  asGovernmentBody,
  asInstitutionBody,
  asInstitutionStructureBody,
  asJurisdictionBody,
  asJurisdictionStructureBody,
  asOfficeBody,
  asOfficeholderBody,
} from './helpers/government-test-types';
import {
  authHeader,
  provisionIntegrationAdminSession,
} from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetGovernmentData } from './helpers/integration-app';

describe('Government cross-entity structure integrity (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminSessionToken: string;

  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
    const admin = await provisionIntegrationAdminSession(app, prisma);
    adminSessionToken = admin.sessionToken;
  });

  beforeEach(async () => {
    await resetGovernmentData(prisma);
  });

  function authed() {
    return request(app.getHttpServer()).set(authHeader(adminSessionToken));
  }

  afterAll(async () => {
    await app.close();
  });

  async function seedFullStructure() {
    const jurisdictionResponse = await authed()
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'United States Federal Government',
        type: JurisdictionType.NATIONAL,
      })
      .expect(201);

    const jurisdiction = asJurisdictionBody(jurisdictionResponse.body);

    const institutionResponse = await authed()
      .post('/api/v1/institutions')
      .send({
        jurisdictionId: jurisdiction.id,
        code: 'DOT',
        name: 'Department of Transportation',
        type: InstitutionType.AGENCY,
      })
      .expect(201);

    const institution = asInstitutionBody(institutionResponse.body);

    const governmentBodyResponse = await authed()
      .post('/api/v1/government-bodies')
      .send({
        institutionId: institution.id,
        code: 'BOARD',
        name: 'Transportation Board',
        type: GovernmentBodyType.GOVERNING,
      })
      .expect(201);

    const departmentResponse = await authed()
      .post('/api/v1/departments')
      .send({
        institutionId: institution.id,
        code: 'OPS',
        name: 'Operations',
      })
      .expect(201);

    const department = asDepartmentBody(departmentResponse.body);

    const officeResponse = await authed()
      .post('/api/v1/offices')
      .send({
        departmentId: department.id,
        code: 'SEC',
        name: 'Secretary',
      })
      .expect(201);

    const officeholderResponse = await authed()
      .post('/api/v1/officeholders')
      .send({
        code: 'OH-001',
        name: 'Jane Secretary',
      })
      .expect(201);

    const appointmentResponse = await authed()
      .post('/api/v1/appointments')
      .send({
        officeId: asOfficeBody(officeResponse.body).id,
        officeholderId: asOfficeholderBody(officeholderResponse.body).id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
        effectiveUntil: '2027-01-01T00:00:00.000Z',
      })
      .expect(201);

    return {
      jurisdiction,
      institution,
      governmentBody: asGovernmentBody(governmentBodyResponse.body),
      department,
      office: asOfficeBody(officeResponse.body),
      officeholder: asOfficeholderBody(officeholderResponse.body),
      appointment: asAppointmentBody(appointmentResponse.body),
    };
  }

  it('creates and queries a valid full government structure', async () => {
    const seeded = await seedFullStructure();

    const jurisdictionStructure = await authed()
      .get(`/api/v1/jurisdictions/${seeded.jurisdiction.id}/structure`)
      .expect(200);

    const jurisdictionStructureBody = asJurisdictionStructureBody(jurisdictionStructure.body);

    expect(jurisdictionStructureBody).toMatchObject({
      jurisdiction: {
        id: seeded.jurisdiction.id,
        code: 'US-FED',
      },
      institutions: [
        {
          id: seeded.institution.id,
          code: 'DOT',
          governmentBodies: [
            {
              id: seeded.governmentBody.id,
              code: 'BOARD',
            },
          ],
          departments: [
            {
              id: seeded.department.id,
              code: 'OPS',
              offices: [
                {
                  id: seeded.office.id,
                  code: 'SEC',
                  currentAppointment: {
                    id: seeded.appointment.id,
                    status: AppointmentStatus.ACTIVE,
                    officeholder: {
                      id: seeded.officeholder.id,
                      code: 'OH-001',
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    expect(jurisdictionStructureBody).not.toHaveProperty('authority');

    const institutionStructure = await authed()
      .get(`/api/v1/institutions/${seeded.institution.id}/structure`)
      .expect(200);

    const institutionStructureBody = asInstitutionStructureBody(institutionStructure.body);
    const currentAppointment =
      institutionStructureBody.departments[0]?.offices[0]?.currentAppointment;

    expect(currentAppointment).toMatchObject({
      id: seeded.appointment.id,
      status: AppointmentStatus.ACTIVE,
    });
  });

  it('rejects invalid parent references across the hierarchy', async () => {
    await authed()
      .post('/api/v1/institutions')
      .send({
        jurisdictionId: '99999999-9999-4999-8999-999999999999',
        code: 'DOT',
        name: 'Department of Transportation',
        type: InstitutionType.AGENCY,
      })
      .expect(404);

    const jurisdictionResponse = await authed()
      .post('/api/v1/jurisdictions')
      .send({
        code: 'US-FED',
        name: 'United States Federal Government',
        type: JurisdictionType.NATIONAL,
      })
      .expect(201);

    const institution = asInstitutionBody(
      (
        await authed()
          .post('/api/v1/institutions')
          .send({
            jurisdictionId: asJurisdictionBody(jurisdictionResponse.body).id,
            code: 'DOT',
            name: 'Department of Transportation',
            type: InstitutionType.AGENCY,
          })
          .expect(201)
      ).body,
    );

    await authed()
      .post('/api/v1/departments')
      .send({
        institutionId: '99999999-9999-4999-8999-999999999999',
        code: 'OPS',
        name: 'Operations',
      })
      .expect(404);

    await authed()
      .post('/api/v1/offices')
      .send({
        departmentId: '99999999-9999-4999-8999-999999999999',
        code: 'SEC',
        name: 'Secretary',
      })
      .expect(404);

    const department = asDepartmentBody(
      (
        await authed()
          .post('/api/v1/departments')
          .send({
            institutionId: institution.id,
            code: 'OPS',
            name: 'Operations',
          })
          .expect(201)
      ).body,
    );

    const officeholder = asOfficeholderBody(
      (
        await authed()
          .post('/api/v1/officeholders')
          .send({
            code: 'OH-001',
            name: 'Jane Secretary',
          })
          .expect(201)
      ).body,
    );

    await authed()
      .post('/api/v1/appointments')
      .send({
        officeId: '99999999-9999-4999-8999-999999999999',
        officeholderId: officeholder.id,
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(404);

    const office = asOfficeBody(
      (
        await authed()
          .post('/api/v1/offices')
          .send({
            departmentId: department.id,
            code: 'SEC',
            name: 'Secretary',
          })
          .expect(201)
      ).body,
    );

    await authed()
      .post('/api/v1/appointments')
      .send({
        officeId: office.id,
        officeholderId: '99999999-9999-4999-8999-999999999999',
        status: AppointmentStatus.ACTIVE,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(404);
  });

  it('retrieves historical and inactive records when explicitly requested', async () => {
    const seeded = await seedFullStructure();

    await authed()
      .patch(`/api/v1/appointments/${seeded.appointment.id}`)
      .send({
        status: AppointmentStatus.ENDED,
        effectiveUntil: '2026-06-01T00:00:00.000Z',
      })
      .expect(200);

    const endedAppointment = await authed()
      .get(`/api/v1/appointments/${seeded.appointment.id}`)
      .expect(200);

    expect(asAppointmentBody(endedAppointment.body)).toMatchObject({
      id: seeded.appointment.id,
      status: AppointmentStatus.ENDED,
      isCurrent: false,
    });

    await authed()
      .patch(`/api/v1/institutions/${seeded.institution.id}`)
      .send({ status: StructuralLifecycleStatus.INACTIVE })
      .expect(200);

    const inactiveInstitution = await authed()
      .get(`/api/v1/institutions/${seeded.institution.id}`)
      .expect(200);

    expect(asInstitutionBody(inactiveInstitution.body).status).toBe(
      StructuralLifecycleStatus.INACTIVE,
    );
  });

  it('calculates current appointment status using shared logic', async () => {
    const seeded = await seedFullStructure();

    const currentAppointment = await authed()
      .get(`/api/v1/appointments/${seeded.appointment.id}`)
      .expect(200);

    expect(asAppointmentBody(currentAppointment.body).isCurrent).toBe(true);

    await authed()
      .patch(`/api/v1/appointments/${seeded.appointment.id}`)
      .send({ status: AppointmentStatus.SUSPENDED })
      .expect(200);

    const suspendedAppointment = await authed()
      .get(`/api/v1/appointments/${seeded.appointment.id}`)
      .expect(200);

    expect(asAppointmentBody(suspendedAppointment.body).isCurrent).toBe(false);

    const structure = await authed()
      .get(`/api/v1/institutions/${seeded.institution.id}/structure`)
      .expect(200);

    const structureBody = asInstitutionStructureBody(structure.body);
    const officeCurrentAppointment = structureBody.departments[0]?.offices[0]?.currentAppointment;

    expect(officeCurrentAppointment).toBeNull();
  });

  it('supports government bodies, delegations, and external authority relationships', async () => {
    const seeded = await seedFullStructure();

    const externalAuthorityResponse = await authed()
      .post('/api/v1/external-authorities')
      .send({
        code: 'EPA-US',
        name: 'Environmental Protection Agency',
        type: ExternalAuthorityType.REGULATORY,
      })
      .expect(201);

    const externalAuthority = asExternalAuthorityBody(externalAuthorityResponse.body);

    await authed()
      .post('/api/v1/institution-external-authorities')
      .send({
        institutionId: seeded.institution.id,
        externalAuthorityId: externalAuthority.id,
        relationshipLabel: 'Coordination partner',
      })
      .expect(201);

    const delegationResponse = await authed()
      .post('/api/v1/delegations')
      .send({
        institutionId: seeded.institution.id,
        delegatorOfficeId: seeded.office.id,
        recipientOfficeholderId: seeded.officeholder.id,
        scopeDescription: 'Temporary signing authority',
        status: DelegationStatus.ACTIVE,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(201);

    const delegation = asDelegationBody(delegationResponse.body);
    expect(delegation.scopeDescription).toBe('Temporary signing authority');

    const structure = await authed()
      .get(`/api/v1/institutions/${seeded.institution.id}/structure`)
      .expect(200);

    expect(asInstitutionStructureBody(structure.body).externalAuthorities).toEqual([
      expect.objectContaining({
        id: externalAuthority.id,
        code: 'EPA-US',
        relationshipLabel: 'Coordination partner',
      }),
    ]);
    expect(asInstitutionStructureBody(structure.body)).not.toHaveProperty('authority');
  });

  it('rejects delegations with invalid structural relationships', async () => {
    const seeded = await seedFullStructure();

    await authed()
      .post('/api/v1/delegations')
      .send({
        institutionId: seeded.institution.id,
        scopeDescription: 'Missing parties',
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(400);

    await authed()
      .post('/api/v1/delegations')
      .send({
        institutionId: '99999999-9999-4999-8999-999999999999',
        delegatorOfficeId: seeded.office.id,
        recipientOfficeholderId: seeded.officeholder.id,
        scopeDescription: 'Invalid institution',
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(404);
  });

  it('does not expose destructive DELETE operations for material institutional records', async () => {
    const seeded = await seedFullStructure();
    const deletePaths = [
      `/api/v1/jurisdictions/${seeded.jurisdiction.id}`,
      `/api/v1/institutions/${seeded.institution.id}`,
      `/api/v1/government-bodies/${seeded.governmentBody.id}`,
      `/api/v1/departments/${seeded.department.id}`,
      `/api/v1/offices/${seeded.office.id}`,
      `/api/v1/officeholders/${seeded.officeholder.id}`,
      `/api/v1/appointments/${seeded.appointment.id}`,
    ];

    for (const path of deletePaths) {
      await authed().delete(path).expect(404);
    }
  });
});

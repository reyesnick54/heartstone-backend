import { type INestApplication } from '@nestjs/common';
import { FormFieldType, FormVersionStatus } from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../src/database/prisma.service';
import { seedFormsGovernmentServiceVersion } from './helpers/forms-test-fixtures';
import {
  asFormDefinitionBody,
  asFormReconstructBody,
  asFormSchemaBody,
  asFormValidationResultBody,
  asFormVersionBody,
} from './helpers/forms-test-types';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Forms engine (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  beforeAll(async () => {
    ({ app, prisma } = await createIntegrationApp());
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedServiceCatalogFixture(): Promise<{
    serviceVersionId: string;
    formDefinitionId: string;
  }> {
    const { serviceVersionId } = await seedFormsGovernmentServiceVersion(prisma);

    const definitionResponse = await request(app.getHttpServer())
      .post('/api/v1/forms/definitions')
      .send({
        code: 'NON_PRODUCTION-business-license-form',
        name: 'Business License Application Form',
        purpose: 'Collect applicant details',
        governmentServiceVersionId: serviceVersionId,
      })
      .expect(201);

    return {
      serviceVersionId,
      formDefinitionId: asFormDefinitionBody(definitionResponse.body).id,
    };
  }

  function buildSections() {
    return [
      {
        sectionKey: 'applicant',
        title: { default: 'Applicant Details' },
        displayOrder: 1,
        fields: [
          {
            fieldKey: 'full_name',
            label: { default: 'Full Name' },
            fieldType: FormFieldType.TEXT,
            required: true,
            displayOrder: 1,
            validationDefinition: { minLength: 2, maxLength: 100 },
          },
          {
            fieldKey: 'birth_date',
            label: { default: 'Date of Birth' },
            fieldType: FormFieldType.DATE,
            required: true,
            displayOrder: 2,
            validationDefinition: { maxDate: '2010-01-01' },
          },
          {
            fieldKey: 'country',
            label: { default: 'Country' },
            fieldType: FormFieldType.SELECT,
            required: true,
            displayOrder: 3,
            options: [
              { value: 'AG', label: { default: 'Antigua and Barbuda' } },
              { value: 'US', label: { default: 'United States' } },
            ],
          },
          {
            fieldKey: 'has_partner',
            label: { default: 'Do you have a business partner?' },
            fieldType: FormFieldType.BOOLEAN,
            required: false,
            displayOrder: 4,
          },
          {
            fieldKey: 'partner_name',
            label: { default: 'Partner Name' },
            fieldType: FormFieldType.TEXT,
            required: false,
            displayOrder: 5,
            conditionalRules: [
              {
                action: 'REQUIRE',
                logic: 'AND',
                conditions: [{ fieldKey: 'has_partner', operator: 'EQUALS', value: true }],
              },
            ],
          },
          {
            fieldKey: 'declaration',
            label: { default: 'Declaration' },
            fieldType: FormFieldType.DECLARATION,
            required: true,
            displayOrder: 6,
            options: {
              declarationVersion: '1.0.0',
              declarationText: {
                en: 'I declare that the information provided is true and complete.',
              },
            },
          },
        ],
      },
    ];
  }

  it('creates form versions linked to a government service version', async () => {
    const { serviceVersionId, formDefinitionId } = await seedServiceCatalogFixture();

    const versionResponse = await request(app.getHttpServer())
      .post('/api/v1/forms/versions')
      .send({
        formDefinitionId,
        title: { default: 'Business License Application v1' },
        sections: buildSections(),
      })
      .expect(201);

    const version = asFormVersionBody(versionResponse.body);
    expect(version.version).toBe(1);
    expect(version.status).toBe(FormVersionStatus.DRAFT);

    const definition = await prisma.formDefinition.findUnique({
      where: { id: formDefinitionId },
      include: { governmentServiceVersion: true },
    });

    expect(definition?.governmentServiceVersionId).toBe(serviceVersionId);
  });

  it('enforces published version immutability and supports supersession', async () => {
    const { formDefinitionId } = await seedServiceCatalogFixture();

    const v1Response = await request(app.getHttpServer())
      .post('/api/v1/forms/versions')
      .send({
        formDefinitionId,
        title: { default: 'Business License Application v1' },
        sections: buildSections(),
      })
      .expect(201);

    const v1Id = asFormVersionBody(v1Response.body).id;

    await request(app.getHttpServer()).patch(`/api/v1/forms/versions/${v1Id}/publish`).expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/forms/versions/${v1Id}`)
      .send({ title: { default: 'Mutated title' } })
      .expect(400);

    const v2Response = await request(app.getHttpServer())
      .post(`/api/v1/forms/definitions/${formDefinitionId}/versions/next`)
      .send({
        title: { default: 'Business License Application v2' },
        sections: buildSections(),
      })
      .expect(201);
    const v2 = asFormVersionBody(v2Response.body);

    await request(app.getHttpServer()).patch(`/api/v1/forms/versions/${v2.id}/publish`).expect(200);

    const v1 = await prisma.formVersion.findUnique({ where: { id: v1Id } });
    expect(v1?.status).toBe(FormVersionStatus.SUPERSEDED);
    expect(v1?.supersededById).toBe(v2.id);
  });

  it('renders ordered sections and fields and preserves declaration version text', async () => {
    const { formDefinitionId } = await seedServiceCatalogFixture();

    const versionResponse = await request(app.getHttpServer())
      .post('/api/v1/forms/versions')
      .send({
        formDefinitionId,
        title: { default: 'Business License Application v1' },
        sections: buildSections(),
      })
      .expect(201);

    const version = asFormVersionBody(versionResponse.body);
    const schema = asFormSchemaBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/forms/versions/${version.id}/schema`)
          .expect(200)
      ).body,
    );

    const firstSection = schema.sections[0];
    if (!firstSection) {
      throw new Error('Expected at least one form section');
    }
    expect(firstSection.fields.map((field) => field.fieldKey)).toEqual([
      'full_name',
      'birth_date',
      'country',
      'has_partner',
      'partner_name',
      'declaration',
    ]);

    const declarationField = firstSection.fields.find((field) => field.fieldKey === 'declaration');
    expect(declarationField?.declaration?.declarationVersion).toBe('1.0.0');
    expect(declarationField?.declaration?.declarationText.en).toContain('true and complete');
  });

  it('validates responses statelessly without creating applications or cases', async () => {
    const { formDefinitionId } = await seedServiceCatalogFixture();

    const versionResponse = await request(app.getHttpServer())
      .post('/api/v1/forms/versions')
      .send({
        formDefinitionId,
        title: { default: 'Business License Application v1' },
        sections: buildSections(),
      })
      .expect(201);

    const versionId = asFormVersionBody(versionResponse.body).id;
    await request(app.getHttpServer())
      .patch(`/api/v1/forms/versions/${versionId}/publish`)
      .expect(200);

    const invalidResponse = await request(app.getHttpServer())
      .post('/api/v1/forms/validate-response')
      .send({
        formVersionId: versionId,
        answers: {
          has_partner: true,
          country: 'ZZ',
          unknown_field: 'value',
        },
      })
      .expect(201);

    const invalid = asFormValidationResultBody(invalidResponse.body);
    expect(invalid.outcome).toBe('INVALID');
    expect(invalid.unknownFields).toContain('unknown_field');

    const beforeCounts = await Promise.all([
      prisma.formVersion.count(),
      prisma.formDefinition.count(),
    ]);

    const validResponse = await request(app.getHttpServer())
      .post('/api/v1/forms/validate-response')
      .send({
        formVersionId: versionId,
        answers: {
          full_name: 'Jane Citizen',
          birth_date: '1990-05-01',
          country: 'AG',
          has_partner: false,
          declaration: true,
        },
      })
      .expect(201);

    const afterCounts = await Promise.all([
      prisma.formVersion.count(),
      prisma.formDefinition.count(),
    ]);

    expect(asFormValidationResultBody(validResponse.body).outcome).toBe('VALID');
    expect(beforeCounts).toEqual(afterCounts);
  });

  it('rejects circular conditional dependencies', async () => {
    const { formDefinitionId } = await seedServiceCatalogFixture();

    await request(app.getHttpServer())
      .post('/api/v1/forms/versions')
      .send({
        formDefinitionId,
        title: { default: 'Circular form' },
        sections: [
          {
            sectionKey: 'main',
            title: { default: 'Main' },
            displayOrder: 1,
            fields: [
              {
                fieldKey: 'field_a',
                label: { default: 'Field A' },
                fieldType: FormFieldType.TEXT,
                displayOrder: 1,
                conditionalRules: [
                  {
                    action: 'SHOW',
                    logic: 'AND',
                    conditions: [{ fieldKey: 'field_b', operator: 'EQUALS', value: 'x' }],
                  },
                ],
              },
              {
                fieldKey: 'field_b',
                label: { default: 'Field B' },
                fieldType: FormFieldType.TEXT,
                displayOrder: 2,
                conditionalRules: [
                  {
                    action: 'SHOW',
                    logic: 'AND',
                    conditions: [{ fieldKey: 'field_a', operator: 'EQUALS', value: 'x' }],
                  },
                ],
              },
            ],
          },
        ],
      })
      .expect(400);
  });

  it('keeps old form versions reconstructable after supersession', async () => {
    const { formDefinitionId } = await seedServiceCatalogFixture();

    const v1Response = await request(app.getHttpServer())
      .post('/api/v1/forms/versions')
      .send({
        formDefinitionId,
        title: { default: 'Business License Application v1' },
        sections: buildSections(),
      })
      .expect(201);

    const v1Id = asFormVersionBody(v1Response.body).id;
    await request(app.getHttpServer()).patch(`/api/v1/forms/versions/${v1Id}/publish`).expect(200);

    const v2Response = await request(app.getHttpServer())
      .post(`/api/v1/forms/definitions/${formDefinitionId}/versions/next`)
      .send({
        title: { default: 'Business License Application v2' },
        sections: buildSections(),
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/forms/versions/${asFormVersionBody(v2Response.body).id}/publish`)
      .expect(200);

    const reconstructed = asFormReconstructBody(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/forms/versions/${v1Id}/reconstruct`)
          .expect(200)
      ).body,
    );

    expect(reconstructed.version).toBe(1);
    expect(reconstructed.sections).toHaveLength(1);
    const firstReconstructedSection = reconstructed.sections[0];
    if (!firstReconstructedSection) {
      throw new Error('Expected reconstructed form to include a section');
    }
    expect(firstReconstructedSection.fields).toHaveLength(6);
  });
});

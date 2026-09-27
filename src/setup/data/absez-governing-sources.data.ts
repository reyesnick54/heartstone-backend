import { GoverningSourceRelationshipType } from '@prisma/client';

/** Governing source catalogue — unsigned/project copies remain DRAFT (not authenticated). */
export interface AbsezGoverningSourceDefinition {
  code: string;
  title: string;
  versionLabel: string;
  disposition: 'DRAFT_REFERENCE' | 'UNEXECUTED_PROJECT_COPY';
  content: string;
  effectiveFromIso: string;
}

export interface AbsezGoverningSourceRelationshipDefinition {
  fromCode: string;
  toCode: string;
  relationshipType: GoverningSourceRelationshipType;
}

export const ABSEZ_GOVERNING_SOURCES: readonly AbsezGoverningSourceDefinition[] = [
  {
    code: 'AG-SEZ-ACT-2015-REF',
    title: 'Special Economic Zone Act 2015 (reference catalogue entry)',
    versionLabel: '2015-reference',
    disposition: 'DRAFT_REFERENCE',
    content:
      'REFERENCE COPY — statutory text catalogue entry for HeartStone governing-source linkage. ' +
      'This record is not authenticated as an executed instrument within HeartStone.',
    effectiveFromIso: '2015-01-01T00:00:00.000Z',
  },
  {
    code: 'AG-SEZ-AMEND-2024-REF',
    title: 'Special Economic Zone (Amendment) Act 2024 (reference catalogue entry)',
    versionLabel: '2024-reference',
    disposition: 'DRAFT_REFERENCE',
    content:
      'REFERENCE COPY — amendment catalogue entry. Not authenticated as in-force unless separately authenticated with authoritative evidence.',
    effectiveFromIso: '2024-03-01T00:00:00.000Z',
  },
  {
    code: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
    title: 'ABSEZ Implementation Protocol (unsigned project copy)',
    versionLabel: 'project-unexecuted',
    disposition: 'UNEXECUTED_PROJECT_COPY',
    content:
      'UNSIGNED PROJECT COPY — Implementation Protocol configuration reference. ' +
      'Does not create legal authority within HeartStone until authenticated with evidence of execution.',
    effectiveFromIso: '2099-01-01T00:00:00.000Z',
  },
  {
    code: 'ABSEZ-ANNEX-A-UNEXEC',
    title: 'Implementation Protocol Annex A (unsigned project copy)',
    versionLabel: 'project-unexecuted',
    disposition: 'UNEXECUTED_PROJECT_COPY',
    content: 'UNSIGNED PROJECT COPY — Annex A reference material. Not authenticated.',
    effectiveFromIso: '2099-01-01T00:00:00.000Z',
  },
  {
    code: 'ABSEZ-ANNEX-B-UNEXEC',
    title: 'Implementation Protocol Annex B (unsigned project copy)',
    versionLabel: 'project-unexecuted',
    disposition: 'UNEXECUTED_PROJECT_COPY',
    content: 'UNSIGNED PROJECT COPY — Annex B reference material. Not authenticated.',
    effectiveFromIso: '2099-01-01T00:00:00.000Z',
  },
  {
    code: 'ABSEZ-ORDER-DELEG-POWERS-UNEXEC',
    title: 'Delegated Powers Order (unsigned project copy)',
    versionLabel: 'project-unexecuted',
    disposition: 'UNEXECUTED_PROJECT_COPY',
    content:
      'UNSIGNED PROJECT COPY — delegated powers order reference. Functions depending on this instrument must remain inactive.',
    effectiveFromIso: '2099-01-01T00:00:00.000Z',
  },
  {
    code: 'ABSEZ-ORDER-OPERATIONS-UNEXEC',
    title: 'Zone Operations Order (unsigned project copy)',
    versionLabel: 'project-unexecuted',
    disposition: 'UNEXECUTED_PROJECT_COPY',
    content: 'UNSIGNED PROJECT COPY — operations order reference. Not authenticated.',
    effectiveFromIso: '2099-01-01T00:00:00.000Z',
  },
] as const;

export const ABSEZ_GOVERNING_SOURCE_RELATIONSHIPS: readonly AbsezGoverningSourceRelationshipDefinition[] =
  [
    {
      fromCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
      toCode: 'ABSEZ-ANNEX-A-UNEXEC',
      relationshipType: GoverningSourceRelationshipType.IMPLEMENTS,
    },
    {
      fromCode: 'ABSEZ-IMPL-PROTOCOL-UNEXEC',
      toCode: 'ABSEZ-ANNEX-B-UNEXEC',
      relationshipType: GoverningSourceRelationshipType.IMPLEMENTS,
    },
    {
      fromCode: 'ABSEZ-ORDER-DELEG-POWERS-UNEXEC',
      toCode: 'AG-SEZ-ACT-2015-REF',
      relationshipType: GoverningSourceRelationshipType.COORDINATES_WITH,
    },
  ] as const;

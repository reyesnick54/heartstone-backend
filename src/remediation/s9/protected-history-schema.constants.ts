/** Prisma model blocks that must not cascade-delete protected audit/history rows. */
export const PROTECTED_HISTORY_RELATIONS = [
  {
    model: 'CivilRegistryAuditEvent',
    field: 'vitalEvent',
    onDelete: 'Restrict',
  },
  {
    model: 'CivilRegistryAuditEvent',
    field: 'civilRegistryEntry',
    onDelete: 'Restrict',
  },
  {
    model: 'PropertyRegistryAuditEvent',
    field: 'propertyRegistryEntry',
    onDelete: 'Restrict',
  },
  {
    model: 'PropertyRegistryAuditEvent',
    field: 'propertyTransfer',
    onDelete: 'Restrict',
  },
  {
    model: 'DocumentAuditEvent',
    field: 'documentRecord',
    onDelete: 'Restrict',
  },
  {
    model: 'CaseStatusHistory',
    field: 'case',
    onDelete: 'Restrict',
  },
  {
    model: 'ServicePackDeploymentAuditRecord',
    field: 'servicePackDeployment',
    onDelete: 'Restrict',
  },
  {
    model: 'CivilRegistryVitalRecordVersion',
    field: 'vitalRecord',
    onDelete: 'Restrict',
  },
  {
    model: 'CivilRegistryCertificate',
    field: 'vitalRecord',
    onDelete: 'Restrict',
  },
] as const;

export const S9_CONSOLIDATION_MATRIX = {
  civilRegistry: {
    duplicate: ['CivilRegistryVitalRecord stack', 'VitalEvent/CivilRegistryEntry foundation'],
    canonical: 'VitalEvent → CivilRegistryEntry (foundation); vital record linked projection',
  },
  property: {
    duplicate: ['PropertyParcel phase stack', 'LandParcel cadastre stack'],
    canonical: 'LandParcel cadastre; PropertyParcel linked for experience',
  },
  actorContext: {
    duplicate: [
      'security/services/actor-context.service',
      'institutional-scope/actor-context.service',
    ],
    canonical: 'identity/auth/context/actor-context.service',
  },
  healthcareAccess: {
    duplicate: [
      'HealthcareFoundationAccessPolicyService',
      'HealthcareDataAccessPolicyService (privacy)',
      'TreatmentPatientDataAccessPolicyService',
    ],
    canonical: 'HealthcareCanonicalAccessPolicyService',
  },
  servicePacks: {
    duplicate: ['service-catalog deployment helpers', 'service-packs registry module'],
    canonical: 'ServicePack Prisma registry + ServicePackCanonicalGovernanceService',
  },
} as const;

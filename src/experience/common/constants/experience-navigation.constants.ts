import { EXPERIENCE_PERSONAS, type ExperiencePersona } from './experience-persona.constants';

export interface ExperienceNavigationDefinition {
  key: string;
  labelKey: string;
  defaultLabel: string;
  route: string;
  iconKey?: string;
  requiredCapability?: string;
}

const CITIZEN_NAVIGATION: ExperienceNavigationDefinition[] = [
  {
    key: 'home',
    labelKey: 'experience.nav.citizen.home',
    defaultLabel: 'Home',
    route: 'citizen.home',
  },
  {
    key: 'services',
    labelKey: 'experience.nav.citizen.services',
    defaultLabel: 'Services',
    route: 'citizen.services',
  },
  {
    key: 'applications',
    labelKey: 'experience.nav.citizen.applications',
    defaultLabel: 'Applications',
    route: 'citizen.applications',
  },
  {
    key: 'documents',
    labelKey: 'experience.nav.citizen.documents',
    defaultLabel: 'Documents',
    route: 'citizen.documents',
  },
  {
    key: 'payments',
    labelKey: 'experience.nav.citizen.payments',
    defaultLabel: 'Payments',
    route: 'citizen.payments',
  },
  {
    key: 'messages',
    labelKey: 'experience.nav.citizen.messages',
    defaultLabel: 'Messages',
    route: 'citizen.messages',
  },
  {
    key: 'appointments',
    labelKey: 'experience.nav.citizen.appointments',
    defaultLabel: 'Appointments',
    route: 'citizen.appointments',
  },
];

const BUSINESS_NAVIGATION: ExperienceNavigationDefinition[] = [
  {
    key: 'overview',
    labelKey: 'experience.nav.business.overview',
    defaultLabel: 'Overview',
    route: 'business.overview',
  },
  {
    key: 'licenses',
    labelKey: 'experience.nav.business.licenses',
    defaultLabel: 'Licenses',
    route: 'business.licenses',
  },
  {
    key: 'employees',
    labelKey: 'experience.nav.business.employees',
    defaultLabel: 'Employees',
    route: 'business.employees',
  },
  {
    key: 'projects',
    labelKey: 'experience.nav.business.projects',
    defaultLabel: 'Projects',
    route: 'business.projects',
  },
  {
    key: 'compliance',
    labelKey: 'experience.nav.business.compliance',
    defaultLabel: 'Compliance',
    route: 'business.compliance',
  },
  {
    key: 'payments',
    labelKey: 'experience.nav.business.payments',
    defaultLabel: 'Payments',
    route: 'business.payments',
  },
  {
    key: 'messages',
    labelKey: 'experience.nav.business.messages',
    defaultLabel: 'Messages',
    route: 'business.messages',
  },
];

const OFFICIAL_NAVIGATION: ExperienceNavigationDefinition[] = [
  {
    key: 'workspace',
    labelKey: 'experience.nav.official.workspace',
    defaultLabel: 'Workspace',
    route: 'official.workspace',
    requiredCapability: 'substantiveAccess',
  },
  {
    key: 'cases',
    labelKey: 'experience.nav.official.cases',
    defaultLabel: 'Cases',
    route: 'official.cases',
    requiredCapability: 'substantiveAccess',
  },
  {
    key: 'evidence',
    labelKey: 'experience.nav.official.evidence',
    defaultLabel: 'Evidence',
    route: 'official.evidence',
    requiredCapability: 'substantiveAccess',
  },
  {
    key: 'inspections',
    labelKey: 'experience.nav.official.inspections',
    defaultLabel: 'Inspections',
    route: 'official.inspections',
    requiredCapability: 'substantiveAccess',
  },
  {
    key: 'decisions',
    labelKey: 'experience.nav.official.decisions',
    defaultLabel: 'Decisions',
    route: 'official.decisions',
    requiredCapability: 'substantiveAccess',
  },
  {
    key: 'compliance',
    labelKey: 'experience.nav.official.compliance',
    defaultLabel: 'Compliance',
    route: 'official.compliance',
    requiredCapability: 'substantiveAccess',
  },
  {
    key: 'appeals',
    labelKey: 'experience.nav.official.appeals',
    defaultLabel: 'Appeals',
    route: 'official.appeals',
    requiredCapability: 'substantiveAccess',
  },
];

const EXECUTIVE_NAVIGATION: ExperienceNavigationDefinition[] = [
  {
    key: 'executive-dashboard',
    labelKey: 'experience.nav.executive.dashboard',
    defaultLabel: 'Executive Dashboard',
    route: 'executive.dashboard',
    requiredCapability: 'executiveBriefing',
  },
  {
    key: 'institutional-overview',
    labelKey: 'experience.nav.executive.institutional_overview',
    defaultLabel: 'Institutional Overview',
    route: 'executive.institutional_overview',
    requiredCapability: 'executiveBriefing',
  },
];

const PLATFORM_ADMIN_NAVIGATION: ExperienceNavigationDefinition[] = [
  {
    key: 'platform-administration',
    labelKey: 'experience.nav.platform.administration',
    defaultLabel: 'Platform Administration',
    route: 'platform.administration',
    requiredCapability: 'technicalAdministration',
  },
  {
    key: 'system-health',
    labelKey: 'experience.nav.platform.system_health',
    defaultLabel: 'System Health',
    route: 'platform.system_health',
    requiredCapability: 'technicalAdministration',
  },
];

export const PERSONA_NAVIGATION: Partial<
  Record<ExperiencePersona, ExperienceNavigationDefinition[]>
> = {
  [EXPERIENCE_PERSONAS.CITIZEN]: CITIZEN_NAVIGATION,
  [EXPERIENCE_PERSONAS.RESIDENT]: CITIZEN_NAVIGATION,
  [EXPERIENCE_PERSONAS.BUSINESS]: BUSINESS_NAVIGATION,
  [EXPERIENCE_PERSONAS.INVESTOR]: BUSINESS_NAVIGATION,
  [EXPERIENCE_PERSONAS.AUTHORIZED_REPRESENTATIVE]: [
    ...CITIZEN_NAVIGATION,
    {
      key: 'representations',
      labelKey: 'experience.nav.representative.representations',
      defaultLabel: 'Representations',
      route: 'representative.representations',
    },
  ],
  [EXPERIENCE_PERSONAS.GOVERNMENT_OFFICIAL]: OFFICIAL_NAVIGATION,
  [EXPERIENCE_PERSONAS.DEPARTMENT_MANAGEMENT]: [
    ...OFFICIAL_NAVIGATION,
    {
      key: 'department-dashboard',
      labelKey: 'experience.nav.management.department_dashboard',
      defaultLabel: 'Department Dashboard',
      route: 'management.department_dashboard',
      requiredCapability: 'departmentManagement',
    },
  ],
  [EXPERIENCE_PERSONAS.EXECUTIVE_LEADERSHIP]: [
    ...EXECUTIVE_NAVIGATION,
    {
      key: 'executive-cases',
      labelKey: 'experience.nav.executive.cases',
      defaultLabel: 'Executive Case Oversight',
      route: 'executive.cases',
      requiredCapability: 'executiveBriefing',
    },
  ],
  [EXPERIENCE_PERSONAS.PLATFORM_ADMINISTRATION]: PLATFORM_ADMIN_NAVIGATION,
};

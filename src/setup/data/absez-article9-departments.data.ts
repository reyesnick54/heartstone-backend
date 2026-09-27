/** Article 9 department categories for ABSEZ institutional structure (configuration only). */
export interface AbsezArticle9DepartmentDefinition {
  code: string;
  name: string;
  description: string;
  officeCode: string;
  officeName: string;
}

export const ABSEZ_ARTICLE9_DEPARTMENTS: readonly AbsezArticle9DepartmentDefinition[] = [
  {
    code: 'ABSEZ-ART9-01',
    name: 'Executive Office',
    description: 'Article 9 category — executive management and zone authority leadership support.',
    officeCode: 'ABSEZ-ART9-01-OFFICE',
    officeName: 'Executive Office — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-02',
    name: 'Legal Affairs',
    description: 'Article 9 category — legal advisory and instrument preparation support.',
    officeCode: 'ABSEZ-ART9-02-OFFICE',
    officeName: 'Legal Affairs — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-03',
    name: 'Compliance and Regulatory Affairs',
    description: 'Article 9 category — compliance monitoring and regulatory coordination.',
    officeCode: 'ABSEZ-ART9-03-OFFICE',
    officeName: 'Compliance and Regulatory Affairs — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-04',
    name: 'Finance and Accounts',
    description: 'Article 9 category — financial administration and fee assessment support.',
    officeCode: 'ABSEZ-ART9-04-OFFICE',
    officeName: 'Finance and Accounts — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-05',
    name: 'Human Resources and Administration',
    description: 'Article 9 category — HR and general administration.',
    officeCode: 'ABSEZ-ART9-05-OFFICE',
    officeName: 'Human Resources and Administration — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-06',
    name: 'Information Systems and Technology',
    description: 'Article 9 category — IT operations and platform support.',
    officeCode: 'ABSEZ-ART9-06-OFFICE',
    officeName: 'Information Systems and Technology — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-07',
    name: 'Investor Services and One Stop Shop',
    description: 'Article 9 category — front-office investor intake and case routing.',
    officeCode: 'ABSEZ-ART9-07-OFFICE',
    officeName: 'One Stop Shop — Service Desk Office',
  },
  {
    code: 'ABSEZ-ART9-08',
    name: 'Licensing and Registration',
    description: 'Article 9 category — zone operator and user licensing workflows.',
    officeCode: 'ABSEZ-ART9-08-OFFICE',
    officeName: 'Licensing and Registration — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-09',
    name: 'Planning and Development Liaison',
    description: 'Article 9 category — planning and development coordination within the zone.',
    officeCode: 'ABSEZ-ART9-09-OFFICE',
    officeName: 'Planning and Development Liaison — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-10',
    name: 'Environmental Management',
    description: 'Article 9 category — environmental review coordination.',
    officeCode: 'ABSEZ-ART9-10-OFFICE',
    officeName: 'Environmental Management — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-11',
    name: 'Security and Safety Coordination',
    description:
      'Article 9 category — security and safety liaison (not national policing authority).',
    officeCode: 'ABSEZ-ART9-11-OFFICE',
    officeName: 'Security and Safety Coordination — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-12',
    name: 'Facilities and Asset Management',
    description: 'Article 9 category — facilities, assets, and infrastructure support.',
    officeCode: 'ABSEZ-ART9-12-OFFICE',
    officeName: 'Facilities and Asset Management — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-13',
    name: 'Procurement and Supplies',
    description: 'Article 9 category — procurement and stores.',
    officeCode: 'ABSEZ-ART9-13-OFFICE',
    officeName: 'Procurement and Supplies — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-14',
    name: 'Corporate Governance and Secretariat',
    description: 'Article 9 category — governance secretariat and board support.',
    officeCode: 'ABSEZ-ART9-14-OFFICE',
    officeName: 'Corporate Governance and Secretariat — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-15',
    name: 'Communications and Stakeholder Relations',
    description: 'Article 9 category — communications and stakeholder engagement.',
    officeCode: 'ABSEZ-ART9-15-OFFICE',
    officeName: 'Communications and Stakeholder Relations — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-16',
    name: 'Internal Audit and Assurance',
    description:
      'Article 9 category — internal audit (advisory assurance, not external enforcement).',
    officeCode: 'ABSEZ-ART9-16-OFFICE',
    officeName: 'Internal Audit and Assurance — Head of Office',
  },
  {
    code: 'ABSEZ-ART9-17',
    name: 'Immigration Coordination Unit',
    description:
      'Article 9 category — immigration liaison (national immigration authority retained).',
    officeCode: 'ABSEZ-ART9-17-OFFICE',
    officeName: 'Immigration Coordination — Liaison Office',
  },
  {
    code: 'ABSEZ-ART9-18',
    name: 'Customs Coordination Unit',
    description: 'Article 9 category — customs liaison (national customs authority retained).',
    officeCode: 'ABSEZ-ART9-18-OFFICE',
    officeName: 'Customs Coordination — Liaison Office',
  },
  {
    code: 'ABSEZ-ART9-19',
    name: 'Financial Services Licensing Coordination',
    description: 'Article 9 category — FSRC and financial licensing liaison.',
    officeCode: 'ABSEZ-ART9-19-OFFICE',
    officeName: 'Financial Services Licensing Coordination — Liaison Office',
  },
] as const;

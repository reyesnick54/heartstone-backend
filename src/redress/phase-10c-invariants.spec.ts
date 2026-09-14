import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ComplaintAssignmentStatus,
  ComplaintCategory,
  ComplaintEscalationTarget,
  ComplaintEvidenceAccessLevel,
  ComplaintFindingStatus,
  ComplaintPathwayActor,
  ComplaintPathwayScope,
  ComplaintRemedyType,
  ComplaintSafeguardType,
  ComplaintStatus,
  GovernmentDecisionStatus,
  SubstantiveAppealStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { SubstantiveAppealService } from './appeals/substantive-appeal.service';
import { ComplaintService } from './complaints/complaint.service';
import { ComplaintAssignmentService } from './complaints/complaint-assignment.service';
import { ComplaintBoundaryService } from './complaints/complaint-boundary.service';
import { ComplaintClosureService } from './complaints/complaint-closure.service';
import { ComplaintFindingService } from './complaints/complaint-finding.service';
import { ComplaintPublicViewService } from './complaints/complaint-public-view.service';
import { ComplaintRemedyService } from './complaints/complaint-remedy.service';

describe('Phase 10C complaint invariants', () => {
  let boundary: ComplaintBoundaryService;
  let complaints: ComplaintService;
  let assignments: ComplaintAssignmentService;
  let findings: ComplaintFindingService;
  let remedies: ComplaintRemedyService;
  let closures: ComplaintClosureService;
  let publicView: ComplaintPublicViewService;
  let appeals: SubstantiveAppealService;

  const prisma: {
    complaint: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    complaintClassification: { create: jest.Mock };
    complaintSafeguard: { create: jest.Mock };
    complaintRetaliationAllegation: { create: jest.Mock };
    complaintRelatedMatter: { create: jest.Mock };
    substantiveAppeal: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    complaintAssignment: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    complaintFinding: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    complaintCorrectiveAction: { create: jest.Mock };
    complaintEscalation: { create: jest.Mock };
    complaintClosure: { create: jest.Mock };
    $transaction: jest.Mock;
  } = {
    complaint: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    complaintClassification: { create: jest.fn() },
    complaintSafeguard: { create: jest.fn() },
    complaintRetaliationAllegation: { create: jest.fn() },
    complaintRelatedMatter: { create: jest.fn() },
    substantiveAppeal: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    complaintAssignment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    complaintFinding: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    complaintCorrectiveAction: { create: jest.fn() },
    complaintEscalation: { create: jest.fn() },
    complaintClosure: { create: jest.fn() },
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComplaintBoundaryService,
        ComplaintService,
        ComplaintAssignmentService,
        ComplaintFindingService,
        ComplaintRemedyService,
        ComplaintClosureService,
        ComplaintPublicViewService,
        SubstantiveAppealService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    boundary = module.get(ComplaintBoundaryService);
    complaints = module.get(ComplaintService);
    assignments = module.get(ComplaintAssignmentService);
    findings = module.get(ComplaintFindingService);
    remedies = module.get(ComplaintRemedyService);
    closures = module.get(ComplaintClosureService);
    publicView = module.get(ComplaintPublicViewService);
    appeals = module.get(SubstantiveAppealService);
    jest.clearAllMocks();
  });

  it('complaint classification is not a factual finding', () => {
    expect(() => { boundary.assertClassificationIsNotFactualFinding(true); }).toThrow(
      /not a factual finding/i,
    );
  });

  it('complaint pathway is distinct from substantive appeal adjudication', () => {
    expect(() => { boundary.assertComplaintDistinctFromAppeal('APPEAL'); }).toThrow(
      /substantive appeal adjudication/i,
    );
  });

  it('complaint is not auto-dismissed because appeal is open', () => {
    expect(() => { boundary.assertComplaintNotAutoDismissedBecauseAppealOpen({
        complaintStatus: ComplaintStatus.CLOSED,
        relatedAppealStatus: SubstantiveAppealStatus.UNDER_ADJUDICATION,
      }); },
    ).toThrow(/must not be auto-closed/i);
  });

  it('complaint handler assignment does not create decision reversal authority', () => {
    expect(() => { boundary.assertAssignmentDoesNotCreateDecisionAuthority(false); }).toThrow(
      /does not create authority/i,
    );
  });

  it('conflicted complaint handler is blocked from active assignment', () => {
    expect(() => { boundary.assertConflictedHandlerBlocked({
        conflictCheckPassed: false,
        priorInvolvementDeclared: false,
        status: ComplaintAssignmentStatus.ACTIVE,
      }); },
    ).toThrow(/Conflicted or previously involved handler/i);
  });

  it('retaliation allegation is preserved separately and does not affect risk score', () => {
    expect(() => { boundary.assertRetaliationPreservedSeparately(true); }).toThrow(/risk score/i);
  });

  it('restricted investigation material is not publicly exposed', () => {
    expect(() => { boundary.assertRestrictedInvestigationMaterialNotPublic({
        accessLevel: ComplaintEvidenceAccessLevel.RESTRICTED,
        exposePrivilegedNotes: true,
      }); },
    ).toThrow(/must not be publicly exposed/i);
  });

  it('AI may summarize but cannot finalize complaint findings', () => {
    expect(() => { boundary.assertAiCannotFinalizeComplaint(
        ComplaintPathwayActor.AI_ASSISTANCE,
        ComplaintFindingStatus.FINALIZED,
      ); },
    ).toThrow(/cannot finalize complaint findings/i);
  });

  it('consequential complaint finding requires authorized reviewer attribution', () => {
    expect(() => { boundary.assertAuthorizedReviewerFinalizesFinding({
        actor: ComplaintPathwayActor.HANDLER,
        consequential: true,
        targetStatus: ComplaintFindingStatus.FINALIZED,
        reviewerIdentityId: 'reviewer-1',
      }); },
    ).toThrow(/authorized reviewer/i);
  });

  it('complaint finding is not a substantive appeal outcome', () => {
    expect(() => { boundary.assertFindingIsNotAppealOutcome(true); }).toThrow(/not a substantive appeal outcome/i);
  });

  it('complaint remedy must not silently reverse a final decision', () => {
    expect(() => { boundary.assertRemedyDoesNotSilentlyReverseDecision({
        remedyType: ComplaintRemedyType.EXPLANATION,
        mayReverseFinalDecision: true,
        decisionStatus: GovernmentDecisionStatus.FINALIZED,
        authorizedSubstantiveReviewOnly: true,
      }); },
    ).toThrow(/must not silently reverse/i);
  });

  it('complaint closure preserves evidence and decision history', () => {
    expect(() => { boundary.assertClosurePreservesEvidence(false, true); }).toThrow(/preserve evidence/i);
  });

  it('lodges complaint with non-factual classification', async () => {
    prisma.complaint.create.mockResolvedValue({
      id: 'cmp-1',
      complaintNumber: 'CMP-1',
      classifications: [{ isFactualFinding: false }],
    });

    await complaints.lodge({
      masterAdministrativeFileId: 'maf-1',
      complainantIdentityId: 'id-1',
      responsibleInstitutionId: 'inst-1',
      responsibleDepartmentId: 'dept-1',
      subjectSummary: 'Delay in service',
      category: ComplaintCategory.DELAY,
    });

    expect(prisma.complaint.create).toHaveBeenCalled();
    const createArgs = (
      prisma.complaint.create.mock.calls as [{ data: { classifications: { create: { isFactualFinding: boolean } } } }][]
    )[0]![0]!;
    expect(createArgs.data.classifications.create.isFactualFinding).toBe(false);
  });

  it('links parallel appeal without auto-closing complaint', async () => {
    prisma.complaint.findUnique.mockResolvedValue({
      id: 'cmp-1',
      status: ComplaintStatus.UNDER_INVESTIGATION,
    });
    prisma.substantiveAppeal.findUnique.mockResolvedValue({
      id: 'apl-1',
      status: SubstantiveAppealStatus.LODGED,
    });
    prisma.complaintRelatedMatter.create.mockResolvedValue({ id: 'link-1' });

    await complaints.linkRelatedAppeal({
      complaintId: 'cmp-1',
      substantiveAppealId: 'apl-1',
      linkageNotes: 'Shared subject; appeal handles merits, complaint handles conduct',
      pathwayScope: ComplaintPathwayScope.SHARED,
    });

    expect(prisma.complaintRelatedMatter.create).toHaveBeenCalled();
    const linkArgs = (
      prisma.complaintRelatedMatter.create.mock.calls as [{ data: { doesNotAutoClose: boolean } }][]
    )[0]![0]!;
    expect(linkArgs.data.doesNotAutoClose).toBe(true);
  });

  it('blocks active assignment for conflicted handler', async () => {
    prisma.complaintAssignment.findUnique.mockResolvedValue({
      id: 'asg-1',
      complaintId: 'cmp-1',
      conflictCheckPassed: false,
      priorInvolvementDeclared: true,
      independenceRequired: false,
      independenceSatisfied: true,
      accessVerified: true,
      doesNotAlterDecisionAuthority: true,
      complaint: { id: 'cmp-1' },
    });

    await expect(assignments.activate('asg-1')).rejects.toThrow(ForbiddenException);
  });

  it('records retaliation allegation without affecting applicant risk score', async () => {
    prisma.complaint.findUnique.mockResolvedValue({ id: 'cmp-1' });
    prisma.complaintRetaliationAllegation.create.mockResolvedValue({ id: 'ret-1' });

    await complaints.recordRetaliationAllegation({
      complaintId: 'cmp-1',
      allegationSummary: 'Retaliation after prior complaint',
      actor: ComplaintPathwayActor.COMPLAINANT,
    });

    expect(prisma.complaintRetaliationAllegation.create).toHaveBeenCalled();
    const retaliationArgs = (
      prisma.complaintRetaliationAllegation.create.mock.calls as [{ data: { preservedSeparately: boolean; affectsRiskScore: boolean } }][]
    )[0]![0]!;
    expect(retaliationArgs.data.preservedSeparately).toBe(true);
    expect(retaliationArgs.data.affectsRiskScore).toBe(false);
  });

  it('rejects AI finalizing complaint finding', async () => {
    prisma.complaintFinding.findUnique.mockResolvedValue({
      id: 'fnd-1',
      consequential: true,
      isSubstantiveAppealOutcome: false,
    });

    await expect(
      findings.finalize({
        findingId: 'fnd-1',
        reviewerIdentityId: 'reviewer-1',
        actor: ComplaintPathwayActor.AI_ASSISTANCE,
      }),
    ).rejects.toThrow(/cannot finalize complaint findings/i);
  });

  it('allows authorized reviewer to finalize attributable consequential finding', async () => {
    prisma.complaintFinding.findUnique.mockResolvedValue({
      id: 'fnd-1',
      consequential: true,
      isSubstantiveAppealOutcome: false,
    });
    prisma.complaintFinding.update.mockResolvedValue({
      id: 'fnd-1',
      status: ComplaintFindingStatus.FINALIZED,
      finalizedByIdentityId: 'reviewer-1',
    });

    await findings.finalize({
      findingId: 'fnd-1',
      reviewerIdentityId: 'reviewer-1',
      actor: ComplaintPathwayActor.REVIEWER,
    });

    expect(prisma.complaintFinding.update).toHaveBeenCalled();
  });

  it('professional conduct complaint may refer to competent body', async () => {
    prisma.complaint.findUnique.mockResolvedValue({
      id: 'cmp-1',
      classifications: [{ category: ComplaintCategory.PROFESSIONAL_CONDUCT }],
    });
    prisma.complaintEscalation.create.mockResolvedValue({ id: 'esc-1' });
    prisma.complaint.update.mockResolvedValue({ id: 'cmp-1' });

    await remedies.escalate({
      complaintId: 'cmp-1',
      escalationTarget: ComplaintEscalationTarget.PROFESSIONAL_BODY,
      reasonSummary: 'Refer to professional standards body',
      authorIdentityId: 'handler-1',
      actor: ComplaintPathwayActor.HANDLER,
    });

    expect(prisma.complaintEscalation.create).toHaveBeenCalled();
  });

  it('privacy complaint can trigger specialized incident referral safeguard', async () => {
    prisma.complaint.findUnique.mockResolvedValue({ id: 'cmp-1' });
    prisma.complaintSafeguard.create.mockResolvedValue({ id: 'sg-1' });

    await complaints.applySafeguard({
      complaintId: 'cmp-1',
      safeguardType: ComplaintSafeguardType.PRIVACY_INCIDENT_REFERRAL,
      configurationNotes: 'Route to privacy incident team',
      actor: ComplaintPathwayActor.HANDLER,
    });

    expect(prisma.complaintSafeguard.create).toHaveBeenCalled();
    const safeguardArgs = (
      prisma.complaintSafeguard.create.mock.calls as [{ data: { safeguardType: ComplaintSafeguardType } }][]
    )[0]![0]!;
    expect(safeguardArgs.data.safeguardType).toBe(ComplaintSafeguardType.PRIVACY_INCIDENT_REFERRAL);
  });

  it('public applicant view excludes privileged investigation notes', async () => {
    prisma.complaint.findUnique.mockResolvedValue({
      id: 'cmp-1',
      complaintNumber: 'CMP-1',
      status: ComplaintStatus.UNDER_INVESTIGATION,
      acknowledgedAt: new Date(),
      subjectSummary: 'Service issue',
      responses: [],
      closure: null,
      investigations: [
        {
          evidence: [
            {
              accessLevel: ComplaintEvidenceAccessLevel.RESTRICTED,
              description: 'Privileged interview notes',
            },
          ],
          issues: [{ issueSummary: 'Internal issue review' }],
        },
      ],
    });

    const view = await publicView.getApplicantView('cmp-1');

    expect(view.investigationNotesExcluded).toBe(true);
    expect(view.privilegedEvidenceExcluded).toBe(true);
    expect(view).not.toHaveProperty('investigations');
  });

  it('complaint closure preserves evidence and decision history flags', async () => {
    prisma.complaint.findUnique.mockResolvedValue({
      id: 'cmp-1',
      status: ComplaintStatus.REMEDY_PENDING,
      closure: null,
      relatedMatters: [],
      investigations: [{ evidence: [{ id: 'ev-1' }] }],
      governmentDecisionId: 'dec-1',
      governmentDecision: { id: 'dec-1', decisionStatus: GovernmentDecisionStatus.FINALIZED },
    });
    prisma.complaintClosure.create.mockResolvedValue({
      id: 'cls-1',
      evidencePreserved: true,
      decisionHistoryPreserved: true,
    });
    prisma.complaint.update.mockResolvedValue({ id: 'cmp-1', status: ComplaintStatus.CLOSED });

    await closures.close({
      complaintId: 'cmp-1',
      closureReason: 'RESOLVED',
      closureSummary: 'Resolved with explanation',
      authorIdentityId: 'handler-1',
      actor: ComplaintPathwayActor.HANDLER,
    });

    expect(prisma.complaintClosure.create).toHaveBeenCalled();
    const closureArgs = (
      prisma.complaintClosure.create.mock.calls as [{ data: { evidencePreserved: boolean; decisionHistoryPreserved: boolean } }][]
    )[0]![0]!;
    expect(closureArgs.data.evidencePreserved).toBe(true);
    expect(closureArgs.data.decisionHistoryPreserved).toBe(true);
  });

  it('substantive appeal stub remains distinct from complaint entity', async () => {
    prisma.substantiveAppeal.create.mockResolvedValue({
      id: 'apl-1',
      appealNumber: 'APL-1',
      status: SubstantiveAppealStatus.LODGED,
    });

    const appeal = await appeals.lodge({
      masterAdministrativeFileId: 'maf-1',
      appellantIdentityId: 'id-1',
      subjectSummary: 'Appeal against decision',
      governmentDecisionId: 'dec-1',
    });

    expect(appeal.status).toBe(SubstantiveAppealStatus.LODGED);
    expect(prisma.substantiveAppeal.create).toHaveBeenCalled();
    expect(prisma.complaint.create).not.toHaveBeenCalled();
  });
});

# Public Safety & Emergency Management (Foundation)

## Objective

Document the bounded **civil public safety and emergency coordination** foundation for citizen-government administrative interaction, incident reporting, emergency coordination, assistance intake, and recovery references.

Operational portals, service-pack templates, and experience projections are documented in [Public Safety & Emergency Government Service Pack](./public-safety-service-pack.md).

This module is **not** an autonomous policing, surveillance, weapons, or law-enforcement decision engine.

## Safety and scope boundary

The platform must **not** implement through this domain:

- predictive policing or tactical targeting
- autonomous enforcement or detention/arrest decisions
- automated guilt or violation findings
- weapons control workflows
- facial-recognition identification for enforcement

## Canonical module

Domain logic lives under `src/public-safety/`. Template services and pack lifecycle live under `service-packs/templates/12-public-safety-emergency.pack.json` and the service catalog compiler.

## Core distinctions

| Concept | Meaning | Does NOT mean |
| ------- | ------- | ------------- |
| **Incident report** | Citizen/business administrative submission | Verified incident |
| **Verified incident** | Government-verified coordination record | Criminal allegation finding |
| **Assistance / recovery application** | Coordination intake | Benefit entitlement or award |
| **Emergency event projection** | Operational monitoring summary | User-declared emergency |
| **Official notice** | Draft → approved → published lifecycle | Unapproved draft content |
| **External dependency determination** | Retained external feed/check | HeartStone enforcement decision |

## Data classification

Records support governed access tiers (including public notice, subject/engagement scope, institutional operational, restricted, and highly sensitive reporter contact data). Reporter identity remains protected in public and cross-subject projections.

## Incident reporting

Citizens and businesses may submit reports with category, location references, description, optional evidence, contact preference, and safety-warning metadata. Submissions retain explicit **unverified** state until an authorized official verification path runs; client payloads cannot self-assert verification or enforcement outcomes.

## Emergency events and notices

Official emergency coordination and public notices require institutional authorization and governed publish workflows. Citizens, businesses, AI assistance personas, and platform administrators **cannot** unilaterally issue public emergency declarations or mutate official emergency authority.

## Communications integration

Published official notices integrate Phase 11 communications (`CommunicationMessage`) with institution-controlled approved public body only.

## Must-fail gates

Enforced in `public-safety.must-fail.spec.ts` and boundary services, including:

- citizen report ≠ verified incident automatically
- citizen cannot issue public emergency alert / declaration
- unauthorized official cannot publish notice
- reporter PII protected in projections
- AI cannot issue public emergency declaration
- platform admin cannot create emergency authority
- executive dashboards remain read-only for incident mutation
- recovery assistance remains separate from incident reports
- public notices expose approved content only

## Related architecture

- [Public Safety & Emergency Government Service Pack](./public-safety-service-pack.md)
- [Phase 11 — Payments, Notifications & Integrations](./phase-11-payments-notifications-integrations.md)
- [Actor Context Trust Boundary](./actor-context-trust-boundary.md)

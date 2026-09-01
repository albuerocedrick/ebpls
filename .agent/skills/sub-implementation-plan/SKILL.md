---
name: sub-implementation-plan
description: Create a phase-specific, chronological Sub-Implementation Plan from the approved Main Implementation Plan and System Architecture. Every task must be a complete, independently testable unit of work, preferably a vertical slice, never merely a single-file change.
---

# Sub-Implementation Plan Skill

## Purpose

Create the detailed implementation plan for **one phase** of the Main Implementation Plan.

This skill is designed for a human-in-the-loop workflow:

1. Read the System Architecture.
2. Read the approved Main Implementation Plan.
3. Select one phase.
4. Create this phase's Sub-Implementation Plan.
5. Implement exactly one task.
6. Test and self-review it.
7. STOP for human review.
8. Continue only after explicit approval.

The skill creates the plan. It does not implement the tasks.

# Critical Task Definition

## A task is NOT a file change

Never define a task merely as:

- Create `UserController.ts`
- Create `LoginPage.tsx`
- Add `user.service.ts`
- Add a Prisma model
- Create an API route

Those may be implementation steps inside a task, but they are not automatically meaningful tasks.

A task must represent a **complete, independently testable unit of system behavior or capability**.

## Preferred Task Shape: Vertical Slice

Whenever practical, each task should cut through the relevant layers needed to deliver one coherent capability.

Example:

### Bad

- Task 1: Create Prisma model
- Task 2: Create repository
- Task 3: Create service
- Task 4: Create controller
- Task 5: Create React page

These are mostly file/layer changes and cannot provide meaningful independent user/system value.

### Better

**Task 1 — Create and persist an expense**

Includes only the work necessary for the capability:
- database changes
- backend/domain logic
- API endpoint
- validation
- authorization
- relevant frontend interaction if required by the phase
- tests

Acceptance test:

> An authorized treasurer can submit a valid expense and receive a persisted pending expense; invalid or unauthorized submissions are rejected.

That is a complete, independently testable unit.

## When a Vertical Slice Is Not Appropriate

Some foundational or infrastructure work cannot naturally be a user-facing vertical slice.

Examples:
- initial project scaffolding
- database migration infrastructure
- authentication infrastructure
- CI pipeline
- Docker environment
- shared testing infrastructure

For these, the task must still be independently verifiable.

Example:

**Bad:**
> Create Dockerfile.

**Better:**
> Establish a reproducible development container that starts the application and passes the defined health check.

The acceptance criteria must test the capability, not merely the existence of a file.

# Task Independence

Each task should be as independent as possible.

A task must specify:

- Task ID
- Task name
- Objective
- User/system capability delivered
- Preconditions
- Dependencies on previously completed tasks
- Scope
- Relevant architecture components
- Files/modules likely affected (informational only)
- Implementation requirements
- Business rules
- Acceptance criteria
- Test strategy
- Verification commands or observable verification
- Expected outcome

## Dependency Rule

Tasks must be ordered chronologically.

A task may depend on earlier tasks, but should not require future tasks.

Example:

```text
Task 1 — Establish authenticated user context
        ↓
Task 2 — Allow authorized officer to create expense
        ↓
Task 3 — Allow the other officer to approve expense
        ↓
Task 4 — Expose approved expense in transparency view
```

Do not create:

```text
Task 1 — Database table
Task 2 — Service
Task 3 — Controller
Task 4 — UI
```

unless the project genuinely requires those to be separately testable milestones.

# Task Size Rule

A task should be:

- small enough to implement and review safely
- large enough to produce meaningful behavior
- independently testable
- limited to one coherent capability

Avoid both extremes:

### Too small

```text
Change button color.
Create interface.
Add one function.
Create one file.
```

### Too large

```text
Implement the entire expense module.
```

The target is a coherent vertical slice.

# Human Review Gate

The generated Sub-Implementation Plan must explicitly support this workflow:

```text
TASK N
  ↓
IMPLEMENT ONLY TASK N
  ↓
RUN TESTS
  ↓
VERIFY ACCEPTANCE CRITERIA
  ↓
SELF-REVIEW
  ↓
STOP
  ↓
HUMAN REVIEW
  ↓
APPROVED?
  ├── NO → fix ONLY Task N → test → self-review → STOP
  └── YES → proceed to Task N+1
```

The agent must never automatically implement Task N+1.

# Required Output Structure

# Phase X — Sub-Implementation Plan

## 1. Phase Objective

Explain the capability this phase delivers.

## 2. Phase Scope

State what is and is not included.

## 3. Phase Dependencies

List:
- completed prerequisite phases
- required architecture components
- external dependencies

## 4. Task Overview

| Task | Capability | Dependencies | Independent Verification |
|---|---|---|---|

## 5. Detailed Tasks

For every task:

### Task X.Y — [Capability-oriented name]

**Objective**

What meaningful capability does this task deliver?

**Why this is independently testable**

Describe the observable behavior that can be verified after this task.

**Dependencies**

Only previously completed tasks or external prerequisites.

**Architecture Traceability**

Reference the relevant architecture module, requirement, entity, API, or rule.

**Scope**

What this task includes and excludes.

**Likely Affected Areas**

List files/modules as guidance, but do not define the task by files.

**Implementation Requirements**

Detailed technical requirements.

**Business Rules**

Rules that must be enforced.

**Acceptance Criteria**

Use observable Given/When/Then-style criteria where practical.

Example:

- Given an authenticated Treasurer
- When they submit a valid expense
- Then the API persists the expense as `PENDING`
- And the response contains the created expense
- And an unauthorized user cannot perform the operation

**Test Strategy**

Specify:
- unit tests
- integration/API tests
- database tests
- E2E/browser tests when appropriate

**Verification**

Specify commands or observable checks.

**Completion Definition**

The task is complete only when:
- implementation is complete
- acceptance criteria pass
- relevant tests pass
- no unrelated changes were introduced
- self-review is complete

## 6. Phase-Level Verification

Define how the entire phase will be verified after all tasks are approved.

# Validation Rules Before Finalizing the Plan

Before outputting the Sub-Implementation Plan, inspect every task and ask:

1. Does this task deliver a meaningful capability?
2. Can it be tested independently after completion?
3. Does it have observable acceptance criteria?
4. Is it more than a single-file change?
5. Is it too broad to safely review?
6. Does it depend only on earlier work?
7. Does it trace back to the architecture?
8. Does it contain the relevant business/security rules?
9. Can a human reviewer understand exactly what changed?
10. Can the agent stop cleanly after this task?

If a task fails these checks, reshape it before presenting the plan.

# Hard Constraints

- Do not implement code.
- Do not create tasks solely around files.
- Do not split a vertical slice into backend/frontend/database tasks merely because they touch different layers.
- Do not combine unrelated capabilities into one task.
- Do not invent requirements.
- Do not automatically proceed to implementation.
- Do not plan future-phase work into the current phase.
- Preserve the approved architecture and Main Implementation Plan.

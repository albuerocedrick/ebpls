---
name: implementation-plan
description: Create an Agile main implementation plan from an approved system architecture. Use for high-level phase sequencing, dependencies, deliverables, acceptance criteria, and implementation boundaries. Do not implement code.
---

# Implementation Plan Skill

## Purpose

Create the **Main Implementation Plan** from the approved System Architecture.

This skill is for planning only. It must not implement code, modify application source files, or silently change architectural decisions.

## Inputs

Prefer these project artifacts, in this order:

1. System Architecture
2. Approved requirements/specifications
3. Existing implementation plans, if any
4. Existing project documentation

If important information is missing, identify the gap instead of inventing requirements.

## Core Rules

### 1. Architecture is the source of truth

The plan must trace back to the System Architecture.

Do not introduce:
- technologies not specified by the architecture
- modules that have no architectural basis
- unnecessary abstractions
- speculative features

If a planning decision conflicts with the architecture, flag it for review.

### 2. Organize work into chronological Agile phases

Each phase must represent a meaningful increment of system capability.

Prefer phases such as:
- foundation
- authentication/authorization
- core domain functionality
- supporting functionality
- integrations
- reporting/transparency
- integrity/security
- testing/hardening

Do not split phases merely by file, class, or folder.

### 3. Respect dependencies

A phase must not depend on functionality scheduled for a later phase.

Explicitly identify:
- prerequisites
- dependencies
- outputs consumed by later phases

### 4. Keep phases implementation-oriented

Each phase should contain:

- Phase ID
- Phase name
- Objective
- Scope
- Architectural components involved
- Dependencies
- Major deliverables
- Acceptance criteria
- Risks/considerations

Do not create detailed implementation tasks here. Those belong in the separate Sub-Implementation Plan skill.

### 5. Produce a coherent implementation sequence

The plan should answer:

> "What should be built first, second, third, and why?"

It should also make clear when the system becomes incrementally usable/testable.

## Required Output Structure

# Main Implementation Plan

## 1. Planning Basis
- Architecture source
- Requirements source
- Assumptions explicitly supported by the source

## 2. Dependency/Execution Strategy
Explain the overall ordering.

## 3. Phase Overview

| Phase | Name | Objective | Dependencies | Deliverable |
|---|---|---|---|---|

## 4. Detailed Phases

For each phase:

### Phase X — Name

**Objective**

**Scope**

**Architecture Components**

**Dependencies**

**Major Deliverables**

**Acceptance Criteria**

**Risks / Notes**

## 5. Cross-Phase Concerns
Only include concerns supported by the architecture, such as:
- security
- data integrity
- testing
- deployment
- observability

## 6. Traceability
Map important architecture components/requirements to phases.

## Constraints

- Do not implement code.
- Do not create one phase per file.
- Do not create detailed task lists.
- Do not invent missing requirements.
- Do not reorder work merely for convenience.
- Do not mark work complete.

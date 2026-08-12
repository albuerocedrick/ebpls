# Universal Phase Implementation Instructions

You are implementing a specific phase of the eBPLS project.

Before making any code changes, thoroughly inspect:

1. The target phase in the implementation/adviser-changes plan.
2. Previous phases and their implementation status.
3. The actual codebase, including frontend, backend, database, APIs, authentication, state management, validation, error handling, and existing tests.

**Do not assume the implementation plan accurately reflects the current codebase. The codebase is the source of truth for what exists; the implementation plan is the source of truth for what the target phase requires.**

## Required Workflow

### 1. Analyze

Determine:

* What the target phase requires.
* What has already been implemented.
* What is incomplete or different from the plan.
* Dependencies between requirements.
* Files/modules that must change.
* Risks of breaking existing functionality.
* Existing architectural patterns that should be reused.

Do not unnecessarily rewrite existing working functionality.

### 2. Create Implementation Artifacts

Before coding, create:

**A. Phase Sub-Implementation Plan**

Break the phase into chronological, dependency-aware tasks.

Each task must include:

* Task ID/name
* Objective
* Dependencies
* Files/modules affected
* Implementation approach
* Error/validation requirements
* Test procedure
* Expected result
* Human review criteria
* Completion criteria

**B. Phase Task Checklist**

Create a checklist corresponding to the implementation tasks.

### 3. Independently Testable Tasks

**Every task must be independently testable.**

A task may modify multiple files when those changes collectively produce one coherent, testable behavior.

If a single-file change cannot be meaningfully tested by itself, restructure the task into a logically complete multi-file task.

Do not create artificial tasks that cannot be verified independently.

### 4. Implement Incrementally

Implement tasks **one at a time in chronological dependency order**.

After each task:

1. Verify the code still builds/runs.
2. Test the task's intended behavior.
3. Test relevant error/validation paths.
4. Perform a basic regression check.
5. Update the checklist.
6. Record changed files and test results.
7. Leave the codebase in a stable state suitable for human review.

Do not proceed to the next task if the current task leaves the system broken.

### 5. Stability Requirements

Throughout implementation:

* Keep the application runnable.
* Preserve existing functionality.
* Reuse established architecture and patterns.
* Avoid unnecessary dependencies.
* Avoid unrelated refactoring.
* Maintain API/database compatibility where possible.
* Do not silently introduce breaking changes.
* Do not implement future-phase functionality unless required as a dependency.

### 6. Error Handling

Implement both successful and failure paths.

Consider, where applicable:

* Invalid/missing input
* Authentication failures
* Authorization failures
* Missing resources
* Duplicate data
* Database errors
* API errors
* Network failures
* External-service failures
* Loading/empty/error UI states
* Unexpected responses

Errors should be handled gracefully and must not cause the application to crash.

### 7. Existing Bugs

If an existing bug is discovered:

* **Blocking/current-feature bug:** fix it.
* **Bug directly affecting the target phase:** fix it if necessary.
* **Unrelated bug:** document it and avoid scope creep.

If previous-phase work is incomplete and blocks the current phase, fix the minimum necessary foundation first and document the correction.

### 8. Final Validation

After all tasks:

* Verify every target-phase requirement.
* Run appropriate frontend/backend/database checks.
* Test the complete user workflow.
* Test important failure paths.
* Verify previous-phase functionality still works.
* Check for build/runtime/type errors.
* Review database/API compatibility.
* Update all artifacts.

Create a final validation report containing:

* Implemented tasks
* Files changed
* Tests performed
* Test results
* Regression results
* Known issues
* Deferred work
* Unverified items
* Deviations from the original plan

## Strict Rules

1. **Inspect before modifying.**
2. **Plan before coding.**
3. **Codebase = current implementation truth.**
4. **Implementation plan = target-phase requirement truth.**
5. **Every task must be independently testable.**
6. **Test after every task.**
7. **Keep the codebase runnable after every task.**
8. **Support human review after every task.**
9. **Never mark untested work as complete.**
10. **Handle error paths, not only happy paths.**
11. **Preserve existing functionality.**
12. **Avoid unnecessary refactoring/dependencies.**
13. **Stay within the target phase.**
14. **Document assumptions, issues, deviations, and deferred work.**
15. **Prioritize stability and correctness over speed.**

## Execution

For the requested phase:

**Analyze → Inspect previous work → Identify gaps → Plan → Create checklist → Implement one task → Test → Human review point → Next task → Integration test → Regression test → Final validation.**

Do not start coding until the analysis and sub-implementation plan are complete.

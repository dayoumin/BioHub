# Common Variable Assignment UX Spec

Date: 2026-04-09
Status: Proposed
Scope: Smart Flow Step 3 variable assignment and method-fit guidance

## Why This Exists

The current Step 3 already uses a mostly shared selector flow, but it does not give users enough confidence.

Current issues:
- The UI is shared at the `selectorType` level, but many method-specific constraints are flattened.
- Users can fill slots without clearly understanding why a variable is valid or invalid.
- The system validates late and often still allows progression after showing warnings.
- Drag interaction is still visible enough to imply it is the main path.
- The screen explains slots, but not the data structure required by the selected method.

This spec defines a common UX structure that makes the product feel:
- trustworthy
- clear
- hard to misuse
- easy to complete without statistical expertise

## Product Goal

Users should be able to answer three questions at a glance:

1. What does this method require?
2. Can my current data run it?
3. If not, what should I do next?

Step 3 should not behave like a generic picker.
It should behave like a guided eligibility and assignment workflow.

## Core Principles

### 1. Click-first, drag-second

Primary interaction:
- click a role slot
- see only valid or near-valid variables
- choose a variable

Secondary interaction:
- drag and drop remains available for advanced users

Reason:
- better discoverability
- better trackpad/mobile behavior
- easier accessibility
- easier to explain

### 2. Trust comes from explanation, not decoration

The screen must explain:
- why a variable is recommended
- why a variable is blocked
- what requirement is still missing
- what alternative method may fit better

### 3. Shared frame, method-specific rules

The layout can be shared, but validation and copy must be method-specific.

Bad:
- one shared `group-comparison` explanation for t-test, ANOVA, ANCOVA, Mann-Whitney

Good:
- shared layout
- method-level requirements and warnings
- method-level examples and next actions

### 4. Prevent wrong analysis before execution

The system should stop bad setup early.

Examples:
- independent samples t-test without a 2-level group variable
- logistic regression with a non-binary outcome
- paired comparison data being pushed into independent-group analysis

### 5. Show status as a decision system

Every role and every variable should expose state:
- recommended
- usable
- caution
- unavailable

## Single Source Of Truth

The shared Step 3 UX should be driven by `variable-requirements.ts`, not only `selectorType`.

Use:
- method-level requirements from [variable-requirements.ts](/d:/Projects/BioHub/stats/lib/statistics/variable-requirements.ts)
- selector grouping from [method-registry.ts](/d:/Projects/BioHub/stats/lib/registry/method-registry.ts)

`selectorType` remains useful for broad layout families, but the following must come from method requirements:
- slot labels
- accepted data types
- required vs optional
- min and max count
- examples
- method-specific warnings
- data format guidance

## Information Architecture

Step 3 should have nine persistent information zones.

### 1. Method Header

Shows:
- selected method name
- one-line purpose
- one-line requirement summary

Example:
- `Independent Samples t-Test`
- `Compare the mean of one continuous outcome across two independent groups`
- `Requires 1 continuous outcome and 1 categorical group variable with 2 levels`

### 2. Method Fit Banner

Top-level status for the current dataset.

States:
- ready
- partially ready
- blocked
- likely wrong method

Examples:
- `Ready: all required roles are assigned`
- `Blocked: a group variable with exactly 2 levels is required`
- `Likely wrong method: your data looks like paired pre/post measurements`

### 3. Role Assignment Panel

Each role card shows:
- role label
- required or optional
- accepted variable types
- short explanation
- concrete example
- local validation result

Example:
- `Group Variable (X)`
- `Required`
- `Categorical, 2 levels`
- `Splits observations into comparison groups`
- `Example: treatment/control`

### 4. Slot-Focused Variable List

The variable list changes based on the active slot.

Ordering:
1. recommended
2. usable
3. caution
4. unavailable

Each variable row should show:
- variable name
- detected type
- cardinality or unique count
- status badge
- short reason

Example reasons:
- `Recommended: categorical with 2 levels`
- `Unavailable: numeric variable cannot be used as a group variable`
- `Caution: categorical with 5 levels exceeds this method requirement`

### 5. Data Summary Panel

Compact evidence that helps trust the recommendation.

Include:
- sample size
- numeric variable count
- categorical variable count
- missingness summary
- selected variable quick stats

### 6. AI Recommendation Panel

Show recommendation only if the system can explain it.

Required fields:
- recommended role assignment
- why each assignment was suggested
- confidence level

Bad:
- `AI recommended: pre`

Good:
- `Recommended outcome: pre`
- `Reason: continuous variable with complete values and wide outcome-like naming`

### 7. Warning And Recovery Panel

When blocked, show recovery options, not only error text.

Possible actions:
- change method
- see why this method does not fit
- open data format guide
- create or transform a variable

### 8. Progress Footer

The footer should summarize readiness in direct language.

Bad:
- `1 required slot remaining`

Good:
- `Cannot continue until a 2-level group variable is assigned`

### 9. Optional Advanced Options

Advanced controls remain collapsible and separate from assignment.
Do not let alpha, tails, or post-hoc controls compete visually with core role filling.

## Interaction Model

### Primary Flow

1. User lands on Step 3
2. System evaluates dataset-method fit
3. Method Fit Banner explains readiness
4. First missing required slot becomes active
5. Variable list filters to that slot
6. User clicks a variable to assign
7. Slot validates instantly
8. Footer updates with next required action
9. When all required roles pass validation, execution becomes enabled

### Secondary Flow

Drag and drop can remain, but:
- never be the only discoverable path
- never be required for completion
- never carry the explanatory burden

### Slot Behavior

When a slot is active:
- valid variables move to the top
- invalid variables remain visible only if helpful
- every invalid variable must show a reason

When a slot is not active:
- show a neutral full variable list or recommended overview

### Assignment Behavior

Clicking an unassigned variable:
- assigns it to the active slot if valid
- otherwise does nothing and explains why

Clicking an assigned variable:
- opens quick actions
- move
- replace
- remove

## UX States

### Page-Level States

- No data
- No detected variables
- Partially assignable
- Assignable and ready
- Method mismatch
- Validation blocked

### Slot-Level States

- empty
- active
- assigned
- warning
- blocked
- complete

### Variable-Level States

- recommended
- valid
- caution
- invalid
- already assigned

## Copy Rules

The UI should prefer direct explanations over technical shorthand.

### Good Patterns

- `Choose a categorical variable with 2 groups`
- `This variable is numeric, so it cannot be used as a group variable`
- `This method compares independent groups, but your columns look like paired pre/post measurements`
- `You can switch to Paired Samples t-Test`

### Avoid

- `Type mismatch`
- `Invalid mapping`
- `Slot incomplete`
- `Role not satisfied`

### Slot Placeholder Pattern

Use:
- requirement
- accepted type
- concrete example

Pattern:
- `Select a [type] variable for [role]. Example: [example]`

## Trust-Building Rules

### 1. Explain recommendations with evidence

Recommendations should cite:
- detected type
- level count
- missingness
- naming clues
- method requirement match

### 2. Detect likely method mismatch

Examples:
- two numeric columns named `pre` and `post`
- one binary outcome and many numeric predictors
- one time column and one numeric measurement column

When mismatch is detected:
- do not silently continue
- show a high-visibility suggestion

### 3. Never hide why an action is blocked

Every disabled state must have a plain-language explanation.

### 4. Use recovery-oriented errors

Every blocking message should include one next action.

Pattern:
- `This method requires X. Your data currently has Y. Try Z.`

## Method-Specific Guidance Examples

### Independent Samples t-Test

Required:
- 1 continuous outcome
- 1 categorical group variable
- exactly 2 group levels

Warnings:
- if no categorical variable exists
- if selected group has more than 2 levels
- if data looks like repeated pre/post columns

Recovery:
- switch to Paired Samples t-Test
- switch to One-Way ANOVA
- create a grouping variable

### Paired Samples t-Test

Required:
- 2 paired continuous measurements or an equivalent paired format

Warnings:
- if user selects a grouping variable instead of paired measurements

Recovery:
- show wide vs long data examples

### Logistic Regression

Required:
- 1 binary outcome
- 1 or more predictors

Warnings:
- outcome has more than 2 levels
- outcome is continuous

### Kaplan-Meier

Required:
- 1 time variable
- 1 event variable

Optional:
- 1 group variable

Warnings:
- event variable not binary-like
- time variable non-numeric or unsuitable

## Proposed UI Composition

Shared components:
- `MethodFitBanner`
- `RoleAssignmentPanel`
- `RoleCard`
- `VariableCandidateList`
- `VariableCandidateRow`
- `AssignmentSummaryFooter`
- `MethodRecoveryPanel`
- `DataEvidencePanel`

Data contracts:
- `MethodRequirementViewModel`
- `RoleSlotViewModel`
- `VariableCandidateViewModel`
- `MethodFitResult`
- `AssignmentValidationResult`

## View Model Proposal

```ts
type VariableCandidateStatus =
  | 'recommended'
  | 'valid'
  | 'caution'
  | 'invalid'
  | 'assigned'

interface RoleSlotViewModel {
  id: string
  label: string
  required: boolean
  acceptedTypes: string[]
  minCount?: number
  maxCount?: number
  example?: string
  description: string
  helperText?: string
  validationState: 'empty' | 'active' | 'complete' | 'warning' | 'blocked'
  validationMessage?: string
  assignedVariables: string[]
}

interface VariableCandidateViewModel {
  name: string
  detectedType: string
  uniqueCount?: number
  missingCount?: number
  status: VariableCandidateStatus
  reason: string
  recommendedForRoleIds: string[]
  validForRoleIds: string[]
  invalidForRoleIds: string[]
}

interface MethodFitResult {
  status: 'ready' | 'partial' | 'blocked' | 'mismatch'
  title: string
  message: string
  nextActions: Array<{
    kind: 'switch-method' | 'open-guide' | 'create-variable' | 'continue'
    label: string
    payload?: string
  }>
}
```

## Implementation Direction

### Phase 1. Use method requirements as the Step 3 source

Replace the current Step 3 dependency chain:
- `method -> selectorType -> slot-configs`

With:
- `method -> variable-requirements -> role view model`

Keep `selectorType` only for coarse layout families if needed.

### Phase 2. Refactor Step 3 into shared evidence-first components

Apply first to:
- Independent Samples t-Test
- Paired Samples t-Test
- One-Way ANOVA
- Logistic Regression
- Kaplan-Meier

These cover the main role patterns and edge cases.

### Phase 3. Add method-mismatch detection

Priority mismatches:
- independent vs paired comparison
- t-test vs ANOVA
- regression vs correlation
- survival vs ordinary group comparison

### Phase 4. Tighten blocking behavior

Current late validation should become early gating for truly invalid setups.

Progression should be blocked when the method requirements are not satisfied.

## Acceptance Criteria

- Users can complete Step 3 without drag interaction.
- Every disabled execution state explains why.
- Every invalid variable candidate exposes a reason.
- Method mismatch suggestions appear before execution.
- Step 3 uses method-level requirements, not only selector-level slots.
- Independent Samples t-Test clearly requires a 2-level group variable.
- The footer message describes the actual missing condition, not only slot count.

## Immediate Next Build Target

Implement the following in order:

1. Build a `MethodFitBanner` driven by `variable-requirements.ts`
2. Replace generic slot copy with method-level slot copy and examples
3. Add slot-focused variable filtering with reasons
4. Change footer readiness copy from count-based to condition-based
5. Add mismatch detection for independent vs paired comparison


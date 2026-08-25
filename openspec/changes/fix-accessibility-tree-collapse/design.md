# Design: fix-accessibility-tree-collapse

## Context

See `proposal.md - Why` for the failure and its blast radius; the permanent
record lives in `docs/technical-debt.md` ("Mobile" — accessibility tree
collapse, found 2026-08-25).

Current sheet architecture (baseline facts for the investigation, not
fix-target hypotheses):

- Every sheet in the app is the single shared `BottomSheet` wrapper
  (`apps/mobile/src/shared/ui/bottom-sheet/bottom-sheet.tsx`) around
  `BottomSheetModal` from `@gorhom/bottom-sheet` (^5.2.14), with a hardcoded
  `accessible={false}` opt-out (v5's accessible-by-default container swallows
  non-accessible descendants on iOS — Maestro ids and VoiceOver depend on the
  opt-out) and a local backdrop.
- One `BottomSheetModalProvider` host is mounted in `src/app/_layout.tsx`
  INSIDE the data providers; every presented sheet portals there. Stacked
  sheets (picker over form) all use `stackBehavior="push"` so the sheet
  beneath stays mounted; picker sheets are always-mounted siblings of their
  field rows, presented imperatively.
- `footerComponent` content is rendered by @gorhom outside the content
  subtree (forms duplicate their `FormProvider` into the footer); text inputs
  use `BottomSheetInput`; sheet bodies are `BottomSheetScrollView` /
  `BottomSheetView`.
- Runtime baseline: React Native 0.86.2 (Fabric), Expo ~57, expo-router with
  a native `Stack` (`react-native-screens` ~4.26.2), `react-native-reanimated`
  ~4.5.1. No RN `Modal`, no screen-level modal presentation, and no portals
  other than the @gorhom host are involved in the repro path.

Evidence so far (probe series in `apps/mobile/.maestro/`, see
`docs/technical-debt.md` for the list): the picker cycle after a successful
create+sync over a freshly remounted form reproduces 6/6; ruled out as
triggers: the dev offline gate, sign-in/sign-out, merely reopening the form,
and the picker cycle without a preceding create+sync. The collapse also
reproduces on the new-transaction sheet's picker (not plans-specific), and
flow 16 (full create → confirm → cleanup online) passes.

Relevant constraints:

- Maestro selectors are testID-only; "Maestro cannot see the element" and
  "the node is gone from the native accessibility hierarchy" are different
  claims and are treated as such throughout.
- Accessibility/sheet conventions: `apps/mobile/docs/conventions/forms.md`
  §3 and `apps/mobile/AGENTS.md` (BottomSheetInput requirement, the
  `accessible={false}` opt-out, provider placement).
- The existing `_probe-*.yaml` files are investigation evidence and are
  immutable for this change.
- No OpenAPI/backend/web/packages involvement; no new shared abstractions
  unless the established root cause demonstrably requires one.

## Goals / Non-Goals

**Goals:**

- Establish the trigger and the originating layer of the collapse with
  reproducible evidence (application component, shared sheet wrapper,
  `@gorhom/bottom-sheet`, `react-native-screens`, React Native/Fabric,
  XCUITest accessibility bridge, or an interaction between several
  modal/presentation/accessibility containers).
- Land a minimal production-quality fix at that layer and prove it with the
  full regression ladder.

**Non-Goals:**

- Refactoring the BottomSheet architecture beyond what the established root
  cause demonstrably requires.
- Upgrading any dependency speculatively; no dependency is presumed to be the
  source of, or the fix for, the bug before upstream triage (D5) completes.
- Fixing unrelated defects discovered along the way (see Scope discipline).
- Making the e2e suite pass by changing Maestro flows, timeouts, retries, or
  interaction style (see D7's forbidden-fix list).

## Decisions

### D1: Investigation-first gate

No production fix lands before the root-cause report (D6) exists. The report
may honestly conclude "not established" — in that case the change records the
finding and stops rather than inventing an explanation. Alternative rejected:
fixing the most suspicious layer first and validating by e2e green — that
proves correlation, not cause, and invites a Maestro-shaped workaround.

### D2: Minimal reproduction as a dedicated Maestro probe

The reproduction is a new, dedicated flow file at the `.maestro/` root
(invoke-only, outside `flows/**` discovery), reduced from flow 17's offline
phase to: launch → create (plan or transaction) → sync settle →
close/remount → open form → picker cycle → observe accessibility. No sleeps or
retries to obtain the reproduction. The existing `_probe-*.yaml` files are
immutable — never edited, extended, or "reused by modification"; if the
change needs a probe, it gets a new separate file.

### D3: White-box instrumentation

Run the reproduction with verbose Metro/React Native logging, capturing:
sheet/picker mount and unmount, modal present/dismiss, screen focus/blur,
navigation transitions, changes to `accessible` /
`importantForAccessibility` / modal and accessibility containers, Fabric
warnings/errors, native exceptions, React warnings. App-side timestamps are
correlated with the Maestro/XCUITest failure moment. All instrumentation is
temporary scaffolding: removed at the end, or explicitly promoted to
permanent diagnostics (tasks group 8). Alternative rejected: relying on the
rendered UI staying visually correct — the bug is precisely that visuals and
accessibility diverge.

### D4: One-variable layer-isolation experiments

Each experiment changes exactly one variable and records whether the
accessibility tree survives:

- **A — picker without BottomSheet**: present the same picker content as a
  plain RN view/modal instead of a @gorhom sheet. Tree survives → collapse is
  localized to the BottomSheet/modal stack.
- **B — BottomSheet without picker**: after the same create+sync lifecycle,
  open a plain sheet (no picker cycle). Tree survives → the picker
  interaction is part of the trigger.
- **C — picker after remount without create+sync**: existing evidence says
  this does not reproduce; re-confirm in the minimal harness.
- **D — picker after create+sync**: the baseline reproduction.
- **E — simultaneous presentation layers**: inventory how many
  native/modal/presentation layers exist at the failure moment
  (`BottomSheetModal` host children, backdrops, footer layers, screens,
  portals) and how they nest.
- **F — native accessibility hierarchy before/after**: if tooling allows,
  capture the native accessibility hierarchy at both moments to distinguish
  "nodes disappear from the native hierarchy" from "nodes exist but XCUITest
  stops seeing them" — fundamentally different problems. If the native
  hierarchy is not reachable with available tooling, record that as an
  explicit limitation and reason from available white-box/native evidence
  instead. It is forbidden to conclude "nodes were removed" from Maestro
  invisibility alone.

### D5: Upstream triage protocol

Known issues to triage (supporting evidence only, never a shortcut to a
verdict): Maestro #3367, Maestro #3056, react-native #57282,
@gorhom/react-native-bottom-sheet #1892, react-native-screens #1685. For
each: compare RN version, Fabric vs paper, iOS version, modal
implementation, lifecycle, and the exact accessibility failure; note any
confirmed fix or workaround. An issue that does not match closely enough is
recorded as related evidence, not root cause. "It's a known upstream bug" is
not an acceptable conclusion on symptom similarity alone. Until this triage
completes, no dependency is presumed to be the source of the defect or the
target of the fix.

### D6: Root-cause report lives in this file

The schema provides no custom artifact for a report file, so the report is
recorded as the `## Root Cause Report` section appended to this design.md
during the investigation, in this shape:

```text
Trigger:
Minimal reproduction:
Observed native behavior:
Expected native behavior:

Application layer:
BottomSheet layer:
Navigation/Screens layer:
Fabric:
XCUITest bridge:

Root cause:
Evidence:
Rejected hypotheses:
```

The root cause must be technically concrete (which container, which commit/
lifecycle moment, which side stops seeing what) — "Maestro doesn't like
nested sheets" is not a root cause. If it cannot be established, the report
says so.

### D7: Fix priority ladder and forbidden final fixes

Fix priority: (1) production architecture, (2) the shared `BottomSheet`
abstraction, (3) configuration, (4) dependency upgrade only when a specific
upstream defect is proven (D5), (5) a documented workaround only when the
upstream defect is confirmed and production-safe. Any workaround must
document why a real fix is impossible. Never acceptable as the final fix:
arbitrary sleeps, Maestro retries, coordinate taps, app restarts, forced
navigation resets, random remounts, or accessibility hacks that hide the
problem. Flow 17 keeps testing the real user scenario unchanged.

### D8: Regression ladder and handoff

After the fix: minimal reproduction probe → flow 17 alone → flow 16 alone →
flows 09/15 → all flows 09–17 → full `pnpm test:e2e` ×3. Assertions are not
limited to Maestro pass/fail: after each critical step the accessibility
tree is checked to still be reachable. Standard gates apply (mobile
type-check/lint/format/test, root `arch:check` + `knip`). Only then does the
change return to `add-planned-payments` to close task 8.3 — nothing in that
change may be modified to route around the bug, and 8.3 closes only against
its own full Definition of Done.

### Scope discipline

This change is exclusively about the deterministic accessibility-tree
collapse described in the proposal. Unrelated defects discovered during the
investigation are recorded as separate findings / ticket candidates and left
unchanged. No BottomSheet refactor unless demonstrably required by the
established root cause. No speculative dependency upgrades.

## Risks / Trade-offs

- [Root cause turns out to be an upstream defect without a usable fix] →
  land the best production-safe workaround, explicitly documenting why a
  real fix is impossible; the spec scenario must still hold observably.
- [A fix in the shared `BottomSheet` wrapper affects every sheet in the app]
  → full regression ladder (D8), not just the plans flows.
- [Investigation is open-ended] → phases are gated on evidence; an honest
  "not established" (D1/D6) is preferred over a plausible invention.
- [Native accessibility hierarchy may be unreachable with available
  tooling] → recorded as a D4-F limitation; conclusions restricted to the
  available white-box/native evidence.
- [Test-infra observations masquerading as native truth] → D4-F explicitly
  forbids inferring node removal from Maestro visibility alone.

## Migration Plan

Execute in the order of the task groups: reproduce (1) → instrument (2) →
isolate (3) → architecture + upstream review (4) → root-cause report (5) →
fix (6) → regression (7) → docs, cleanup, and handoff to
`add-planned-payments` 8.3 (8). Rollback for the fix is ordinary git revert
of the mobile change; the investigation artifacts (report, probe) are kept
regardless.

## Root Cause Report

*(appended 2026-08-25 per D6, after tasks 1–6)*

### Trigger

Two factors must combine, both proven by one-variable experiments
(`.maestro/_probe-*.yaml` series, 2026-08-25):

1. **Arming factor — a create confirmed by a completed network sync.** An
   offline create (gate ON, op stays queued) does not arm (R3 PASS); a
   sync-only run without a create does not arm (R4 PASS); a create whose
   push is confirmed — immediately or deferred long after all sheets closed
   (R6 FAIL) — arms the app. Timing is irrelevant (R6 killed the timing
   hypothesis); the confirmed-create state is what matters.
2. **Structural factor — dismissing a `BottomSheetModal` whose React
   component renders inside another sheet's portal content** (the
   always-mounted "sheet-in-sheet" pickers). Merely opening the picker and
   closing it by backdrop is enough — no selection, no form re-render needed
   (R1 FAIL). Dismissing a page-level sheet (the form itself, parented at
   the screen) in the same armed state is harmless (R2 PASS). The same
   picker rendered at the form component's root survives the identical
   armed sequence (hoist experiment, PASS 2/2 incl. a zero-instrumentation
   run). Re-parenting the same picker to an app-root slot does NOT help
   (provider/slot experiment, FAIL) — the safe placement is specifically
   "direct child of the owning form-sheet component", outside any sheet's
   portal children.

### Minimal reproduction

`apps/mobile/.maestro/_probe-minimal-repro.yaml`: sign in → online create
(picker cycles in form #1) → wait `sync-status-synced` → reopen the create
form (fresh mount) → account-picker open + select → `plans-form-category`
invisible. Pre-fix: deterministic (6/6 historical, 3/3 this session; plus
flow 17's Phase B). Post-fix: passes (see Fix).

### Observed native behavior

At the failing moment the XCUItest hierarchy contains only two orphaned
native `Bottom sheet backdrop` views with empty content containers; every
RN accessibility element app-wide (including the base screen and tab bar)
is gone from the exposure while pixels keep rendering; the whole @gorhom
sheet stack also disappears visually. Expected: the dismissed picker alone
unmounts; the form and list sheets stay presented and reachable.

### Per-layer verdicts

- **Application layer**: exonerated as the direct cause — the local create
  pipeline (R3) and sync-only invalidations (R4) don't arm anything; no app
  code runs at the collapse moment.
- **BottomSheet layer (@gorhom/bottom-sheet 5.2.14)**: the React-tree shape
  it requires (portal children rendered from inside another portal's
  content) is the structural factor; its own JS internals log a completely
  normal dismiss→unmount sequence while the native tree dies (library
  `enableLogging()` trace, design D3 run). The `@gorhom/portal` host is a
  plain in-window View fragment — no extra UIWindow, no native modals.
- **Navigation/Screens layer**: exonerated — no screen transitions, no
  `presentation: modal`, no `FullWindowOverlay` in the repro path
  (react-native-screens 4.26.2 only backs the router stack).
- **Fabric/RN 0.86.2 + iOS 26.5**: the failure lives in how the native
  accessibility exposure is maintained across the sheet-content teardown
  commit; JS and the library see nothing wrong. A plain RN `Modal` picker in
  the identical armed sequence does NOT collapse (experiment A PASS), so
  RN-Modal/Fabric generally is not the locus either — it is the interaction
  between the @gorhom portal teardown and Fabric's AX bookkeeping on this
  stack.
- **XCUITest bridge**: detector, not cause — VoiceOver exposure dies with it
  (the product defect); a second XCUITest tool in upstream reports shows the
  same, ruling out tooling.

### Root cause

Technically concrete: after a server-confirmed create leaves the app in the
armed state, dismissing a `BottomSheetModal` whose React component is
rendered inside another presented sheet's portal content (the picker
sheet-in-sheet pattern) removes ALL React Native accessibility exposure and
the visual sheet stack until restart, while JS and @gorhom state remain
consistent. The exact native commit/bookkeeping step that breaks was not
provable with available tooling (see Limitations); the behavioral
two-factor trigger and the safe/unsafe React placements are proven
experimentally. Symptom-class matches exist upstream on the same stack
(RN 0.85/0.86, iOS 26, Fabric: react-native#57282, Maestro#3367 — both
closed without fixes; Maestro#3056 shows the class on iOS 17/RN 0.78 with a
navigation trigger), none matching our trigger exactly; none offers a fix.
`@gorhom/bottom-sheet` 5.2.14 is the latest version.

### Fix (D7 ladder: shared-abstraction level, plus one masked app bug)

1. **`useSheetContentPickers` + `SheetContentPortal`**
   (`apps/mobile/src/shared/ui/sheet-content-portal/`): a per-form-scope
   re-parenting primitive. Pickers stay authored next to their rows but
   render as direct children of the owning form-sheet component — the
   experimentally safe placement. Applied to every sheet-in-sheet picker:
   plans form (6), new-transaction form (5), edit-transaction form (5),
   debts form + operation sheet (date picker). 4 unit tests; full unit
   suite green.
2. **Masked app bug, fixed as a required enabler** (flagged per Scope
   discipline): `plans-screen.tsx` never cleared `editingPlan` and rendered
   `<PlanFormSheet plan={editingPlan} />` without a key, so after one
   edit-open the dismissed form never re-presented on a second row tap
   (reproduced unarmed/anonymous, with re-parenting disabled — pre-existing,
   previously unreachable because the collapse killed flows first). Minimal
   fix mirrors the create form's session-key idiom: `key={editingPlan.id}`.
   Flow 17's cleanup section cannot pass without it.
3. **Flow 17 latent staging defects** (previously unreachable): phases D/E
   scrolled for list rows without reopening the list sheet after the
   restart/online toggle, and copied the card total while the sheet still
   covered it. Completed the staging to match the flow's own pattern
   elsewhere (open sheet → assert rows → backdrop close → copy total). This
   completes the intended user journey; it does not weaken any assertion.

### Evidence

- Reduction matrix: baseline FAIL; R1 (open+backdrop close) FAIL; R2
  (close form, no picker) PASS; R3 (offline create) PASS; R4 (sync without
  create) PASS; R6 (deferred sync) FAIL; hoist (page-level picker) PASS ×2;
  app-root slot FAIL; plain RN Modal picker PASS.
- White-box: `[fixacc]` + `enableLogging()` traces show normal JS/library
  lifecycles; native `log stream` clean at the collapse moment.
- XCUItest hierarchy snapshots: healthy at picker-open, orphaned-backdrops
  signature at failure (nodes render but are not exposed; sheet content
  containers empty).
- Post-fix: armed baseline probe PASS ×2 (incl. zero-instrumentation clean
  bundle); flow 17 full PASS; flows 16, 09, 15 PASS.

### Rejected hypotheses

Offline gate; sign-in/sign-out; second form open alone; picker cycle
without create+sync; selection/re-render path (backdrop-close alone kills);
timing of sync completion relative to sheet dismissal (R6); mere
"outside sheet content" placement (app-root slot still fails — must be the
form component's direct child); instrumentation side effects (clean
zero-instrumentation run reproduces both directions); `enableDismissOnClose`
retention (invisible backdrops swallow all touches — rejected on
production-viability, wrapper-wide test); Maestro/XCUITest tooling
(upstream reports confirm with second tools; VoiceOver-equivalent product
defect).

### Limitations (per D4-F)

No tool available to capture the native accessibility hierarchy directly;
"nodes exist natively but stop being exposed" vs "removed from the native
hierarchy" is distinguished only visually (base screen keeps rendering) and
by the empty-but-present containers — recorded as an explicit tooling
limitation, not asserted as proven. The iOS 18.6 cross-version comparison
could not be completed: the suite's paste-based sign-in cannot deliver the
password on a freshly provisioned 18.6 simulator (paste into
secureTextEntry drops characters — consistent with the team's documented
iOS 18.6 quirk; the tuned 26.5 simulator works). Conclusions above do not
depend on either open question.

### Masked defects found, not fixed (Scope discipline)

- The team's paste-based e2e sign-in degrades on freshly provisioned iOS
  18.6 simulators (17/18 characters delivered) — runner/infra hardening
  candidate.
- (fixed as enabler, see above) `editingPlan` lifecycle — a separate
  finding worth its own regression test in a future change.

### Probe disposition (task 8.2, closed 2026-08-25)

The investigation's conclusion (two-factor trigger established, fix
landed, full regression ladder green) renders the probe series moot —
removed per the "remove" branch of task 8.2, with nothing in the suite
referencing any of them:

- This change's one-variable experiments: `_probe-gate-form`,
  `_probe-gate-first`, `_probe-create-first`, `_probe-two-forms`,
  `_probe-nogate`, `_probe-waitonly`, `_probe-txn-picker`, and the
  one-off `_probe-submit` / `_probe-confirm`.
- Pre-change `_probe-*.yaml` (add-planned-payments flow bring-up),
  disposed per the conclusion: `_probe-permission`, `_probe-plans-form`,
  `_probe-steps`, plus the one-off state-repair helpers `_signout`,
  `_cleanup-plans`, `_repair-finish`.
- `_probe-minimal-repro.yaml` cited above was a working-session artifact
  and no longer exists on disk; the reproduction sequence it encoded is
  preserved verbatim in "Minimal reproduction" above, and flow 17's
  online phase B exercises the same armed create+sync → picker-cycle
  path as a suite-visible regression guard.

Kept and promoted to permanent suite infrastructure: `_launch-online.yaml`
(shared launch for the sync flows 09/15/17 — anonymous app + offline-gate
OFF invariants), alongside `_launch.yaml` / `_launch.js`. No app-code
instrumentation remained to remove (verified: no `[fixacc]` /
`enableLogging` markers in `apps/mobile/src`).

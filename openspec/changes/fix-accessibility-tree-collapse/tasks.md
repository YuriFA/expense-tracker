## 1. Minimal reproduction (design D1/D2)

- [x] 1.1 Build a dedicated minimal reproduction probe as a NEW separate file at the `apps/mobile/.maestro/` root (outside `flows/**` discovery): launch → create (plan or transaction) → sync settle → close/remount → open form → picker cycle → observe accessibility tree; no sleeps/retries to obtain the reproduction; existing `_probe-*.yaml` files stay untouched
- [x] 1.2 Reduce the sequence step by step until the exact trigger operation is identified, and record it (which operation, on which sheet stack, after which lifecycle)

## 2. White-box instrumentation (design D3)

- [x] 2.1 Run the reproduction with verbose Metro/RN logging capturing sheet/picker mount-unmount, modal present/dismiss, screen focus/blur, navigation transitions, `accessible`/`importantForAccessibility`/container changes, Fabric warnings, native exceptions, React warnings
- [x] 2.2 Correlate app-side timestamps with the Maestro/XCUITest failure moment and record the log excerpt around first-create → create → sync → remount → second form → picker open → picker close → collapse

## 3. Layer isolation — one variable per experiment (design D4)

- [x] 3.1 Experiment A — present the picker content without `@gorhom/react-native-bottom-sheet` (plain RN view/modal): record whether the tree survives
- [x] 3.2 Experiment B — open a plain sheet after the create+sync lifecycle without any picker: record whether the tree survives
- [x] 3.3 Experiment C — picker cycle after form remount WITHOUT create+sync: re-confirm the existing rule-out in the minimal harness
- [x] 3.4 Experiment D — baseline: picker cycle after create+sync reproduces the collapse
- [x] 3.5 Experiment E — inventory the native/modal/presentation layers alive at the failure moment (@gorhom modal host children, backdrops, footer layers, screens, portals) and their nesting
- [x] 3.6 Experiment F — capture the native accessibility hierarchy before/after the failure if tooling allows; otherwise record the tooling limitation explicitly and reason only from available white-box/native evidence — never infer node removal from Maestro visibility alone

## 4. Architecture and upstream review (design D5)

- [x] 4.1 Inspect the existing shared abstractions (`shared/ui/bottom-sheet`, `shared/ui/sheet-footer`, picker sheets, `BottomSheetInput`, accessibility conventions in `apps/mobile/docs/conventions/`) and recent history around `accessible={false}`, `footerComponent`, nested sheets, `BottomSheetScrollView`/`BottomSheetView`; do not invent a new abstraction where the wrapper is the source of truth
- [x] 4.2 Triage each known upstream issue (Maestro #3367, Maestro #3056, react-native #57282, @gorhom/react-native-bottom-sheet #1892, react-native-screens #1685) against RN version, Fabric, iOS, modal implementation, lifecycle, exact a11y failure, confirmed fix/workaround; record exact-match vs related-evidence verdicts in a comparison table

## 5. Root-cause report (design D6)

- [x] 5.1 Append the `## Root Cause Report` section to `design.md` in the D6 template (Trigger / Minimal reproduction / Observed vs Expected native behavior / per-layer verdicts / Root cause / Evidence / Rejected hypotheses), technically concrete; if the root cause cannot be established, say exactly that and stop before any fix

## 6. Fix (design D7)

- [x] 6.1 Implement the minimal fix at the layer established by the report, following the priority ladder (production architecture → shared `BottomSheet` abstraction → configuration → proven dependency upgrade → documented workaround); no sleeps/retries/coordinate taps/restarts/navigation resets/random remounts/a11y-hiding hacks as the final fix
- [x] 6.2 If the outcome is a workaround, document in `design.md` why a real fix is impossible (confirmed upstream defect) and why the workaround is production-safe

## 7. Regression (design D8)

- [x] 7.1 Minimal reproduction probe passes (accessibility tree stays reachable through the full cycle)
- [x] 7.2 Flow 17 alone passes; flow 16 alone passes
- [x] 7.3 Flows 09 and 15 pass; then all flows 09–17 pass
- [x] 7.4 Full `pnpm test:e2e` passes 3 consecutive times; after each critical step the accessibility tree is verified reachable (not only Maestro assertions)
- [x] 7.5 Gates: mobile `pnpm type-check && pnpm lint && pnpm format && pnpm test`; root `pnpm arch:check` and `pnpm knip`

## 8. Docs, cleanup, handoff (design D8 + scope discipline)

- [x] 8.1 Update `docs/technical-debt.md` ("Mobile" — accessibility tree collapse entry) with the root cause, fix, and regression evidence
- [x] 8.2 Remove temporary probe/debug instrumentation created by this change, or explicitly promote it to permanent diagnostics; existing pre-change `_probe-*.yaml` files are disposed of per the investigation's conclusion only
- [x] 8.3 `openspec validate fix-accessibility-tree-collapse --strict` passes
- [x] 8.4 Return to `add-planned-payments` and close its task 8.3 only against that task's full Definition of Done; nothing in that change was modified to route around the bug

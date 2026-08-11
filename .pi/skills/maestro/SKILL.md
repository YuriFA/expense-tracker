---
name: maestro-e2e
description: Author and run Maestro mobile E2E flows for apps/mobile in this repo. Use when writing or editing .maetro/*.yaml flows, running `bun run test:e2e` / `maestro test`, debugging a mobile launch/boot crash (New-Arch red-box), or asserting a transaction persists across restart. Encodes THIS project's selectors, cold-boot seed, and persisted-state patterns.
license: MIT
compatibility: Requires a booted iOS simulator or Android emulator, the dev build installed, and the `maestro` CLI (Java 17+) on PATH.
metadata:
  app: apps/mobile
  appId: works.earendil.expensetracker
---

# Maestro E2E (apps/mobile)

Maestro flows live in `apps/mobile/.maetro/*.yaml`. `test:e2e` runs **every**
`*.yaml` in that directory - there is no per-file allowlist. The existing flows
(`launch.yaml`, `add-transaction.yaml`) are the canonical patterns; read them
before writing a new one and copy their structure. The README "Testing (E2E
launch smoke)" section is the user-facing source of truth.

## Run

```sh
# from repo root
bun --filter @expense-tracker/mobile test:e2e

# from apps/mobile
bun run test:e2e         # == maestro test .maetro/

# single flow (bypass the run-all script)
maestro test apps/mobile/.maetro/launch.yaml
```

`test:e2e` exits non-zero if ANY flow fails - that is the CI gate.

## Prerequisites (all three are required, none are optional)

1. **Booted iOS simulator or Android emulator.** `maestro test` talks to the
   running device; it will not boot one for you.
2. **The dev build installed** on that device - NOT Expo Go. Native deps in this
   app (react-native-mmkv 3, react-native-reanimated 4) require the New
   Architecture and ship native code that Expo Go does not contain. Build +
   install from `apps/mobile`:
   ```sh
   bun run prebuild          # expo prebuild --clean (regenerates native dirs)
   bun run ios               # expo run:ios   (builds + installs + launches)
   bun run android           # expo run:android
   ```
   `expo.newArchEnabled: true` is set in `app.json` and MUST stay on; an old-arch
   build red-boxes at boot (see "Launch smoke" below).
3. **`maestro` CLI on PATH** (https://maestro.mobile.dev/getting-started/installing-maestro),
   which needs Java 17+ (`java -version` to check).

## appId

Every flow starts with `appId: works.earendil.expensetracker`. Do not change it.

## Project-specific flow conventions

These are the rules the two existing flows follow. Match them so flows stay
deterministic and CI-green.

### 1. Cold boot for a deterministic seed

`clearState: true` on the first `launchApp` wipes the sandbox, so MMKV and the
SQLite store re-initialize and the seed runs fresh: **en locale**, **USD**, the
"Cash" starter account, and the starter categories. Every selector below assumes
this seed. Do not write a flow that depends on a different locale/currency
without first changing the seed.

```yaml
- launchApp:
    clearState: true
```

### 2. Selectors match the accessibility label as a FULL-MATCH regex

Maestro's `text:` selector is matched as a **full-match regex** against the
element's accessibility text. Two consequences:

- Anchor a short label with `^...$` so it does not match a longer string. The
  Save button label is `Add` (expense) / the comment placeholder is
  `Add a note` - use `^Add$`:
  ```yaml
  - tapOn:
      text: "^Add$"
  ```
- To match a substring inside a longer row, pad with wildcards:
  ```yaml
  - extendedWaitUntil:
      visible:
        text: ".*12.50.*"
      timeout: 15000
  ```

### 3. Canonical accessibility labels (en/USD seed)

| Element | Label | Notes |
| --- | --- | --- |
| Type segmented control | `Expense` / `Income` | Proves the Home input form mounted. |
| Save / submit button | `^Add$` (expense) | Anchor it; default expense type labels it "Add". |
| Hero amount field | `Amount, US Dollar` | Composed by `AmountField` as `${t('fields.amount')}, ${currencyName(currency, locale)}` via the static, Intl-free currency map. In ru/USD it would differ. |
| Numeric keypad return key | `Done` | Tap it to dismiss the keypad before hitting Save. |

Seeing `Expense` + `Add` is the "the app booted past MMKV + SQLite init without
crashing" signal - that is what the launch smoke asserts.

### 4. Dismiss the keypad before tapping thumb-zone buttons

The full-width Save button lives in the thumb zone and the numeric keypad covers
it while up. Always:

```yaml
- tapOn:
    text: "Amount, US Dollar"
- inputText: "12.50"
- tapOn:
    text: "Done"          # dismiss keypad
- tapOn:
    text: "^Add$"
```

### 5. "Persisted == survives a restart" - do NOT trust the optimistic cache

`useCreateTransaction` writes a provisional row into the react-query cache
optimistically (`onMutate`) and rolls it back on failure (`onError`). Right after
Save, a failed create can look briefly persisted. To assert durability, kill and
relaunch **without** clearing state so a fresh JS process re-reads from SQLite:

```yaml
- killApp
- launchApp:
    clearState: false       # keep the store; only the in-memory cache is gone
- extendedWaitUntil:
    visible:
      text: ".*12.50.*"
    timeout: 15000          # wait for the post-relaunch list query to resolve
```

Use `extendedWaitUntil` (not a bare `assertVisible`) after relaunch: the list
query is async and a plain assert can race the reload.

### 6. Comment the "why", not the "what"

Existing flows open with a multi-line comment naming the exact bug or contract
the flow guards (e.g. the SQLite `transactions.version` NOT-NULL regression, the
New-Arch boot red-box). Follow that style - a future reader must be able to tell
which regression a flow exists to catch, and whether a code change has made it
redundant.

### 7. Metadata block

```yaml
appId: works.earendil.expensetracker
name: <human label>
tags:
  - <area>        # e.g. launch, e2e, transaction
---
```

The `---` separates the metadata header from the flow steps. `tags` is how you
group flows for `maestro test --include-tags`.

## Why a launch smoke exists (do not delete it casually)

A New-Architecture-only native dependency (mmkv 3 / reanimated 4) red-boxes at
boot ("requires TurboModules, but the new architecture is not enabled!") and
**never renders a screen** if the app is built/run on the old architecture.
`launch.yaml` cold-boots and asserts the Home input screen mounted; those
assertions are only reachable if the app survived MMKV + SQLite init. So a
boot-time TurboModule crash fails this flow automatically. If you touch native
deps, New-Arch config, or the boot path, run `launch.yaml` first.

## Common pitfalls

- **"No devices found"** - no booted simulator/emulator. Boot one; `maestro`
  will not start it.
- **App crashes immediately / flow fails on step 1** - you likely installed an
  Expo Go build or an old-arch build. Rebuild with `prebuild` + `run:ios`/`run:android`.
- **`tapOn: Add` matches "Add a note"** - you forgot the `^...$` anchors.
- **Amount field not found** - you are not on the en/USD seed. `clearState: true`
  on the first launch re-seeds deterministically.
- **Post-save assertion flakes** - you asserted on the optimistic cache instead
  of killing + relaunching with `clearState: false`.

## Reference flows

- `apps/mobile/.maetro/launch.yaml` - cold-boot launch smoke (New-Arch guard).
- `apps/mobile/.maetro/add-transaction.yaml` - create happy path + persisted-
  across-restart assertion (SQLite `version` regression guard).
- `apps/mobile/README.md` "Testing (E2E launch smoke)".

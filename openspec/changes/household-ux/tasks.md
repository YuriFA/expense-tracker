# Tasks: household-ux

## 1. Shared groundwork (per client)

- [ ] 1.1 Mobile `entities/household` slice: members query + typed actions over the existing API clients; unit tests with mock clients
- [ ] 1.2 Web `entities/household` slice (colada query + actions) mirrored; unit tests
- [ ] 1.3 Authorship label selector (`authorLabel`: own/unknown/single-member → null; display name with email fallback) with unit tests in both apps

## 2. Mobile screens

- [ ] 2.1 Settings «Пространство» group: household name (owner rename), members list (name/email, role, joined), role-aware action visibility
- [ ] 2.2 Owner dialogs: invite by email (validation + resend semantics), outgoing invitations with status/revoke, home code panel (copy/rotate/revoke), remove member (confirm), dissolution (confirm with record counts)
- [ ] 2.3 Member actions: leave with confirm — **clean start only** (no carry: contributions stay with the household per ADR-0002; same-id union would per-item fail against the live household — see household-join's deviations); copy explains what stays behind; join-by-code entry (links to the household-join flow)
- [ ] 2.4 Authorship markers: transaction rows + detail, debtor history, plan confirm rows — per the spec's marker/detail rules
- [ ] 2.5 Profile display-name editor with member-view preview and email fallback
- [ ] 2.6 Unit tests per screen (mock household slice): role visibility, dialogs, markers, name editor

## 3. Web screens

- [ ] 3.1 Settings household block (reka-ui): name, members, role-aware actions — mirror of 2.1
- [ ] 3.2 Owner dialogs (invite/revoke/resend, code panel, remove, rename, dissolution confirm) — mirror of 2.2
- [ ] 3.3 Member actions (leave, join-by-code) — mirror of 2.3
- [ ] 3.4 Authorship markers on transaction rows/details and debtor/plan surfaces — mirror of 2.4
- [ ] 3.5 Display-name editor in settings with preview — mirror of 2.5
- [ ] 3.6 Unit tests mirroring 2.6

## 4. i18n

- [ ] 4.1 RU-authoritative keys (`household.*`, `profile.*`) with EN mirrors in both apps' catalogs; strict i18n lint green

## 5. e2e, gates, docs

- [ ] 5.1 Backendless e2e (web): settings household section renders with a multi-member fixture (mocked household API), authorship markers appear/disappear with member count, role hiding
- [ ] 5.2 Gates: mobile jest, web type-check/unit/e2e, arch:check, lint (+ i18n:lint), knip, steiger
- [ ] 5.3 Docs: both AGENTS.md screen maps + overview pointers
- [ ] 5.4 `openspec validate household-ux --strict` passes

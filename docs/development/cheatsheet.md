# Development Cheatsheet

## 1. Новая feature / capability

Требования или архитектура непонятны:
→ `/opsx:explore`

Всё понятно:
→ `/opsx:propose`
→ проверить proposal
→ `/opsx:apply`
→ `/opsx:verify`
→ `/opsx:archive`

---

## 2. UI / стили / визуальные изменения

Поведение не меняется:
→ реализовать напрямую
→ visual/test check

Меняется пользовательское поведение:
→ `/opsx:explore`
→ `/opsx:propose`
→ `/opsx:apply`
→ `/opsx:verify`
→ `/opsx:archive`

---

## 3. Bugfix / refactor без изменения поведения

→ investigate
→ исправить
→ tests
→ verify

OpenSpec не нужен.

---

## 4. Bugfix, который может изменить business behavior

→ `/opsx:explore`
→ определить, как должно работать

Решение/требование уже существует:
→ реализовать согласно ему

Решения нет:
→ остановиться
→ сначала принять решение
→ `/opsx:propose`, если меняется capability
→ ADR / invariant / assumption, если меняется архитектура
→ реализовать
→ `/opsx:verify`
→ `/opsx:archive`

---

## 5. Новое архитектурное решение

→ STOP
→ исследовать варианты
→ провести decision pass

Cross-cutting решение / важен rationale:
→ ADR

Enforceable архитектурное правило:
→ invariant

Временное или нерешённое:
→ assumption

Меняется capability / behavior:
→ OpenSpec

Затем:
→ implement
→ verify

---

## Главное правило

**Не придумывай отсутствующие требования или архитектуру во время реализации.**

Если непонятно, как должно работать или какое архитектурное решение принять —
остановись и сначала прими решение.

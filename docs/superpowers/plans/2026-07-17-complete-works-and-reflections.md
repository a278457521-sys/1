# Complete Works And Reflections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure all 84 study topics show representative works and all expanded reflection answers display complete source content.

**Architecture:** Keep representative works in `build_data.py` as the single source of truth, validate every generated topic before writing `data.js`, and render reflection answers from full topic fields. A Node regression test checks both guarantees.

**Tech Stack:** Python 3, browser JavaScript, Node.js built-in test runner, static GitHub Pages.

## Global Constraints

- Every noun explanation and essay topic must include at least one specific representative work.
- Reflection analysis and answers must not use ellipsis truncation.
- Existing user content, frequency colors, scoring, and mobile layout must remain intact.

---

### Task 1: Add Failing Content Tests

**Files:**
- Create: `tests/content.test.js`

- [ ] Run `node --test tests/content.test.js` and confirm both missing-work and reflection-truncation tests fail for the current defects.

### Task 2: Complete Representative Works

**Files:**
- Modify: `build_data.py`
- Generate: `data.js`

- [ ] Add specific works for every currently empty topic.
- [ ] Add `ensure_works(items)` and call it before writing the generated payload.
- [ ] Run `python build_data.py`, then rerun the content tests.

### Task 3: Render Full Reflection Answers

**Files:**
- Modify: `app.js`

- [ ] Replace every `compact(...)` call inside `reflectionHtml()` with the corresponding complete field.
- [ ] Run `node --test tests/content.test.js` and `node --check app.js`.

### Task 4: Verify And Deploy

**Files:**
- Modify: `index.html`
- Modify: `D:/桌面/workspace/01_全局复利于踩坑日志.md`

- [ ] Verify all 84 topics have works and noun content remains at least 200 Chinese characters.
- [ ] Verify expanded answers contain no ellipsis and mobile width has no horizontal overflow.
- [ ] Bump static asset cache versions, update the pitfall log, commit, push, and verify GitHub Pages.

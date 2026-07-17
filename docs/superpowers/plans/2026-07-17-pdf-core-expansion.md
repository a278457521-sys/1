# PDF Core Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the study site from 84 to 142 topics using the PDF's missing core exam points.

**Architecture:** Store curated PDF topics in a dedicated Python data module, append them through the existing generator, and enforce the existing content contracts before producing browser data. Extend the Node content tests before adding production data.

**Tech Stack:** Python 3, browser JavaScript, Node.js built-in test runner, static GitHub Pages.

## Global Constraints

- Add exactly 58 curated core topics and four new chapters.
- Every new topic must contain at least 200 characters and specific representative works.
- Keep reflection answers complete and preserve mobile behavior.
- Exclude grey second-round topics.

---

### Task 1: Add Curriculum Regression Tests

**Files:**
- Modify: `tests/content.test.js`

- [ ] Add the exact 58-title curriculum list and four expected chapter names.
- [ ] Run `node --test tests/content.test.js` and confirm failure because the new curriculum is absent.

### Task 2: Add Curated PDF Topic Data

**Files:**
- Create: `pdf_core_topics.py`
- Modify: `build_data.py`
- Generate: `data.js`

- [ ] Define all 58 entries with `title`, `chapter`, `background`, `features`, `impact`, `works`, and `aliases`.
- [ ] Add topics with stable `topic-pdf-*` IDs and reject duplicate titles.
- [ ] Run the generator and content tests until the complete curriculum passes.

### Task 3: Verify Search And Responsive Rendering

**Files:**
- Modify: `index.html`

- [ ] Verify representative new topics from chapters 8-11 through the real search form.
- [ ] Verify works, complete reflections, and zero horizontal overflow at 1440px and 375px.
- [ ] Update static resource versions only after all local checks pass.

### Task 4: Deploy And Record The Method

**Files:**
- Modify: `D:/桌面/workspace/01_全局复利于踩坑日志.md`

- [ ] Record the curated-import and generation-validation method.
- [ ] Commit and push `main`.
- [ ] Wait for GitHub Pages and repeat the online curriculum and mobile checks.

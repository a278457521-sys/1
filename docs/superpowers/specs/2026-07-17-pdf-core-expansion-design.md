# PDF Core Expansion Design

## Objective

Expand the current 84-topic study site from the supplied 149-page PDF without turning it into an unfiltered reference archive. The expansion includes every missing topic explicitly marked as a core or重点背诵 item in the PDF, plus the system-design foundation needed to understand the new postwar chapters.

## Scope

- Add 58 topics, producing 142 topics in total.
- Backfill six missing core topics in chapters 1-7: KISS principle, Second Empire style, Art Nouveau graphic design, Arthur Mackmurdo, Jean Dunand, and Raymond Loewy.
- Add four chapters: postwar modern and graphic design, postmodern design, postwar automotive design, and contemporary national design.
- Exclude grey second-round topics and unmarked minor figures.
- Preserve the existing answer templates, grading, memory map, frequency colors, word count, and responsive layout.

## Content Contract

Each new topic contains a background, core features, impact, aliases, high-frequency marker, and at least one specific representative work. Combined noun-explanation content must contain at least 200 non-whitespace Chinese characters. Content follows the PDF but is rewritten into the site's exam structure rather than copied as an unedited paragraph.

## Architecture

Keep the PDF-derived curriculum in `pdf_core_topics.py` and import it from `build_data.py`. The generator appends the curated topics, assigns stable `topic-pdf-*` IDs, rejects duplicate titles, then runs the existing length and representative-work validators before generating `data.js`.

## Verification

Automated tests require all 58 titles and all four chapters, exactly 142 total topics, no missing works, no noun answer below 200 characters, and no reflection truncation. Browser verification covers search and rendering for one new topic from each chapter on desktop and 375px mobile.

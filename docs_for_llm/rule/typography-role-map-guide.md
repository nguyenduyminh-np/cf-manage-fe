# Typography Role Map Guide (Product + Engineering)

## 1) Purpose

This document is the single source of truth for typography usage across the restaurant and cafe booking platform.

It ensures that Product, Design, and Engineering use one semantic role map consistently across:
- Landing page
- Menu
- Reservation flow
- Booking management
- Availability status
- Notifications
- Reviews
- Admin dashboard

If there is a conflict between ad hoc mockups and this guide, this guide wins unless a documented exception is approved.

---

## 2) Non-Negotiable Rules

1. Use at most 2 font families.
2. Use semantic typography roles only:
   - display
   - headline
   - title
   - body
   - label
3. Base body size must be at least 16px.
4. Body line-height must be 1.5 or higher.
5. Body line length target is 50-75 characters; hard max 80 characters.
6. Do not justify text.
7. Decorative type is allowed only for hero accent or brand logo, never for body.
8. Prioritize scan speed over decorative expression.
9. Typography must be token-based and accessible.

---

## 3) Brand Tone Translation

Brand attributes:
- warm
- inviting
- trustworthy
- modern
- slightly premium

Typography implications:
- Use confident but calm contrast between headings and body.
- Avoid playful/kids style display treatment.
- Avoid ultra-luxury editorial density.
- Avoid sterile enterprise flatness.
- Keep text rhythm comfortable for long operational sessions (booking/admin screens).

---

## 4) Font Strategy

## 4.1 Font families

- Primary UI family: `Inter`
- Secondary accent family: `Manrope`

Recommended usage:
- `Inter`: body + label + most app UI text
- `Manrope`: headline/title emphasis and key high-level headings

Do not introduce a third family.

## 4.2 Allowed decorative usage

If a decorative style is required:
- Limit to hero accent word(s) or brand mark only
- Never use in paragraphs, forms, table data, filters, metadata, or admin screens

---

## 5) Canonical Semantic Role Map

This is the only approved role map.

| Role Token | Desktop | Mobile | Weight | Letter Spacing | Primary Use |
|---|---|---|---|---|---|
| `--type-display-xl` | 56px / 1.1 | 40px / 1.15 | 700 | -0.02em | Hero titles |
| `--type-headline-lg` | 36px / 1.2 | 30px / 1.25 | 700 | -0.01em | Page titles |
| `--type-headline-md` | 30px / 1.25 | 26px / 1.3 | 600 | -0.01em | Section titles |
| `--type-title-lg` | 24px / 1.3 | 22px / 1.35 | 600 | 0 | Card/dialog titles |
| `--type-title-md` | 20px / 1.35 | 18px / 1.4 | 600 | 0 | Important values (price/summary) |
| `--type-body-lg` | 18px / 1.65 | 17px / 1.65 | 400 | 0 | Intro paragraphs |
| `--type-body-md` | 16px / 1.6 | 16px / 1.6 | 400 | 0 | Default body text |
| `--type-body-sm` | 14px / 1.55 | 14px / 1.55 | 400 | 0 | Meta text |
| `--type-label-md` | 14px / 1.4 | 14px / 1.4 | 600 | 0.01em | Buttons, form labels |
| `--type-label-sm` | 12px / 1.35 | 12px / 1.35 | 600 | 0.02em | Status chip, helper text |

Notes:
- Body minimum stays 16px for core reading surfaces.
- 14px body is allowed only for metadata/supporting content.

---

## 6) Single Mapping for Critical UI Signals

The following mappings are mandatory for consistency:

| UI Signal | Role | Why |
|---|---|---|
| CTA text | `label-md` | Fast recognition + clear action affordance |
| Price | `title-md` (often 700) | Numeric prominence without visual noise |
| Opening hours label | `label-md` | Section anchor |
| Opening hours value | `body-sm` or `body-md` | Readable operational info |
| Reservation status badge | `label-sm` | Dense, scannable status communication |
| Table availability count/value | `title-md` or `label-md` depending context | Immediate capacity readability |
| Form label | `label-md` | Predictable control hierarchy |
| Helper and error text | `label-sm` | Compact guidance without competing with body |

For prices and counts, enable tabular numerals where possible.

---

## 7) Product-Level Usage Matrix

## 7.1 Landing and marketing surfaces

- Hero title: `display-xl`
- Hero subtext: `body-lg`
- Feature section title: `headline-md`
- Feature body: `body-md`
- Primary hero CTA: `label-md`

## 7.2 Menu and reservation flow

- Page title: `headline-lg`
- Card title (dish/table option): `title-lg`
- Description: `body-md`
- Price: `title-md`
- Filters and form labels: `label-md`
- Helper text: `label-sm`

## 7.3 Booking management and availability

- Screen title: `headline-lg`
- Table card title/code block: `title-lg` + `label-sm`
- Metadata row labels: `label-sm`
- Metadata row values: `body-md` or `label-md`
- Availability/status chips: `label-sm`

## 7.4 Notifications and reviews

- Notification title: `title-md`
- Notification body: `body-md`
- Timestamp/meta: `body-sm`
- Review headline: `title-lg`
- Review text: `body-md`

## 7.5 Admin dashboard

- Dashboard title: `headline-lg`
- Widget title: `title-lg`
- KPI value: `title-md` (or `headline-md` for major KPI cards)
- KPI label/meta: `label-sm` or `body-sm`

---

## 8) Readability and Accessibility Contract

## 8.1 Readability

- Default body text is 16px with line-height >= 1.5.
- Maintain 50-75 character line lengths where possible.
- Never exceed 80 characters for body containers.
- Use left-aligned text for paragraphs.

## 8.2 Accessibility

- Meet WCAG AA contrast in all states.
- Keep button/interactive text legible at zoom 200%.
- Do not convey status using color only; pair color with text label.
- Preserve semantic heading order in templates (`h1` -> `h2` -> `h3`).
- Ensure text remains readable in high density admin data views.

---

## 9) Angular 21 Implementation Standard

## 9.1 File placement

- Global typography tokens:
  - `src/styles.scss` or
  - `src/styles/_tokens.scss` imported by `src/styles.scss`
- Feature/component styling remains in each `styleUrl` file.
- Do not use inline style attributes for typography.

## 9.2 Token architecture

- Keep font family, size, line-height, weight, and measure as CSS variables.
- Expose semantic utility classes for roles.
- Use these utility classes in templates where role intent is explicit.

## 9.3 Component layer mapping

If using Angular Material or headless components:
- Map shared typography tokens onto component selectors globally.
- Do not create one-off local overrides unless documented as exception.

---

## 10) Reference Token Template

```scss
:root {
  --font-family-primary: 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  --font-family-headline: 'Manrope', 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --type-display-xl-size: 56px;
  --type-display-xl-line: 1.1;

  --type-headline-lg-size: 36px;
  --type-headline-lg-line: 1.2;

  --type-headline-md-size: 30px;
  --type-headline-md-line: 1.25;

  --type-title-lg-size: 24px;
  --type-title-lg-line: 1.3;

  --type-title-md-size: 20px;
  --type-title-md-line: 1.35;

  --type-body-lg-size: 18px;
  --type-body-lg-line: 1.65;

  --type-body-md-size: 16px;
  --type-body-md-line: 1.6;

  --type-body-sm-size: 14px;
  --type-body-sm-line: 1.55;

  --type-label-md-size: 14px;
  --type-label-md-line: 1.4;

  --type-label-sm-size: 12px;
  --type-label-sm-line: 1.35;

  --measure-reading: 72ch;
  --measure-reading-max: 80ch;
}

@media (max-width: 768px) {
  :root {
    --type-display-xl-size: 40px;
    --type-headline-lg-size: 30px;
    --type-headline-md-size: 26px;
    --type-title-lg-size: 22px;
    --type-title-md-size: 18px;
    --type-body-lg-size: 17px;
  }
}
```

---

## 11) Reference Utility Class Template

```scss
.type-display-xl {
  font-family: var(--font-family-headline);
  font-size: var(--type-display-xl-size);
  line-height: var(--type-display-xl-line);
  font-weight: var(--font-weight-bold);
}

.type-headline-lg {
  font-family: var(--font-family-headline);
  font-size: var(--type-headline-lg-size);
  line-height: var(--type-headline-lg-line);
  font-weight: var(--font-weight-bold);
}

.type-title-lg {
  font-family: var(--font-family-headline);
  font-size: var(--type-title-lg-size);
  line-height: var(--type-title-lg-line);
  font-weight: var(--font-weight-semibold);
}

.type-body-md {
  font-size: var(--type-body-md-size);
  line-height: var(--type-body-md-line);
  font-weight: var(--font-weight-regular);
}

.type-label-md {
  font-size: var(--type-label-md-size);
  line-height: var(--type-label-md-line);
  font-weight: var(--font-weight-semibold);
}

.type-status {
  font-size: var(--type-label-sm-size);
  line-height: var(--type-label-sm-line);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.text-measure {
  max-inline-size: var(--measure-reading);
}
```

---

## 12) Angular Template Usage Examples

```html
<section>
  <h1 class="type-headline-lg">Booking Management</h1>
  <p class="type-body-md text-measure">
    Monitor table status by floor, verify availability, and create reservations quickly.
  </p>

  <article>
    <h2 class="type-title-lg">Window Table 04</h2>
    <p class="type-body-sm">Floor 2, 4 seats</p>
    <p class="type-title-md">420,000 VND</p>
    <span class="type-status">Available</span>
    <button class="type-label-md">Create Reservation</button>
  </article>
</section>
```

---

## 13) Product, Design, and Engineering Handoff Rules

## 13.1 Product requirements format

Every new screen spec must include:
- role mapping per text element (not raw px only)
- CTA priority level
- status text semantics
- max body line width intent

## 13.2 Design handoff format

Figma text styles must match semantic roles by name:
- `Type/Display/XL`
- `Type/Headline/LG`
- `Type/Headline/MD`
- `Type/Title/LG`
- `Type/Title/MD`
- `Type/Body/LG`
- `Type/Body/MD`
- `Type/Body/SM`
- `Type/Label/MD`
- `Type/Label/SM`

No undocumented one-off text styles in final handoff.

## 13.3 Engineering acceptance rules

- No hardcoded font-size in templates.
- Avoid ad hoc sizes in component styles unless exception ticket exists.
- Reuse token utility roles or role-based component selectors.

---

## 14) QA Checklist (Required Before Merge)

1. Body text is 16px+ on reading surfaces.
2. Long-form text does not exceed 80ch.
3. No justified body text.
4. CTA, price, status, and availability are visually distinct and scannable.
5. Text passes contrast checks in normal + hover + disabled states.
6. 200% zoom preserves hierarchy and readability.
7. Screen uses semantic role classes/tokens, not ad hoc styles.
8. Mobile typography scale switches correctly at breakpoint.

---

## 15) Anti-Patterns (Do Not Do)

- Mixing 3+ font families in one product surface.
- Styling body copy with decorative font.
- Converting all labels to uppercase by default.
- Making status badges depend on color alone.
- Using one-off local typography values to "match screenshot".
- Skipping role mapping for admin tables and operational dialogs.

---

## 16) Governance and Versioning

Owner roles:
- Product Design Lead: role-map integrity
- Frontend Lead: token implementation integrity
- QA Lead: accessibility and consistency checks

Change policy:
- Any role-map change requires:
  1. reason for change
  2. impacted surfaces list
  3. migration plan
  4. approval from Design + Frontend owners

Versioning recommendation:
- Keep this file versioned in git.
- Add short changelog entries at the bottom for each role-map update.

---

## 17) Quick Decision Tree

Use this when unsure which role to apply:

1. Is this the main screen identity title?
   - Yes -> `headline-lg`
2. Is this a section heading under the page title?
   - Yes -> `headline-md`
3. Is this card/dialog/feature heading?
   - Yes -> `title-lg`
4. Is this default paragraph content?
   - Yes -> `body-md`
5. Is this metadata/helper text?
   - Yes -> `body-sm` or `label-sm`
6. Is this interactive control text (button/field label)?
   - Yes -> `label-md`
7. Is this compact status chip?
   - Yes -> `label-sm` + status styling

If still unclear, choose the smaller role that preserves readability and scan speed, then validate in context.
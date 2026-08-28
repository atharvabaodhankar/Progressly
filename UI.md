---
name: warm-editorial-ui
description: Design system and build instructions for the "Warm Editorial" UI style — cream paper surfaces, dark ink text, serif display headings paired with a practical sans, lavender selection states, generous rounding, and flat elevation. Apply to ANY frontend work (landing pages, dashboards, SaaS apps, blogs, e-commerce, portfolios) unless the user explicitly asks for a different visual direction.
---

# Warm Editorial — UI Design System & Build Instructions

> **For Claude / Claude Code:** This file is the single source of truth for visual design.
> Whenever you build, restyle, or extend a frontend in this project:
> 1. Set up the **design tokens** (Section 2) and **fonts** (Section 3) FIRST, before writing any component.
> 2. Build components from the **recipes** (Section 7). Do not invent new colors, radii, shadows, or font sizes — compose from tokens.
> 3. Adapt to the site type using **Section 12** (this system is intentionally flexible).
> 4. Before finishing, run the **checklist** (Section 14).
>
> If the user supplies their own brand colors or fonts, **keep the token names and all structural rules; only swap the token values** (see 12.4).

---

## 1. Design philosophy

A warm, editorial, "paper and ink" aesthetic:

- **Canvas is paper**: near-white warm cream, never pure white, never cold gray.
- **Text is ink**: deep warm brown-black, never pure #000.
- **Serif for voice, sans for work**: serif display type carries personality in headings and hero moments; a practical sans handles navigation, labels, body, buttons, and data.
- **Soft geometry**: generous corner rounding everywhere; full-round pills for selection and tags.
- **Flat elevation**: hierarchy comes from surface contrast, tinted panels, and hairline borders — not from heavy drop shadows.
- **One lavender moment**: lavender (#BAABFF) marks "this is active/selected." Use it sparingly so it always means something.
- **Warm accent, used with restraint**: burnt orange is for emphasis and primary energy, not for flooding the page.
- **Calm density**: large whitespace, big section gaps, editorial headings. The page should feel like a well-set magazine, not a control panel.
- **Every state designed**: default, hover, pressed, selected, disabled, loading (skeleton), empty, and error are explicit — never an afterthought.

---

## 2. Design tokens

Tokens are RGB channel triplets so alpha variants are trivial: `rgb(var(--color-ink) / 0.6)`.
**Never hardcode hex values in components. Always consume tokens.**

### 2.1 Core palette (light theme — default)

| Token | RGB channels | Hex | Use |
|---|---|---|---|
| `--color-ink` | `31 26 20` | `#1F1A14` | Primary text, dark buttons, dark cards, active icons |
| `--color-paper` | `255 250 240` | `#FFFAF0` | Page background |
| `--color-cream` | `244 241 234` | `#F4F1EA` | Section panels, secondary surfaces, skeleton base |
| `--color-line` | `224 216 197` | `#E0D8C5` | Hairline borders, dividers |
| `--color-muted` | `107 95 79` | `#6B5F4F` | Secondary text, metadata, placeholder |
| `--color-accent` | `196 74 26` | `#C44A1A` | Primary warm accent: links, emphasis, key CTAs |
| `--color-accent-2` | `232 155 92` | `#E89B5C` | Soft accent: hovers, highlights, illustration |
| `--color-select` | `186 171 255` | `#BAABFF` | Lavender: active nav pill, selected states, focus tint |

### 2.2 Functional colors

| Token | RGB | Hex | Use |
|---|---|---|---|
| `--color-success` | `45 122 62` | `#2D7A3E` | Success text/icons, "completed" badges |
| `--color-warning` | `214 158 46` | `#D69E2E` | Warnings |
| `--color-danger` | `169 50 38` | `#A93226` | Destructive actions, errors |
| `--color-info` | `58 108 158` | `#3A6C9E` | Informational |

### 2.3 Pastel card tints (content families / categories)

Use these to differentiate content cards, categories, or product families. Pair each tint with a slightly darker border of the same hue and ink text.

| Token | RGB | Approx | 
|---|---|---|
| `--tint-lavender` | `240 235 253` | soft purple |
| `--tint-butter` | `250 243 215` | soft yellow |
| `--tint-blush` | `251 234 232` | soft pink |
| `--tint-sage` | `232 242 232` | soft green |
| `--tint-sky` | `230 240 248` | soft blue |

### 2.4 Dark theme (derived — same hues, inverted values)

Apply via `[data-theme="dark"]` or `.dark` on `<html>`. Structure, spacing, and hierarchy stay identical; only surface values swap.

| Token | Dark value (RGB) | Hex |
|---|---|---|
| `--color-ink` (text) | `244 241 234` | `#F4F1EA` |
| `--color-paper` (page) | `20 17 13` | `#14110D` |
| `--color-cream` (panels) | `31 27 21` | `#1F1B15` |
| `--color-line` | `62 54 43` | `#3E362B` |
| `--color-muted` | `168 156 137` | `#A89C89` |
| `--color-accent` | `224 106 54` | `#E06A36` (brightened for contrast) |
| `--color-select` | `186 171 255` | unchanged — verify contrast on dark |

Dark-mode rules: dim pastel tints to ~12% alpha overlays of their hue; keep gradients on feature cards (they already sit on dark bases); the theme toggle is a compact moon/sun icon button.

### 2.5 Radius, borders, elevation

| Token | Value | Use |
|---|---|---|
| `--radius-shell` | `32px` | Page-level panels, modals, hero sections, large containers |
| `--radius-card` | `16px` | Cards, inputs, dropdown menus |
| `--radius-control` | `12px` | Buttons (non-pill), small controls |
| `--radius-pill` | `9999px` | Pills, tags, nav active state, CTAs, tabs |
| `--border-hairline` | `1px solid rgb(var(--color-line))` | Default border |
| `--shadow-soft` | `0 8px 30px rgb(var(--color-ink) / 0.08)` | Modals, popovers, floating elements ONLY |
| `--overlay` | `rgb(23 23 23 / 0.88)` + `backdrop-filter: blur(4px)` | Modal backdrop |

**Elevation rule:** flat by default. Cards get a hairline border or a tinted surface — not a shadow. Shadows are reserved for things that float (modals, dropdowns, toasts, floating action buttons).

### 2.6 Spacing scale

Base unit **4px**. Common steps: 4, 8, 12, 16, 24, 32, 40, 64, 96.

| Token | Value | Use |
|---|---|---|
| `--space-panel` | `24px` mobile → `40px` desktop | Internal padding of panels/sections |
| `--space-section` | `48px` mobile → `96px` desktop | Vertical gap between page sections |
| `--space-card-gap` | `16–24px` | Gap in card grids |
| Sidebar width | `220px` | Desktop persistent nav |
| Nav row height | `48px` primary / `44px` secondary (indented) |
| Content max-width | `1120px` app · `1200px` marketing · `72ch` article prose |

---

## 3. Typography

### 3.1 Font stacks

```css
--font-sans: "Figtree", ui-sans-serif, system-ui, "Inter", sans-serif;
--font-display: "Fraunces", "P22 Mackinac", Georgia, serif;
```

- **Figtree** (Google Fonts, free) — all UI: body, nav, labels, buttons, metadata, tables, forms.
- **Fraunces** (Google Fonts, free) — display serif for headings and hero moments. (The original inspiration uses P22 Mackinac, a commercial font; Fraunces is the drop-in free equivalent. If the project owns a Mackinac license, put it first in the stack.)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap" rel="stylesheet">
```

### 3.2 Type scale

| Role | Font | Size / line-height | Weight | Tracking | Notes |
|---|---|---|---|---|---|
| Hero (marketing only) | display | `clamp(2.75rem, 6vw, 4rem)` / 1.15 | 500 | `-0.02em` | One per page max |
| H1 / page title | display | `clamp(2rem, 4vw, 2.75rem)` / 1.4 | 500 | `-0.5px` | e.g. "Good morning, Priya" |
| H2 / section title | display | `1.5rem` / 1.3 | 500 | `-0.25px` | Or sans 600 inside dense app panels |
| H3 / card title | sans | `1.125rem` / 1.35 | 600 | 0 | |
| Body | sans | `1rem` / `1.5` (16/24) | 400 | 0 | Baseline |
| Small / metadata | sans | `0.875rem` / 1.45 | 400–500 | 0 | `--color-muted` |
| Eyebrow / micro-label | sans | `0.75rem` / 1.2 | 600 | `+0.08em`, UPPERCASE | e.g. "ROADMAP", "TOTAL", "STREAK" |
| Big stat number | sans | `2–2.75rem` / 1.1 | 600 | `-0.01em` | Paired with an eyebrow label below/above |
| Button label | sans | `0.9375–1rem` | 600 | 0 | |

### 3.3 Typography rules

- Serif = voice: page titles, hero lines, greetings, modal titles, big editorial statements.
- Sans = work: **never** set navigation, buttons, form labels, table content, or dense controls in the serif.
- Uppercase micro-labels with letter-spacing are the system's signature metadata treatment — use them for category eyebrows on cards and stat labels.
- Body text max measure: 72ch. Muted color for anything secondary.
- Keep heading weights at 500 for the serif (it gets heavy fast); reserve 600 for sans emphasis.

---

## 4. Surfaces — the three-layer model

Every page is built from exactly three surface layers:

1. **Paper** (`--color-paper`) — the page background.
2. **Panel** (`--color-cream`, radius `--radius-shell`, padding `--space-panel`) — groups a section of related content. Panels sit directly on paper with no border needed (contrast does the work).
3. **Card** (sits inside a panel or on paper) — one of three variants:
   - **Neutral card**: paper/white surface, hairline `--color-line` border, radius `--radius-card`.
   - **Tinted card**: a pastel `--tint-*` background + a same-hue darker hairline border + ink text. Used for categorized content.
   - **Feature card**: dark base (`--color-ink` or a deep hue) with a vivid gradient or illustration, white text, and an eyebrow label. Used for hero content, showcase items, "explore" entries. Text over gradients always sits on the darkest region or over a subtle dark scrim.

Never nest a panel inside a panel. Panel → cards is the maximum depth.

---

## 5. Color usage rules

- Ink on paper is the default reading pair. Muted for secondary. Accent orange for links, key emphasis, and small energetic touches — if more than ~5% of the page is accent-colored, dial back.
- **Lavender `--color-select` exclusively means "current/selected/active"**: the active nav item pill, a selected card, the active tab. Never use it decoratively.
- Selection is **never color-only**: pair lavender with a visible border, a checkmark, or bolder text (accessibility requirement).
- Functional colors (success/warning/danger/info) appear as text+icon or small badges, not large fills.
- Pastel tints categorize; gradients showcase. Keep gradients contextual to their card — don't promote gradient colors into global tokens.
- Charts: use a series palette drawn from accent, accent-2, select, info, success — and always pair each series with a label or pattern, never color alone.

---

## 6. Iconography

- Compact line/outline icons (Lucide or similar), 20–24px, `1.5–2px` stroke, paired with text in nav and buttons.
- Icon-only buttons (close, back, theme toggle, carousel arrows, menu) are round or `--radius-control`, minimum 44×44px hit area, and **must** have an `aria-label`.
- Carousel/pagination arrows: circular, paper surface, hairline border, ink icon.
- Optional signature: small colored rounded-square icon chips (a tint background + matching icon) to lead feature cards.

---

## 7. Component recipes

### 7.1 App shell (dashboards / apps)

- **Desktop**: persistent left sidebar (~220px) on paper; logo top; primary nav; collapsible groups with indented children; account row + settings + theme toggle at bottom. Main content is a centered flexible column with generous gutters.
- **Nav item**: 48px row, `--radius-pill`, icon + label, sans 500.
  - Default: transparent, ink text.
  - Hover: `rgb(var(--color-ink) / 0.05)` background.
  - **Active: `--color-select` pill, ink text, icon in a small dark rounded square.**
  - Child items: 44px, indented, no icon chip.
- **Mobile**: sidebar collapses to a menu button (≥44px) opening a full-height overlay with the same nav order and a visible close button.
- Optional signature: faint, thin, organic curved lines drawn in the sidebar background at very low opacity (decorative, `aria-hidden`).

### 7.2 Top nav variant (marketing sites)

Paper background, logo left, sans links center/right, one pill CTA (ink or accent). Sticky with a hairline bottom border appearing on scroll. Same active/hover rules as sidebar items.

### 7.3 Buttons

All buttons: sans 600, `--radius-pill`, 150–200ms ease transitions, visible `:focus-visible` ring (`2px rgb(var(--color-select))`, offset 2px).

| Variant | Style | Use |
|---|---|---|
| Primary | `--color-ink` bg, paper text · hover: 90% opacity · pressed: scale 0.98 | Main action (1 per view) |
| Accent | `--color-accent` bg, white text | High-energy CTA (marketing hero, "Start") |
| Secondary | transparent bg, hairline border, ink text · hover: cream bg | Supporting actions |
| Ghost | transparent, ink/muted text · hover: `ink/5%` bg | Tertiary, toolbars |
| Destructive | `--color-danger` styling, requires confirmation step | Delete/remove |
| Disabled | `ink/35%` on `cream`, `cursor: not-allowed`, native `disabled` attr | **Always pair with a short helper line explaining what unlocks it** (e.g. "Select a topic to continue") |

Sizes: sm 36px · md 44px · lg 52px height. Full-width pill CTAs for primary progression in modals/forms.

### 7.4 Cards

Base: radius `--radius-card`, padding 20–24px, 200ms hover transition.

- **Neutral/list card**: paper bg + hairline border. Hover: border darkens slightly or bg → cream. May carry an overflow "more" menu (⋯) top-right.
- **Tinted card**: pastel `--tint-*` bg, same-hue darker border, category pill top-left, eyebrow + title, optional footer metadata.
- **Feature/showcase card**: dark/gradient bg, white text, eyebrow label, bottom-aligned title, right-facing chevron affordance. Whole card is a single `<a>` or `<button>`.
- **Selectable card**: adds `aria-pressed`; selected = `--color-select` border (2px) + subtle lavender tint + a checkmark. Selecting enables the flow's Continue button.
- **Skeleton card**: large rounded blocks in `--color-cream` with a 1.2s shimmer sweep; container sets `aria-busy="true"`.

### 7.5 Pills, tags, badges

- **Category pill**: `--radius-pill`, 24–28px height, 12px sans 600, uppercase optional; solid ink, solid tint, or outlined.
- **Tabs (pill tabs)**: row of pills; active = ink bg + paper text (or lavender + ink); inactive = transparent + muted text; hover = cream.
- **Status badge**: small pill with dot or icon + label (e.g. green "Completed").

### 7.6 Forms & inputs

- Input/textarea/select: paper bg, hairline border, `--radius-card`, 44px min height, 12–16px padding; label above in sans 500 (never placeholder-as-label).
- Focus: border → `rgb(var(--color-select))` + 2px focus ring. Error: `--color-danger` border + small error text below explaining the fix. 
- Toggles/checkboxes/radios: ink when on, 44px hit area.
- Form layout inside a panel: single column, 16–24px field gaps, full-width pill primary CTA at the end.

### 7.7 Modals & dialogs

- Backdrop: `--overlay` (dark 88% + slight blur).
- Panel: paper bg, `--radius-shell` (32px), max-width ~848px (or 560px for simple dialogs), max-height `calc(100vh - 32px)`, internal scroll on the body.
- Header: back (icon, optional) · title (serif display, ~28–32px) or step progress · close (icon). Multi-step flows show numbered circles + labels; completed steps get a check.
- Footer: full-width or right-aligned pill CTA; disabled until requirements met (+ helper text).
- Behavior: focus moves into the modal on open, is trapped, and returns to the trigger on close; Esc and backdrop click dismiss (confirm first if data would be lost).

### 7.8 Menus & dropdowns

Anchored to trigger; paper bg, `--radius-card`, hairline border, `--shadow-soft`; items 40–44px with icon + label; destructive items separated by a divider and colored `--color-danger`. Dismiss on outside click, Esc, or navigation. Trigger exposes `aria-expanded` + `aria-haspopup`.

### 7.9 Stat rows & data display

- **Stat row**: a cream panel with 2–4 stats separated by vertical hairlines. Each stat = uppercase eyebrow label (muted) + big sans number.
- **Tables**: sans throughout; header row = eyebrow style; row hover = cream; hairline row dividers only (no vertical grid lines); numeric columns right-aligned.
- **Charts**: minimal axes, hairline grid, labeled series (see Section 5), rounded bar corners (4–6px).

### 7.10 Feedback states

- **Loading**: skeletons mirroring final layout (never spinners for page loads; small spinner OK inside a pressed button).
- **Empty**: an invitation, not a void — icon/illustration, one line of what belongs here, one CTA to create it.
- **Error**: what went wrong + how to fix it, in plain language; retry action where possible. Never a bare "Something went wrong."
- **Toast**: bottom or top-right, ink bg + paper text, `--radius-card`, slide+fade in ~300ms, auto-dismiss 4–6s, offer Undo for reversible actions.

### 7.11 Hero (marketing pages)

Paper bg, serif hero line (one idea, not three), one short muted sub-line, one accent or ink pill CTA + optional ghost secondary, generous top/bottom padding (96–160px). Optional: one feature-card visual or subtle warm illustration. No stat-strip-with-gradient clichés unless the content truly is stats.

### 7.12 Footer

Cream panel or hairline-topped paper section; sans links in muted; serif wordmark optional; keep it quiet.

---

## 8. Motion

- **Durations**: 150ms (micro: hover, press) · 200–300ms (standard: menus, tabs, toasts, modal fade) · 500–700ms (feature: card flips, carousels, celebratory moments) · 1000ms+ only for ambient loops.
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out) as the default; a gentle spring/custom bezier for feature moments.
- **Skeleton shimmer**: 1.2s linear infinite gradient sweep.
- Motion must be **purposeful**: state changes, entrances, and feedback — not decoration on everything. One orchestrated moment beats ten scattered effects.
- **Always** implement:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 9. Responsive rules

Breakpoints: `640 / 768 / 1024 / 1280 / 1536` (Tailwind defaults align). Behavior is driven by available space, not device sniffing.

- **≥1024px**: persistent sidebar (apps), multi-column card grids, panel padding 40px.
- **640–1023px**: sidebar → menu button; grids drop columns; horizontal card rows become swipe/overflow-scroll rows with visible affordance.
- **<640px**: single column; cards stack; panel padding 24px; headings clamp (see type scale) so they never collide; modals go near-full-screen with 16px viewport padding and the primary CTA always reachable (sticky footer if the body scrolls).
- Test at **320px and 375px**: no horizontal page overflow, ever.
- Touch targets ≥44×44px on coarse pointers.

---

## 10. Accessibility (non-negotiable)

1. Semantic HTML: `<a>` navigates, `<button>` acts — including clickable cards.
2. Every icon-only control has an `aria-label` ("Close", "Back", "Open menu", "Switch to dark mode").
3. Selected/active states use a non-color indicator (border, check, weight) in addition to lavender.
4. Selectable cards expose `aria-pressed`; menu triggers expose `aria-expanded`; skeleton regions set `aria-busy` (without noisy live announcements).
5. Disabled CTAs use the native `disabled` attribute AND a visible requirement hint.
6. Visible `:focus-visible` ring on every interactive element (2px lavender, 2px offset).
7. Contrast: run WCAG AA checks on ink/paper (passes), muted/paper, accent text, and **especially anything on lavender and everything in dark mode**. Fix by darkening text, not by shrinking it.
8. Modals: focus trap + focus restore.
9. `prefers-reduced-motion` respected (Section 8).
10. Full keyboard pass: shell → tabs → cards → modal steps → menus, in a sensible order, including horizontal scroll rows.

---

## 11. Content & microcopy voice

- Sentence case everywhere except uppercase eyebrows. Plain verbs on buttons: "Save changes", "Create roadmap" — never "Submit".
- An action keeps its name through the flow ("Publish" button → "Published" toast).
- Errors say what happened and what to do; empty states invite the first action; disabled states say what unlocks them.
- Warm but efficient. No filler, no exclamation-mark enthusiasm.

---

## 12. Adapting this system to any website (flexibility rules)

The tokens and rules above are the **constants**. The composition changes by site type:

### 12.1 Site-type mapping

| Site type | Shell | Emphasis | Notes |
|---|---|---|---|
| Marketing / landing | Top nav (7.2) + hero (7.11) + panel sections + footer | Serif hero, whitespace, one accent CTA | Feature cards for showcase; tinted cards for feature grids |
| SaaS / dashboard app | Sidebar shell (7.1) | Panels, stat rows, tables, skeletons | Serif only for page title/greeting; everything else sans |
| Blog / docs | Top nav, article column ≤72ch | Serif H1/H2, 16/1.6 body, generous margins | Cream panels for callouts/code; hairline TOC |
| E-commerce / catalog | Top nav + filter rail | Tinted cards per category, neutral product cards, pill filters | Accent for price/CTA only |
| Portfolio / showcase | Minimal top nav | Dark gradient feature cards, serif statements | Spend the boldness on the work, keep chrome quiet |
| Auth / onboarding | Centered 32px-radius panel on paper | Serif title, single-column form, full-width pill CTA | Multi-step → numbered progress header (7.7) |

### 12.2 What is core vs optional

- **Core (always)**: token names, paper/panel/card layering, serif+sans pairing, pill selection language, flat elevation, hairlines, state coverage, accessibility rules, motion rules.
- **Optional (use when they fit)**: floating assistant bubble, sidebar curve decoration, carousel with dot+step counter, avatar builders, gradient feature cards, dark mode toggle placement.

### 12.3 Tone dial

- **Playful / consumer** (default): pastel tints, illustrated feature cards, greeting headlines.
- **Serious / corporate**: drop pastels to one tint family or none, keep cream/ink/line, keep serif headings — the system reads premium-editorial instead of friendly.
- Never change: rounding, flatness, typography pairing logic, state rules.

### 12.4 If the user has a brand

Map brand values onto existing token names: brand primary → `--color-accent`; brand neutral family → paper/cream/line/ink equivalents (keep them warm-shifted if possible); pick ONE brand-adjacent hue for `--color-select`. Keep all structural, spacing, motion, and accessibility rules unchanged. If brand fonts exist: brand display → `--font-display`, brand text → `--font-sans`; otherwise keep Fraunces + Figtree.

### 12.5 Per-project signature

Each build should have **one** memorable signature element consistent with this system (an unusual hero treatment, a distinctive card interaction, an ambient illustration, a clever empty state). Choose it deliberately, keep everything else disciplined.

---

## 13. Setup snippets

### 13.1 Plain CSS (works with any stack) — paste as `tokens.css`

```css
:root {
  /* palette */
  --color-ink: 31 26 20;
  --color-paper: 255 250 240;
  --color-cream: 244 241 234;
  --color-line: 224 216 197;
  --color-muted: 107 95 79;
  --color-accent: 196 74 26;
  --color-accent-2: 232 155 92;
  --color-select: 186 171 255;
  --color-success: 45 122 62;
  --color-warning: 214 158 46;
  --color-danger: 169 50 38;
  --color-info: 58 108 158;
  --tint-lavender: 240 235 253;
  --tint-butter: 250 243 215;
  --tint-blush: 251 234 232;
  --tint-sage: 232 242 232;
  --tint-sky: 230 240 248;

  /* type */
  --font-sans: "Figtree", ui-sans-serif, system-ui, "Inter", sans-serif;
  --font-display: "Fraunces", "P22 Mackinac", Georgia, serif;

  /* shape & elevation */
  --radius-shell: 32px;
  --radius-card: 16px;
  --radius-control: 12px;
  --radius-pill: 9999px;
  --shadow-soft: 0 8px 30px rgb(31 26 20 / 0.08);

  /* motion */
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --dur-fast: 150ms;
  --dur-med: 250ms;
  --dur-slow: 600ms;
}

[data-theme="dark"] {
  --color-ink: 244 241 234;
  --color-paper: 20 17 13;
  --color-cream: 31 27 21;
  --color-line: 62 54 43;
  --color-muted: 168 156 137;
  --color-accent: 224 106 54;
}

body {
  background: rgb(var(--color-paper));
  color: rgb(var(--color-ink));
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

h1, h2, .display {
  font-family: var(--font-display);
  font-weight: 500;
  letter-spacing: -0.5px;
}

:focus-visible {
  outline: 2px solid rgb(var(--color-select));
  outline-offset: 2px;
}
```

### 13.2 Tailwind

**v4** — add to the main CSS file:

```css
@import "tailwindcss";

@theme {
  --color-ink: #1F1A14;
  --color-paper: #FFFAF0;
  --color-cream: #F4F1EA;
  --color-line: #E0D8C5;
  --color-muted: #6B5F4F;
  --color-accent: #C44A1A;
  --color-accent-2: #E89B5C;
  --color-select: #BAABFF;
  --font-sans: "Figtree", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Fraunces", Georgia, serif;
  --radius-shell: 32px;
  --radius-card: 16px;
}
```

**v3** — extend `theme.colors` and `theme.fontFamily` in `tailwind.config.js` with the same names/values (use the `rgb(var(--x) / <alpha-value>)` pattern if alpha utilities are needed). Then use classes like `bg-paper text-ink border-line rounded-[32px] font-display`.

---

## 14. Pre-delivery checklist

Before presenting any UI built with this system, verify:

- [ ] Fonts loaded (Fraunces + Figtree); serif only on headings/hero, sans everywhere else
- [ ] Zero hardcoded colors/radii/shadows — everything from tokens
- [ ] Page = paper → panels → cards (max depth respected, no nested panels)
- [ ] Active/selected = lavender pill AND a non-color indicator
- [ ] Exactly one primary CTA per view; disabled CTAs explain what unlocks them
- [ ] Hover, pressed, selected, disabled, loading (skeleton), empty, and error states exist for interactive/data components
- [ ] Flat elevation: shadows only on floating elements; hairline borders elsewhere
- [ ] Icon-only buttons have `aria-label`s; focus-visible ring works via keyboard
- [ ] Modal: 32px radius, dark blurred backdrop, focus trap + restore, Esc closes
- [ ] `prefers-reduced-motion` block present; transitions use system durations/easing
- [ ] Responsive checked at 320 / 375 / 768 / 1280 — no horizontal overflow
- [ ] Contrast spot-checked: muted-on-paper, text-on-lavender, dark mode pairs
- [ ] Dark mode (if in scope) swaps tokens only — layout/hierarchy identical
- [ ] One deliberate signature element; everything else quiet

## 15. Anti-patterns — never do these

- Pure white `#FFF` backgrounds or pure black `#000` text
- Cold grays anywhere (all neutrals stay warm)
- Heavy drop shadows on resting cards; borders + shadows stacked together
- Serif in buttons, nav, forms, or tables
- Lavender used decoratively (it only ever means active/selected)
- Color-only selection states; placeholder text used as a label
- Spinners for page loads (use layout-matching skeletons)
- Sharp corners (<8px radius) on any visible container
- More than one accent-colored primary CTA competing in a view
- Blank empty states or vague "Something went wrong" errors

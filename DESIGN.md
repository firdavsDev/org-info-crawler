---
name: OrgInfo Crawler
description: Internal registry lookup for Uzbek organizations by TIN, with a stable API behind it.
colors:
  primary: "oklch(0.205 0 0)"
  primary-foreground: "oklch(0.985 0 0)"
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  sidebar: "oklch(0.985 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  accent: "oklch(0.97 0 0)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  state-queued: "oklch(50% 0.134 242.749)"
  state-processing: "oklch(55.5% 0.163 48.998)"
  state-ready: "oklch(50.8% 0.118 165.612)"
typography:
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.333
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4286
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
  data-mono:
    fontFamily: "Geist Mono Variable, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4286
    fontFeature: "\"tnum\""
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "6px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  header: "64px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-lg:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0 24px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-outline-hover:
    backgroundColor: "{colors.accent}"
  input-tin:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.data-mono}"
    rounded: "{rounded.md}"
    height: "40px"
  chip-recent:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.data-mono}"
    rounded: "{rounded.full}"
    padding: "0 8px"
    height: "24px"
  card-record:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
  badge-status:
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  nav-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "32px"
---

# Design System: OrgInfo Crawler

## Overview

**Creative North Star: "The Registry Ledger"**

A quiet, grayscale working surface whose only job is to hold a record legibly. The system is stock shadcn/ui new-york on the neutral base, applied with discipline rather than restyled: two neutral layers (a sidebar shell and a rounded inset panel), hairline borders, near-flat cards, and Geist throughout. Everything decorative has been left out so that a legal name, a nine-digit TIN, or a founder's share reads at a glance.

Density is moderate and even. Record facts sit in a two-column definition grid, grouped under small medium-weight headings and divided by full-width separators. Identifiers are always set in Geist Mono with tabular numerals, which makes codes, TINs, timings and percentages line up and read as data rather than prose.

Color is almost absent. Chroma appears only when the system has something to say about a crawl's state, and each state owns exactly one hue. Light and dark are both first-class, follow the operating system by default, and are switched from the user menu.

**Key Characteristics:**
- Two neutral layers: sidebar shell plus a rounded, softly lifted inset panel.
- Grayscale everywhere except crawl-state accents and the destructive red.
- Geist Sans for interface, Geist Mono with tabular numerals for every identifier and number.
- Definition-list records: muted labels in an 11rem column, values in the foreground.
- Hairline borders and at most a 1-3px ambient shadow; no heavy elevation.
- Lucide line icons at 16px (12px inside badges and steppers).

## Colors

A neutral grayscale ramp (zero chroma) carries the whole interface; four saturated hues are reserved for state.

### Primary
- **Ink Black** (primary): Primary buttons, the brand tile in the sidebar, completed stepper dots, and the progress bar fill while a crawl is running. In dark mode it inverts to near-white (oklch(0.922 0 0)) with near-black text.

### Neutral
- **Paper White** (background, card): The inset content panel and every card surface in light mode.
- **Shell Gray** (sidebar): The sidebar layer and login backdrop, one step off white so the inset panel reads as a sheet laid on it.
- **Ink** (foreground): All primary text and record values.
- **Pencil Gray** (muted-foreground): Definition-list labels, descriptions, helper text, upcoming stepper labels, and icons inside menus.
- **Wash** (muted, accent): Hover and active fills, skeleton blocks, the progress track, table header rows (at 50%), and code block backgrounds (at 50%).
- **Hairline** (border, input): Card, table and input strokes, separators, the dashed empty-state outline, and the scrollbar thumb.
- **Focus Gray** (ring): The 3px focus ring, always at 50% opacity.

In dark mode the inset panel is the darkest layer (oklch(0.145 0 0)), while the sidebar and cards share a lifted charcoal (oklch(0.205 0 0)), so cards read as raised plates on a darker panel. Borders become white at 10% and inputs white at 15%.

### State accents
- **Queued Sky** (state-queued): Queued badge text; badge fill is sky-500 at 10%, border sky-600 at 20%. Dark text uses sky-300.
- **Processing Amber** (state-processing): Processing badge text; fill amber-500 at 10%, border amber-600 at 25%. Dark text uses amber-300.
- **Ready Emerald** (state-ready): Ready badge text and the completed progress bar fill (emerald-600, emerald-400 in dark). Fill emerald-500 at 10%, border emerald-600 at 20%. Dark text uses emerald-300.
- **Signal Red** (destructive): Failed badge, failed stepper dot, error text, destructive alerts, and invalid-field borders.
- Not found is deliberately neutral: muted fill, border stroke, muted-foreground text.

### Named Rules
**The State-Owns-Color Rule.** Chroma is spent only on crawl state: sky for queued, amber for processing, emerald for ready, red for failed, gray for not found. Nothing else in the interface is colored, and no state hue is reused for decoration. One functional exception: the TIN digit counter uses emerald for a valid length and amber at the 14-digit maximum, carried over from the previous UI's input feedback.

**The Tinted-Chip Rule.** A state is shown as a pale tint of its hue (10% fill, 20-25% border) with a darker text shade and a matching Lucide icon, never as a solid saturated block.

## Typography

**Display Font:** Geist Variable (with ui-sans-serif, system-ui)
**Body Font:** Geist Variable
**Label/Mono Font:** Geist Mono Variable (with ui-monospace, SFMono-Regular)

**Character:** A single neo-grotesque family in a narrow weight band (400-600), paired with its own monospace for data. The pairing reads as instrument-panel rather than editorial.

### Hierarchy
- **Headline** (600, 1.5rem, 1.333, -0.025em): The one page title per view ("Organization lookup", "API documentation").
- **Title** (600, 1.125rem, 1.375): Card titles, which carry the organization name or "TIN 304918546" in mono before a name is known.
- **Section** (500, 0.875rem): Record group headings (Organization, Registration, Leadership and ownership, Contacts) and docs subsections.
- **Body** (400, 0.875rem, 1.4286): Record values, descriptions, table cells. Docs descriptions cap at the prose measure (65ch).
- **Label** (500, 0.75rem): Badges, sidebar group labels, the "Recent" label, stepper labels, request meta.
- **Data Mono** (400, same size as its context, tabular numerals): TINs, THSHT/DBIBT/IFUT codes, phone numbers, shares, elapsed ms and request ids, digit counters, HTTP methods and paths, code blocks (0.75rem, 1.625).

### Named Rules
**The Tabular Identifier Rule.** Any value a user might compare, copy or paste into a payment form (TINs, registry codes, phones, percentages, timings) is set in Geist Mono with tabular numerals. Names and addresses stay in Geist Sans.

**The Sentence-Case Rule.** Headings, labels and buttons are sentence case at normal tracking. Uppercase appears only where the data itself is uppercase (registry names, HTTP methods).

## Layout

The shell is the shadcn sidebar-08 inset layout. At md (768px) and up, a 16rem sidebar sits on the shell layer and the content panel is inset by 8px (no left margin), with rounded 14px corners and a soft shadow. The sidebar collapses to an icon rail with Cmd/Ctrl+B. Below md the sidebar becomes a sheet, the panel goes edge to edge, and navigating closes the sheet.

The inset header is 64px tall: sidebar trigger, a 16px vertical separator, and a breadcrumb whose last crumb is the TIN in mono. Content sits in a left-aligned column capped at 64rem (max-w-5xl) with 16px side padding (24px at md) and 40px bottom padding. Page stacks use a 24px gap; the title block uses 6px between headline and description.

Record facts use a two-column grid from sm (640px): an 11rem label column and a flexible value column with 24px column gap and 12px row gap. Below sm, each fact stacks label over value. Groups are divided by 20px-margin separators. Card headers and progress bands are separated from content by a bottom hairline rather than space.

## Elevation & Depth

Depth is tonal first. The shell-versus-panel contrast (and in dark mode, panel-versus-card) does most of the layering; shadows are ambient and small.

### Shadow Vocabulary
- **Hairline lift** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): Inputs, input groups, outline buttons.
- **Soft plate** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): Cards and the inset content panel.

### Named Rules
**The Near-Flat Rule.** Nothing is lifted more than the soft plate. Hierarchy comes from tone, borders and type weight, not from stacked shadows.

## Shapes

Gently rounded, from a single 10px base radius. Controls (buttons, inputs, tabs, code blocks' inner tables) use 8px; the brand tile, avatars and code blocks 10px; cards and the inset panel 14px. Pills (9999px) are reserved for status badges, recent-TIN chips, stepper dots and share bars. Borders are 1px hairlines; the only dashed strokes are the empty-state outline and the upcoming stepper dot.

## Components

### Buttons
Quiet and compact; the primary is the only filled control on a screen.
- **Shape:** gently rounded (8px).
- **Primary:** ink fill, near-white text, 36px tall (40px for the search submit, matched to the TIN field). Hover drops to 90% opacity.
- **Outline:** background fill, hairline border, soft hairline lift; hover fills with wash. Used for Export .xlsx, Retry crawl, and Swagger links, at 32px.
- **Ghost icon (24px):** copy controls beside record values, muted until hover; on fine pointers they fade in on row hover or focus over 150ms.
- **Focus:** 3px ring in focus gray at 50%. **Disabled:** 50% opacity.

### Chips
- **Recent TIN chip:** outline button at 24px, fully rounded, mono tabular text. The TIN currently shown gets a wash fill and a 30% foreground border.

### Status badge
- **Style:** fully rounded outline badge, 12px medium label with a 12px Lucide icon (Clock, LoaderCircle spinning, CircleCheck, CircleX, SearchX), tinted per the State-Owns-Color Rule. The processing spinner stops under reduced motion.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** card token; border hairline; soft plate shadow.
- **Record card:** no outer padding; a header band (20px vertical, 24px horizontal) holds title, mono TIN, status badge, request meta, and a right-aligned Export action, closed by a bottom hairline. Optional progress band, then content at 24px.
- **Empty state:** dashed hairline outline, a muted icon tile, a 1rem title, and a keyboard hint.

### Inputs / Fields
- **Style:** input group with hairline stroke, 8px radius, transparent fill (white at 15% in dark), leading search icon, mono tabular value, and a trailing addon that shows a `/` key hint when empty or a digit counter when filled.
- **Focus:** border shifts to ring gray plus a 3px ring at 50%.
- **Error:** destructive border and 20% destructive ring; a 12px destructive helper line below.

### Navigation
- **Sidebar:** brand button (32px ink tile with Building2 icon, name plus a muted subtitle), a Workspace group, a Recent searches group of mono TINs with a Hash icon and an actions menu, secondary external links pinned to the bottom, and the user button (initials avatar, username, "Staff account").
- **Items:** 32px rows, 14px text, 16px icon; hover and active fill with the sidebar accent. API Docs expands to its endpoints in 12px mono via a rotating chevron.
- **Mobile:** the sidebar becomes a sheet opened from the header trigger.

### Crawl stepper
The signature component. Three steps (Queued, Processing, Ready or the final outcome) joined by 1px connectors that darken to foreground at 30% once reached. Dots are 20px circles: complete is ink with a white check, current is outlined with a spinner, upcoming is dashed, failed is red with CircleX, not found is muted with SearchX. Below: a live status line with a mono percentage, a 6px progress bar whose indicator transitions over 200ms and turns emerald on ready, and a 12px note about the polling interval. While polling, the record area shows skeleton rows laid out on the same 11rem grid as the real record.

### Record definition list
Muted labels, foreground values, grouped under section headings. Founders render as a bordered table with a wash header row, external-link founder names, and right-aligned mono shares with a 64px pill bar at 70% foreground.

## Do's and Don'ts

### Do:
- **Do** set every identifier, code, share and timing in Geist Mono with tabular numerals.
- **Do** show crawl state with the tinted status badge and the stepper, using only the assigned state hue.
- **Do** lay records out as a definition list on the 11rem label column, grouped by section with separators.
- **Do** keep state transitions to 150-250ms and stop spinners under reduced motion.
- **Do** use Lucide line icons at 16px (12px inside badges, chips and stepper dots).
- **Do** design every surface in both light and dark, reading color only from the theme tokens.

### Don't:
- **Don't** introduce a brand hue or color any element that isn't carrying state or an error.
- **Don't** reuse a state hue (sky, amber, emerald) for input validation, decoration or emphasis.
- **Don't** lift anything beyond the soft plate shadow or add hard offset shadows.
- **Don't** set labels, headings or buttons in uppercase or wide tracking.
- **Don't** use emoji or glyph characters as icons.

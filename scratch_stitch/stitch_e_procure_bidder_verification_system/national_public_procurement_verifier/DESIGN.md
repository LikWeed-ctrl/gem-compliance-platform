---
name: National Public Procurement Verifier
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#44474d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#75777e'
  outline-variant: '#c5c6ce'
  surface-tint: '#505f7a'
  primary: '#000d23'
  on-primary: '#ffffff'
  primary-container: '#14233b'
  on-primary-container: '#7c8ba7'
  inverse-primary: '#b8c7e6'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fd'
  on-secondary-container: '#57657b'
  tertiary: '#000930'
  on-tertiary: '#ffffff'
  tertiary-container: '#001b62'
  on-tertiary-container: '#5f81ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#b8c7e6'
  on-primary-fixed: '#0c1c33'
  on-primary-fixed-variant: '#394761'
  secondary-fixed: '#d5e3fd'
  secondary-fixed-dim: '#b9c7e0'
  on-secondary-fixed: '#0d1c2f'
  on-secondary-fixed-variant: '#3a485c'
  tertiary-fixed: '#dce1ff'
  tertiary-fixed-dim: '#b7c4ff'
  on-tertiary-fixed: '#001551'
  on-tertiary-fixed-variant: '#0039b5'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  title-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-tabular:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  code-tabular-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system embodies civic authority, audit-grade verification, and high operational trust. Built for government procurement officers, vendor compliance controllers, and institutional evaluators, it strips away consumer ornament in favor of utilitarian clarity, high information density, and unyielding visual structure.

The design movement is **Corporate / Modern** anchored in institutional minimalism. Visual weight is communicated through precise boundary lines, deliberate information architecture, and structured spatial groupings rather than ambient visual effects. Every element serves an explicit compliance, auditing, or evaluative purpose.

## Colors

The palette establishes an unshakeable institutional foundation. 

- **Primary (`#14233B` / Dark Civic Navy):** Used for top navigational structures, high-priority verification actions, primary headings, and active interactive borders. Deepened to `#0F1A2C` on active press states and deep contrast canvas anchors.
- **Secondary (`#334155` / Slate Gray):** Handles structural subheaders, inactive tab headers, auxiliary controls, and structural table column groupings.
- **Tertiary / Informative (`#1D4ED8` / Clear Blue):** Signifies legal clauses, formal advisories, system notifications, and external compliance links.
- **Neutral Surface Hierarchy:**
  - Canvas: `#F8FAFC`
  - Elevated Container / Field Surface: `#FFFFFF`
  - Subtle Muted Layer: `#F1F5F9`
  - Structural Hairlines & Borders: `#E2E8F0` and `#CBD5E1`
- **Strict Compliance Status Tokens:**
  - **Verified / Compliant (`#247A45`):** Deep emerald, strictly paired with light mint `#EBFDF2` backdrops.
  - **Flagged / Under Review (`#B7791F`):** Deep amber, paired with `#FEF8EC` backdrops.
  - **Debarred / Non-Compliant (`#B42318`):** Deep crimson, paired with `#FEF2F2` backdrops.

## Typography

Typography prioritizes audit clarity and tabular precision. **Inter** serves as the primary system font for interfaces, narrative reviews, and evaluation metadata, utilizing tight tracking on headers and open letterforms at small scales.

**JetBrains Mono** is mandatory for all identifier strings: GSTIN, PAN, Bank Account & IFSC codes, Tender Reference Numbers, Digital Signature serials, and PO IDs. All numerical and identifier data must use tabular lining (`font-variant-numeric: tabular-nums`) to guarantee horizontal alignment during multi-row discrepancy cross-checks.

## Layout & Spacing

The layout model uses a **Fluid Grid** constrained to a maximum content width of `1600px` for ultra-wide verification workstations, with a minimum supported container width of `1280px` for standard department monitors. 

- **Columns & Breakpoints:** 12-column grid on desktop (`>= 1024px`), 8-column on tablet (`768px - 1023px`), and single-column reflow on small displays (`< 768px`).
- **Dense Structural Rhythm:** Enterprise review workflows rely on low-padding layouts. Data rows use compact padding (`space-sm` vertically) to preserve high row visibility above the fold. 
- **Panels & Dividers:** Vertical audit sidebars occupy 320px fixed width, collapsing into an off-canvas drawer only when viewport width falls below `1024px`.

## Elevation & Depth

Visual separation relies on **low-contrast outlines and tonal surface tiers** instead of floating drop shadows. Deep shadows are strictly avoided to eliminate visual noise and maintain print-to-screen fidelity.

1. **Base Surface (Level 0):** Canvas background `#F8FAFC`.
2. **Container Tier (Level 1):** Solid `#FFFFFF` enclosed in a 1px border `#E2E8F0`. No shadow.
3. **Card/Module Tier (Level 2):** `#FFFFFF` with 1px border `#CBD5E1`. Used for bid evaluation summaries and verification panels.
4. **Active/Focused Surface (Level 3):** High-contrast active outline (`#14233B`, 1.5px) with an interior `#FFFFFF` face.
5. **Overlays & Modals:** Sharp 1px border `#0F1A2C`, backed by a flat dark semi-transparent scrim (`rgba(15, 26, 44, 0.45)`), accompanied by a tight, structured shadow: `0 4px 12px rgba(15, 26, 44, 0.08)`.

## Shapes

The design uses **Soft (`1`)** roundedness. Standard controls, inputs, data cells, and verification cards adopt a strict `0.25rem` (4px) border radius. 

Status chips, compliance pills, and alert badges maintain the same 4px radius rather than fully rounded pills; this maintains a rigorous institutional geometry across all components. High-level summary panels and modal containers scale slightly to `0.5rem` (8px). Circles are permitted exclusively for step indicator numerals and binary icon glyphs.

## Components

### Buttons & Action Triggers
- **Primary Institutional Button:** `#14233B` background, white text, 4px border radius, 36px height. Hover state darkens to `#0F1A2C`. Focus state employs a 2px offset ring of `#1D4ED8`.
- **Destructive/Debar Action:** Pure white surface, `#B42318` border (1px), `#B42318` text. Hover fills to `#FEF2F2`.
- **Secondary Audit Trigger:** `#FFFFFF` background, 1px `#CBD5E1` border, `#334155` text.

### Verification Badges & Chips
- Rigid 4px corners, height 22px, `code-tabular-sm` font.
- **Valid/Verified:** Background `#EBFDF2`, border `#A6F4C5`, text `#247A45`. Preceded by a filled check icon.
- **Discrepancy Detected:** Background `#FEF8EC`, border `#FCD34D`, text `#B7791F`. Preceded by an alert triangle.
- **Blacklisted/Rejected:** Background `#FEF2F2`, border `#FCA5A5`, text `#B42318`. Preceded by an octagonal stop icon.

### Form Inputs & Identifiers
- Text fields use white backgrounds, 1px `#CBD5E1` boundaries, and 36px fixed heights. 
- Tabular fields (PAN, GSTIN, Bank Codes) automatically apply uppercase rendering and `code-tabular` JetBrains Mono typography.
- Read-only audit values render with a neutral `#F1F5F9` background, `#334155` text, and a copy-to-clipboard action icon.

### Enterprise Verification Data Tables
- **Header:** Background `#F1F5F9`, border-bottom 2px `#CBD5E1`. Typography: 11px uppercase Inter, bold, tracking `0.05em`, color `#334155`.
- **Rows:** Alternating subtle banding or solid white with 1px `#E2E8F0` dividing line. Hover state applies `#F8FAFC`.
- **Discrepancy Highlighting:** Problematic cells adopt an inset amber or red border indicator (left edge 3px solid).

### Collapsible Audit & Provenance Cards
- White surface, 1px `#E2E8F0` border. Headers feature a distinct verification status indicator on the left, clear metadata in the middle, and expandable chevron controls on the right.
- Expanded drawers display an internal `#F8FAFC` background with comparison columns showing "Submitted by Bidder" vs. "Verified against Master Database."
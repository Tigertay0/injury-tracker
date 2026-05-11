---
name: PitchSafe
colors:
  surface: '#f7faf3'
  surface-dim: '#d7dbd4'
  surface-bright: '#f7faf3'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f5ee'
  surface-container: '#ebefe8'
  surface-container-high: '#e6e9e2'
  surface-container-highest: '#e0e4dd'
  on-surface: '#181d19'
  on-surface-variant: '#404940'
  inverse-surface: '#2d322d'
  inverse-on-surface: '#eef2eb'
  outline: '#707a70'
  outline-variant: '#bfc9be'
  surface-tint: '#1b6c3d'
  primary: '#005129'
  on-primary: '#ffffff'
  primary-container: '#1a6b3c'
  on-primary-container: '#9ae9ae'
  inverse-primary: '#89d89e'
  secondary: '#2c694e'
  on-secondary: '#ffffff'
  secondary-container: '#aeeecb'
  on-secondary-container: '#316e52'
  tertiary: '#782c38'
  on-tertiary: '#ffffff'
  tertiary-container: '#96434f'
  on-tertiary-container: '#ffcace'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#a5f4b8'
  primary-fixed-dim: '#89d89e'
  on-primary-fixed: '#00210d'
  on-primary-fixed-variant: '#005229'
  secondary-fixed: '#b1f0ce'
  secondary-fixed-dim: '#95d4b3'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#0e5138'
  tertiary-fixed: '#ffd9dc'
  tertiary-fixed-dim: '#ffb2b9'
  on-tertiary-fixed: '#3f0110'
  on-tertiary-fixed-variant: '#792d39'
  background: '#f7faf3'
  on-background: '#181d19'
  surface-variant: '#e0e4dd'
typography:
  page-title:
    fontFamily: Bebas Neue
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: 2px
  risk-display:
    fontFamily: Bebas Neue
    fontSize: 72px
    fontWeight: '400'
    lineHeight: '1.0'
    letterSpacing: 0px
  section-heading:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.4'
  body-main:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  button-label:
    fontFamily: Bebas Neue
    fontSize: 20px
    fontWeight: '400'
    letterSpacing: 1px
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
---

## Brand & Style

The design system is built on a **Corporate / Modern** foundation with a distinct **High-Contrast Athletic** edge. It balances the scientific authority of injury prevention with the raw energy of amateur soccer. The aesthetic is clean and systematic to convey trustworthiness, while utilizing bold, condensed typography and vibrant greens to maintain a sports-focused momentum.

The target audience—amateur athletes and coaches—requires a UI that feels professional enough to trust with health data, yet energetic enough to belong in a locker room or on the sidelines. The interface prioritizes clarity and rapid information scanning through a structured hierarchy and a focused color palette.

## Colors

The palette is anchored by **Pitch Green** (`#005129` primary / `#1a6b3c` primary-container), a deep, authoritative grass tone that serves as the primary brand touchpoint. **Forest Green** (`#2c694e` secondary) provides depth for secondary actions and navigation elements, while **Mint Tint** (`#f7faf3` surface) offers a soft, low-contrast canvas that reduces eye strain during data entry and review.

The **Risk System** utilizes a high-visibility semantic scale. These colors are reserved strictly for status indication and risk metrics:

| Risk Level | Background (15% opacity) | Text / Icon (100%) | Usage |
|---|---|---|---|
| **Green – Low Risk** | `rgba(26, 107, 60, 0.15)` | `#1a6b3c` | Composite 0-30, ACWR sweet spot |
| **Yellow – Moderate** | `rgba(196, 164, 0, 0.15)` | `#7c6900` | Composite 31-59, ACWR caution |
| **Orange – High** | `rgba(186, 100, 20, 0.15)` | `#8b4513` | Composite 60-79 |
| **Red – Very High** | `rgba(186, 26, 26, 0.15)` | `#ba1a1a` | Composite 80-100, ACWR danger |

Backgrounds for risk indicators should typically use a 15% opacity tint of the base color to ensure the text remains legible while maintaining the color-coded meaning.

## Typography

This design system uses a dual-type approach:

### Athletic Voice – Bebas Neue
Used for high-impact data points, page titles, and primary calls to action. It should always be used for risk scores and numerical data that requires immediate attention.

| Token | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|
| `page-title` | 48px | 400 | 1.1 | 2px |
| `risk-display` | 72px | 400 | 1.0 | 0px |
| `button-label` | 20px | 400 | — | 1px |

### Scientific Voice – Inter
Provides the necessary legibility for body text, form labels, and secondary headings. Its neutral, geometric construction ensures that complex health data remains accessible and clear.

| Token | Size | Weight | Line Height |
|---|---|---|---|
| `section-heading` | 24px | 700 | 1.4 |
| `body-main` | 16px | 400 | 1.6 |
| `label-sm` | 14px | 600 | 1.2 |

## Layout & Spacing

The layout is a **Fixed-Width Systematic Grid**. A persistent 240px sidebar on the left handles global navigation, allowing the 960px content area to remain centered and focused. This constraint prevents line lengths from becoming too long for comfortable reading.

Internal spacing follows an **8px rhythm**:

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Inline spacing, icon gaps |
| `sm` | 8px | Tight padding, list item gaps |
| `md` | 16px | Default padding, form field gaps |
| `lg` | 24px | Card gutters, section separators |
| `xl` | 40px | Page margins, major section gaps |

## Elevation & Depth

The design system utilizes **Ambient Shadows** to create a subtle sense of layering without the clutter of heavy skeuomorphism.

| Elevation | Value | Usage |
|---|---|---|
| **Subtle Shadow** | `0 2px 8px rgba(0,0,0,0.08)` | White cards on Mint Tint background |
| **None** | — | Buttons (use high-contrast color fills instead) |

Depth is also communicated through tonal layering. The persistent sidebar uses a slightly darker green or a neutral white with a 1px right border to distinguish it from the main workspace.

## Shapes

The shape language is **Rounded** but disciplined:

| Element | Radius | Rationale |
|---|---|---|
| Cards | `12px` (`lg`) | Modern, friendly structural feel |
| Buttons | `8px` (`DEFAULT`) | Precise, technical interaction elements |
| Inputs | `8px` (`DEFAULT`) | Consistent with buttons |
| Risk Badges | `9999px` (`full` / pill) | Differentiated from functional UI; echoes medical/athletic equipment |

## Components

### Buttons
- **Primary:** 48px height, 8px radius, Pitch Green (`#005129`) background. Text is Bebas Neue `button-label`, white, centered.
- **Secondary:** 48px height, 8px radius, transparent background with 2px Forest Green (`#2c694e`) border. Text is Bebas Neue `button-label`, Forest Green.

### Cards
- White background (`#FFFFFF`), 12px radius, `0 2px 8px rgba(0,0,0,0.08)` shadow.
- Use 24px (`lg`) internal padding as default.

### Risk Badges
- Pill-shaped (`rounded-full`).
- Background: 15% opacity of the specific Risk System color.
- Text/Icon: 100% opacity of the same Risk System color.
- Text style: Inter Bold, 12px, uppercase.

### Inputs
- 48px height, 8px radius, white background with a 1px light grey (`#bfc9be` outline-variant) border.
- Focus state: 2px Pitch Green border.

### Sidebar
- Fixed 240px width.
- Background: Pitch Green or White (depending on navigation hierarchy).
- Active state: 4px vertical bar on the left edge in a contrasting green.

### Risk Dial (Specific to PitchSafe)
- Large Bebas Neue number (72px `risk-display`) centered within a circular progress track.
- Track color corresponds to the current risk level.

## Stitch Design System Screens

The following screens were designed in Google Stitch and serve as the canonical visual reference:

| Screen | ID | Resolution |
|---|---|---|
| Landing Page | `5e6e85da0e9741788279bdd5c0934392` | 1280 × 1738 |
| Dashboard | `be6aecf3f0684942a9ea20ae970c39b9` | 1280 × 1919 |
| Dashboard (variant) | `e5b328acfe0548c1a064e5bd2f838503` | 1280 × 1919 |
| Log Session | `2952d1621f144d739504d93b68f31fa2` | 1280 × 1024 |
| Log Session (variant) | `4efb444af32742f98e7628adc311269c` | 1280 × 1024 |
| Recovery History | `f6ba2f03a167446a95687e11c1195daa` | 1280 × 1214 |
| Injury History | `faa9bb009a0241a99622e18306bb7b59` | 1280 × 1024 |
| My Equipment | `3ac1a4ba393b4aedb2805a6d8c7bf57a` | 1280 × 1143 |
| My Equipment (variant) | `65aec8e993a14ba4a75a87d6a93c821c` | 1280 × 1143 |
| Research & Methodology | `1bcf28986afd45c5939bdbdbe7ee822b` | 1280 × 1602 |

---
name: Heritage Hearth Design System
colors:
  surface: '#fbf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#fbf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3ef'
  surface-container: '#efeeea'
  surface-container-high: '#eae8e4'
  surface-container-highest: '#e4e2de'
  on-surface: '#1b1c1a'
  on-surface-variant: '#504442'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f0ed'
  outline: '#827471'
  outline-variant: '#d4c3bf'
  surface-tint: '#6e5a55'
  primary: '#1a0c09'
  on-primary: '#ffffff'
  primary-container: '#31211d'
  on-primary-container: '#9f8781'
  inverse-primary: '#dcc1bb'
  secondary: '#1b6d24'
  on-secondary: '#ffffff'
  secondary-container: '#a0f499'
  on-secondary-container: '#207128'
  tertiary: '#1c0c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#3a1f00'
  on-tertiary-container: '#b08356'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f9dcd6'
  primary-fixed-dim: '#dcc1bb'
  on-primary-fixed: '#271814'
  on-primary-fixed-variant: '#55423e'
  secondary-fixed: '#a3f69c'
  secondary-fixed-dim: '#87d982'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005312'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#f0bd8a'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#623f17'
  background: '#fbf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2de'
typography:
  headline-xl:
    fontFamily: Manrope
    fontSize: 1.25rem
    fontWeight: '700'
    lineHeight: 1.75rem
  headline-md:
    fontFamily: Manrope
    fontSize: 1.125rem
    fontWeight: '700'
    lineHeight: 1.5rem
  body-md:
    fontFamily: Work Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-sm:
    fontFamily: Work Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-uppercase:
    fontFamily: Work Sans
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 0.25rem
  container-padding: 1.5rem
  element-gap: 1rem
  section-gap: 1.5rem
  grid-gutter: 1rem
  gap-sm: 0.5rem
  gap-md: 1rem
  gap-lg: 1.5rem
  modal-max-width: 42rem
---

## Brand & Style
Heritage Hearth is a "Modern Corporate" design system with a warm, organic soul. It bridges the gap between traditional hospitality and digital efficiency. The aesthetic is grounded in earthy tones—deep browns and forest greens—evoking a sense of artisanal quality and reliability.

The style leverages **Minimalism** for clarity and **Tonal Layering** for structure. It uses a sophisticated palette to create a high-end "Cafe" or "Bistro" atmosphere, moving away from sterile tech aesthetics toward something tactile and inviting. The emotional response is one of calm, professional assurance and high-fidelity service.

## Colors
The color system is built on a "Fidelity" variant of Material 3, emphasizing deep, rich pigments.
- **Primary (#3d2c28):** A deep espresso brown used for primary actions and high-emphasis text, providing a grounded, premium feel.
- **Secondary (#1B6D24):** A deep forest green reserved for success states and confirmation signals.
- **Tertiary (#54330C):** A burnt sienna used for status indicators and decorative accents.
- **Neutral/Surface:** A warm "Bone White" (#FBF9F5) replaces standard grays to maintain a cozy, organic atmosphere. Surfaces are tiered using slight shifts in warmth rather than brightness alone.

## Typography
The system uses a dual-font approach to balance modernity with utility.
- **Headlines (Manrope):** Chosen for its geometric but friendly letterforms. It is used for titles and key data points (like Order IDs or Totals) to provide a clean, modern look.
- **Body & Labels (Work Sans):** A highly legible, professional sans-serif used for all functional text, table data, and metadata. 
- **Stylistic Note:** Metadata labels use uppercase with tracking (letter-spacing) to create clear visual hierarchy without increasing font size. Italic styles are reserved for user-generated content or specific modifiers (e.g., "Note: Hot").

## Layout & Spacing
The layout follows a **Fixed Grid** approach for modal containers and a flexible internal layout. 
- **Modal Logic:** Centered in the viewport with a max-width of 42rem (2xl) to ensure readability on larger screens.
- **Internal Spacing:** A standard 24px (1.5rem) padding is applied to major container edges. 
- **Metadata Grid:** Uses a 4-column responsive grid that collapses to 2 columns on mobile devices.
- **Rhythm:** Vertical spacing relies on a strict 4px base unit, with 16px (1rem) being the standard gap between related elements and 24px (1.5rem) between distinct sections.

## Elevation & Depth
Elevation is achieved through a mix of **Tonal Layering** and **Ambient Shadows**.
- **The Base:** The lowest level is the `#dbdad6` backdrop, over which a semi-transparent `inverse-surface/40` overlay with `backdrop-blur` creates focus.
- **The Container:** The main UI surface uses a `shadow-2xl` to pop from the background. 
- **Internal Depth:** We avoid internal shadows. Instead, depth is communicated through subtle borders (`border-outline-variant/30`) and shifts in background color (e.g., using `surface-container-low` for data cards).

## Shapes
The shape language is "Rounded-Soft."
- **Primary Containers:** Modals use a `0.75rem` (xl) radius for a modern, approachable feel.
- **Data Blocks & Components:** Buttons and internal cards use a `0.5rem` (lg) radius.
- **Success Indicators:** Status chips and iconic indicators use "Full" or pill-shaped rounding to differentiate them from structural elements.
- **Visual Continuity:** Image thumbnails within tables should match the `0.5rem` radius of the buttons to maintain a unified visual language.

## Components
- **Buttons:** 
  - *Primary:* Solid `#3d2c28` background with white text. High contrast, no border.
  - *Secondary/Outline:* Thin `#827471` border, transparent background, used for utility actions like "Print".
- **Chips (Status):** Pill-shaped with tonal backgrounds. For "Processing," use Tertiary-container colors. All chips must include a 8px circular dot indicator.
- **Tables:** Header rows use a distinct `surface-container` background. Rows should have a subtle hover state (`surface-container-lowest`) to aid horizontal tracking.
- **Data Cards:** Grouped metadata (Order ID, Table, etc.) should be housed in a `surface-container-low` box with a subtle 50% opacity border to separate it from the body.
- **Dividers:** Use `border-surface-variant` for all horizontal rules to maintain a low-contrast, sophisticated separation.
# Design System Document: The Artisanal Interface

## 1. Overview & Creative North Star: "The Digital Sommelier"
The objective of this design system is to transcend the "utility" of a standard admin dashboard and move into the realm of a high-end editorial experience. We are not just building a tool for cafe management; we are crafting a digital workspace that mirrors the tactile, sensory experience of a premium coffee house.

**Creative North Star: The Digital Sommelier**
Like a perfectly pulled espresso, the interface must be dense with quality but stripped of bitterness. We achieve this through:
*   **Intentional Asymmetry:** Breaking the rigid 12-column grid to allow for "breathing pockets" of whitespace.
*   **Tonal Depth:** Replacing harsh borders with soft, overlapping shifts in background color.
*   **Editorial Typography:** Using high-contrast scales (Manrope for displays, Inter for utility) to guide the eye like a boutique menu.

---

### 2. Colors & Surface Philosophy
The palette is rooted in organic, earth-toned sophistication. We avoid "pure" blacks and grays, opting instead for chromatic neutrals that feel warm and inviting.

*   **Primary (`#33210d`):** Our "Roasted Bean" core. Used for high-impact brand moments and key interactive states.
*   **Secondary (`#5f5e5b`):** The "Steam" neutral. Used for supporting information and secondary actions.
*   **Tertiary (`#002c02`):** The "Forest Green." Reserved strictly for positive status (orders complete, inventory healthy) and growth metrics.
*   **Background (`#faf9f6`):** The "Cream" base. A soft, off-white that reduces eye strain during long shifts.

#### The "No-Line" Rule
**Explicit Instruction:** Traditional 1px solid borders (`#CCCCCC`, etc.) are prohibited for sectioning. Use background shifts to define boundaries.
*   *Example:* Place a `surface-container-low` (`#f4f3f1`) sidebar against a `surface` (`#faf9f6`) main content area. The eye perceives the edge through the shift in tone, not a drawn line.

#### The Glass & Gradient Rule
To provide "soul" to the Angular 21 implementation:
*   **Signature Textures:** Use a subtle linear gradient from `primary` (`#33210d`) to `primary_container` (`#4b3621`) for main Call-to-Action buttons. This adds a physical "sheen" reminiscent of polished mahogany or dark roast.
*   **Glassmorphism:** For floating dropdowns (User Profile, Notifications), use `surface_container_lowest` at 85% opacity with a `12px` backdrop-blur.

---

### 3. Typography: The Editorial Hierarchy
We utilize two sans-serif faces to balance character with readability.

*   **Display & Headlines (Manrope):** A geometric sans with high legibility. Use `display-lg` (3.5rem) for daily revenue totals and `headline-sm` (1.5rem) for section titles. This provides an authoritative, premium feel.
*   **Body & Utility (Inter):** A workhorse font. Use `body-md` (0.875rem) for data tables and `label-sm` (0.6875rem) for micro-copy like "Time Elapsed."

**Hierarchy Note:** Always maintain at least a 2-step jump in the type scale between a title and its supporting body text to ensure a clear "reading path."

---

### 4. Elevation & Depth: Tonal Layering
In this design system, "Up" is not a shadow; "Up" is a lighter color.

*   **The Layering Principle:** 
    *   **Level 0 (Base):** `surface` (#faf9f6).
    *   **Level 1 (Sections):** `surface-container-low` (#f4f3f1).
    *   **Level 2 (Cards/Active Elements):** `surface-container-lowest` (#ffffff).
*   **Ambient Shadows:** If a card *must* float (e.g., a dragged order item), use a shadow: `box-shadow: 0 12px 32px -4px rgba(51, 33, 13, 0.06)`. Note the use of the `primary` color in the shadow's RGBA to keep it "warm."
*   **The Ghost Border Fallback:** If a border is required for accessibility, use `outline_variant` (`#d2c4ba`) at **15% opacity**. It should be felt, not seen.

---

### 5. Components & Implementation (Taiga UI v4 Focus)

#### Sidebar Navigation
*   **Visuals:** Use `surface_container` as the base.
*   **Active State:** Avoid a highlight box. Use a vertical "pill" indicator (4px wide, `rounded-full`) in `primary` on the far left, and shift the text color to `on_surface`.
*   **Icons:** Use thin-stroke (1.5px) icons.

#### Buttons (The "Tonal Button")
*   **Primary:** Background: Gradient `primary` to `primary_container`. Text: `on_primary`. Shape: `md` (0.375rem).
*   **Secondary:** Background: `secondary_container`. Text: `on_secondary_container`. No border.
*   **Tertiary:** Text only in `primary`. Hover state: Subtle `surface_container_high` background.

#### Cards & Lists (The "Anti-Divider" Approach)
*   **Prohibition:** Do not use `<hr>` or border-bottom to separate list items.
*   **Execution:** Use `spacing-4` (0.9rem) or `spacing-5` (1.1rem) of vertical whitespace. If items need distinct separation, alternate backgrounds between `surface` and `surface_container_low`.

#### Input Fields
*   **Style:** Minimalist. Only a bottom-stroke (the Ghost Border) that expands to 2px `primary` on focus.
*   **Background:** `surface_container_low` to create a "well" for the user to type into.

#### Specialized Cafe Components
*   **Status Badges (Pills):** Use `tertiary_fixed` with `on_tertiary_fixed_variant` for "In Progress" or "Completed." The soft green on dark green provides a sophisticated "organic" vibe.
*   **Live Order Ticker:** Use `surface_container_highest` for the container to signify its high-priority, real-time nature.

---

### 6. Do’s and Don’ts

**Do:**
*   **Use Whitespace as a Tool:** Use `spacing-16` (3.5rem) between major dashboard modules to allow the user's eyes to rest.
*   **Embrace Tonal Shifts:** Use the `surface-container` tiers to create hierarchy.
*   **Consistent Rounding:** Stick to `md` (0.375rem) for most components, but use `full` (9999px) for status chips and search bars to soften the "industrial" feel of an admin panel.

**Don’t:**
*   **Don't Use Pure Black:** It breaks the coffee-inspired immersion. Always use `primary` (`#33210d`) or `on_surface` (`#1a1c1a`).
*   **Don't Use Default Shadows:** Avoid the standard CSS `0 2px 4px rgba(0,0,0,0.5)`. It feels cheap. Stick to the Ambient Shadow spec in Section 4.
*   **Don't Overcrowd:** If a dashboard view feels full, move secondary metrics to a "Details" drawer rather than shrinking the typography. High-end design requires space.
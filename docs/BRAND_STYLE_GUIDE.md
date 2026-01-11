# Main Character Energy - Brand Style Guide

**Version:** 1.0  
**Last Updated:** January 2026  
**Source:** Main Character Energy Website (mce-website repository)

---

## Overview

This style guide ensures consistent branding across all Main Character Energy tools and applications. It is derived from the official MCE website and should be used for all internal tools, commercial products, and marketing materials.

## Brand Identity

### Brand Name
**Main Character Energy** (abbreviated as **MCE**)

### Tagline
*"Empowering construction professionals with intelligent tools"*

### Brand Voice
- **Professional** yet approachable
- **Technical** but not jargon-heavy
- **Confident** without being arrogant
- **Helpful** and solution-oriented

---

## Logo

### Primary Logo
**Location:** `/shared/assets/mce-logo.png`

**Usage Guidelines:**
- Minimum size: 120px width for digital, 1 inch for print
- Clear space: Maintain at least 20px padding around logo
- Do not distort, rotate, or modify colors
- Use on light backgrounds primarily

### Logo Variations
- **Full Color:** Primary usage on light backgrounds
- **White:** For dark backgrounds or photos
- **Monochrome:** For single-color printing

---

## Color Palette

### Primary Colors

**Blue 700** (Primary Brand Color)
- **Hex:** `#1d4ed8`
- **RGB:** `rgb(29, 78, 216)`
- **Tailwind:** `blue-700`
- **Usage:** Primary buttons, links, headers, brand elements
- **CSS Variable:** `--primary`

**Blue 50** (Primary Foreground)
- **Hex:** `#eff6ff`
- **RGB:** `rgb(239, 246, 255)`
- **Tailwind:** `blue-50`
- **Usage:** Text on primary color backgrounds
- **CSS Variable:** `--primary-foreground`

### Secondary Colors

**Blue 600**
- **Hex:** `#2563eb`
- **Tailwind:** `blue-600`
- **Usage:** Hover states, secondary actions

**Blue 500**
- **Hex:** `#3b82f6`
- **Tailwind:** `blue-500`
- **Usage:** Interactive elements, charts

**Blue 300**
- **Hex:** `#93c5fd`
- **Tailwind:** `blue-300`
- **Usage:** Light accents, data visualization

### Neutral Colors

**Background (Light Mode)**
- **OKLCH:** `oklch(1 0 0)` (Pure white)
- **Usage:** Page backgrounds, cards

**Foreground (Light Mode)**
- **OKLCH:** `oklch(0.235 0.015 65)` (Dark gray)
- **Usage:** Body text, headings

**Muted**
- **OKLCH:** `oklch(0.967 0.001 286.375)` (Light gray)
- **Usage:** Disabled states, subtle backgrounds

**Muted Foreground**
- **OKLCH:** `oklch(0.552 0.016 285.938)` (Medium gray)
- **Usage:** Secondary text, placeholders

**Border**
- **OKLCH:** `oklch(0.92 0.004 286.32)` (Light border gray)
- **Usage:** Borders, dividers, input outlines

### Semantic Colors

**Destructive** (Error/Danger)
- **OKLCH:** `oklch(0.577 0.245 27.325)` (Red)
- **Usage:** Error messages, delete actions, warnings

**Destructive Foreground**
- **OKLCH:** `oklch(0.985 0 0)` (White)
- **Usage:** Text on destructive backgrounds

### Chart Colors

For data visualization, use the following progression:
1. **Chart 1:** Blue 300 (`#93c5fd`)
2. **Chart 2:** Blue 500 (`#3b82f6`)
3. **Chart 3:** Blue 600 (`#2563eb`)
4. **Chart 4:** Blue 700 (`#1d4ed8`)
5. **Chart 5:** Blue 800 (`#1e40af`)

---

## Dark Mode

### Background (Dark Mode)
- **OKLCH:** `oklch(0.141 0.005 285.823)` (Very dark blue-gray)

### Foreground (Dark Mode)
- **OKLCH:** `oklch(0.85 0.005 65)` (Light gray)

### Card (Dark Mode)
- **OKLCH:** `oklch(0.21 0.006 285.885)` (Dark card background)

### Borders (Dark Mode)
- **OKLCH:** `oklch(1 0 0 / 10%)` (Subtle white overlay)

**Note:** All tools should support both light and dark modes using these color values.

---

## Typography

### Font Family

**Primary Font:** System font stack (native fonts for performance)
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;
```

**Why system fonts:**
- Fast loading (no web font download)
- Native look and feel on each platform
- Excellent readability
- Professional appearance

### Font Sizes

**Headings:**
- **H1:** `2.25rem` (36px) - Page titles
- **H2:** `1.875rem` (30px) - Section headers
- **H3:** `1.5rem` (24px) - Subsection headers
- **H4:** `1.25rem` (20px) - Card titles

**Body Text:**
- **Base:** `1rem` (16px) - Default body text
- **Small:** `0.875rem` (14px) - Captions, labels
- **Tiny:** `0.75rem` (12px) - Fine print

### Font Weights

- **Regular:** 400 - Body text
- **Medium:** 500 - Links, emphasized text
- **Semibold:** 600 - Subheadings, strong emphasis
- **Bold:** 700 - Headings, primary emphasis

### Line Height

- **Headings:** 1.3-1.6 (tighter for impact)
- **Body:** 1.75 (comfortable reading)
- **UI Elements:** 1.5 (compact for interfaces)

---

## Spacing

### Base Unit: 4px

All spacing should use multiples of 4px for consistency.

**Tailwind Scale:**
- `1` = 4px
- `2` = 8px
- `3` = 12px
- `4` = 16px
- `5` = 20px
- `6` = 24px
- `8` = 32px
- `10` = 40px
- `12` = 48px
- `16` = 64px

### Common Spacing Patterns

**Component Padding:**
- **Small:** `px-3 py-2` (12px × 8px)
- **Medium:** `px-4 py-2` (16px × 8px)
- **Large:** `px-6 py-3` (24px × 12px)

**Section Spacing:**
- **Between sections:** `mb-8` or `mb-12` (32px or 48px)
- **Between elements:** `mb-4` or `mb-6` (16px or 24px)

**Container Padding:**
- **Mobile:** `px-4` (16px)
- **Tablet:** `px-6` (24px)
- **Desktop:** `px-8` (32px)

---

## Border Radius

### Standard Radii

**Base Radius:** `0.65rem` (10.4px)

**Variations:**
- **Small:** `calc(0.65rem - 4px)` = `0.4rem` (6.4px)
- **Medium:** `calc(0.65rem - 2px)` = `0.525rem` (8.4px)
- **Large:** `0.65rem` (10.4px) - Default
- **Extra Large:** `calc(0.65rem + 4px)` = `0.9rem` (14.4px)

**Usage:**
- **Buttons:** Large radius
- **Cards:** Large radius
- **Inputs:** Medium radius
- **Badges:** Extra large radius (pill shape)
- **Modals:** Large radius

---

## Components

### Buttons

**Primary Button:**
```css
background: var(--primary);
color: var(--primary-foreground);
padding: 0.5rem 1rem;
border-radius: var(--radius-lg);
font-weight: 500;
```

**States:**
- **Hover:** Opacity 90%
- **Active:** Opacity 80%
- **Disabled:** Opacity 50%, cursor not-allowed

**Secondary Button:**
```css
background: var(--secondary);
color: var(--secondary-foreground);
border: 1px solid var(--border);
```

**Destructive Button:**
```css
background: var(--destructive);
color: var(--destructive-foreground);
```

### Cards

```css
background: var(--card);
color: var(--card-foreground);
border: 1px solid var(--border);
border-radius: var(--radius-lg);
padding: 1.5rem;
box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
```

### Inputs

```css
background: var(--background);
color: var(--foreground);
border: 1px solid var(--input);
border-radius: var(--radius-md);
padding: 0.5rem 0.75rem;
font-size: 0.875rem;
```

**Focus State:**
```css
outline: 2px solid var(--ring);
outline-offset: 2px;
```

### Links

```css
color: var(--primary);
text-decoration: underline;
font-weight: 500;
```

**Hover:**
```css
opacity: 0.8;
```

---

## Layout

### Container

**Max Width:** 1280px  
**Responsive Padding:**
- Mobile: 16px (1rem)
- Tablet: 24px (1.5rem)
- Desktop: 32px (2rem)

**Usage:**
```html
<div class="container">
  <!-- Content -->
</div>
```

### Grid System

Use Tailwind's grid utilities:

**Two Column:**
```html
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <!-- Items -->
</div>
```

**Three Column:**
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Items -->
</div>
```

### Prose (Content)

For markdown/article content:
```html
<div class="prose">
  <!-- Markdown content -->
</div>
```

**Max Width:** 65 characters (optimal reading width)

---

## Icons

### Icon Library
**Recommended:** Lucide React (https://lucide.dev/)

**Why Lucide:**
- Consistent design language
- Extensive icon set
- React components
- Customizable size and stroke

**Size Guidelines:**
- **Small:** 16px (buttons, inline text)
- **Medium:** 20px (default UI)
- **Large:** 24px (headers, emphasis)
- **Extra Large:** 32px+ (hero sections)

**Color:**
- Match text color by default
- Use `text-primary` for brand emphasis
- Use `text-muted-foreground` for secondary icons

---

## Accessibility

### Color Contrast

All color combinations meet WCAG AA standards:
- **Normal text:** 4.5:1 minimum
- **Large text:** 3:1 minimum
- **UI components:** 3:1 minimum

### Focus States

All interactive elements must have visible focus indicators:
```css
outline: 2px solid var(--ring);
outline-offset: 2px;
```

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Logical tab order
- Skip links for main content

### Screen Readers

- Use semantic HTML
- Provide alt text for images
- Label form inputs properly
- Use ARIA attributes when necessary

---

## Animation

### Transitions

**Standard Duration:** 150ms  
**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out)

**Common Transitions:**
```css
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
```

**Use Cases:**
- Button hover states
- Link hover states
- Modal open/close
- Dropdown menus

### Animations

Keep animations subtle and purposeful:
- **Fade in:** Opacity 0 → 1
- **Slide in:** Transform translateY(10px) → 0
- **Scale:** Transform scale(0.95) → 1

**Duration:** 200-300ms for most animations

---

## Implementation

### TailwindCSS Configuration

Add to your `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-foreground': 'var(--primary-foreground)',
        secondary: 'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
        destructive: 'var(--destructive)',
        'destructive-foreground': 'var(--destructive-foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
}
```

### CSS Variables

Copy the CSS variables from `/shared/styles/variables.css` to your main CSS file.

### React Components

Use the shared component library in `/shared/components/` for consistent UI elements.

---

## Brand Applications

### Internal Tools (mce-tools)

**Branding Level:** Moderate
- Use MCE logo in header
- Apply brand colors to primary actions
- Keep interface clean and functional
- Focus on usability over branding

### Commercial Products (acc-tools)

**Branding Level:** High
- Prominent MCE logo
- Strong brand color presence
- Professional polish
- Marketing-ready appearance

**White-Label (Enterprise Tier):**
- Replace MCE logo with customer logo
- Allow custom primary color
- Maintain layout and UX patterns

---

## File Locations

**Logo:** `/shared/assets/mce-logo.png`  
**CSS Variables:** `/shared/styles/variables.css`  
**Shared Components:** `/shared/components/`  
**This Guide:** `/docs/BRAND_STYLE_GUIDE.md`

---

## Updates and Maintenance

**Version Control:**
- This style guide is version controlled in Git
- Update version number when making changes
- Document changes in commit messages

**Questions:**
- Reference this guide in AI sessions for consistent styling
- Update this guide as brand evolves
- Keep in sync with main MCE website

---

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Maintained By:** Main Character Energy Development Team

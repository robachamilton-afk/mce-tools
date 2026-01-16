# MCE Style Guide - Key Points for ACC Asset Extractor

## Color System
- **Primary Brand:** Orange-500 (not blue-700!)
- **Dark Mode (Default):** Deep slate background `oklch(0.141 0.005 285.823)`
- **Light Mode:** Pure white background
- **Cards:** slate-900 (dark) / white (light)
- **Borders:** slate-800 (dark) / slate-200 (light)

## Typography
- **Font:** Inter (via font-sans)
- **H1:** text-5xl (desktop) / text-3xl (mobile), font-bold
- **H2:** text-3xl (desktop) / text-2xl (mobile), font-bold
- **H3:** text-xl (desktop) / text-lg (mobile), font-bold
- **Body:** text-base, font-normal
- **Small:** text-sm, font-medium

## Layout
- **Container:** max-w-7xl, px-4 (mobile) / px-8 (desktop), mx-auto
- **Section Spacing:** py-16 md:py-24 (standard) / py-12 (small)
- **Gap:** gap-8 for grid layouts

## Components
### Buttons
- **Primary:** bg-orange-500 hover:bg-orange-600 text-white
- **Secondary/Ghost:** text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800
- **Icon Button:** text-slate-500 hover:text-orange-500

### Cards
- **Container:** flex flex-col h-full
- **Hover Effect:** group-hover:scale-105 transition-transform duration-500
- **Title:** group-hover:text-orange-500 transition-colors

### Navigation
- **Position:** sticky top-0 z-50
- **Background:** bg-white/80 dark:bg-slate-900/80 backdrop-blur-md
- **Link Color:** text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white

## Key Differences from Current Implementation
1. **Primary color should be ORANGE-500, not BLUE-700**
2. **Dark mode should be default**
3. **Use Inter font (already using font-sans)**
4. **More generous spacing (py-16 md:py-24 vs current py-12)**
5. **Orange accents for CTAs and highlights**
6. **Backdrop blur on navigation**
7. **Hover effects with scale and color transitions**

## Action Items
- [ ] Change primary color from blue to orange throughout
- [ ] Update button styles to use orange-500
- [ ] Add backdrop blur to header
- [ ] Increase section spacing
- [ ] Add hover effects to cards
- [ ] Ensure dark mode is truly default
- [ ] Update all CTAs to use orange

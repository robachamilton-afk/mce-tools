# OE Toolkit Integration Guide

## Overview

The **OE Toolkit** is the central landing page and navigation hub for all Main Character Energy consulting tools. It serves as the single entry point through which users access specialized tools like the ACC Asset Extractor and Solar Farm Performance Analyser.

This document provides the technical specifications, integration patterns, and best practices for adding new tools to the OE Toolkit ecosystem.

**OE Toolkit Repository:** https://github.com/robachamilton-afk/oe-toolkit  
**Live Instance:** https://oe-toolkit.manus.space/ (or custom domain)

---

## Architecture Overview

### Technology Stack

- **Frontend Framework:** React 19 with TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui components
- **Routing:** Wouter (client-side routing)
- **Build Tool:** Vite
- **Deployment:** Manus static hosting

### Project Structure

```
oe-toolkit/
├── client/
│   ├── public/
│   │   ├── mce-logo.png              # MCE branding logo
│   │   └── [tool-assets]/            # Tool-specific assets
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx              # Main landing page with tool cards
│   │   ├── components/               # Reusable UI components
│   │   ├── App.tsx                   # Route configuration
│   │   └── index.css                 # Global styling & design tokens
│   └── index.html
├── package.json
└── README.md
```

---

## Design System

### Color Palette

The OE Toolkit follows the **MCE Style Guide** with a dark mode-first aesthetic:

| Token | Value | Usage |
|-------|-------|-------|
| **Background** | `oklch(0.15 0.01 280)` | Page background |
| **Foreground** | `oklch(0.95 0.01 280)` | Primary text |
| **Accent (Orange)** | `oklch(0.614 0.184 39.1)` | CTAs, highlights, tool icons |
| **Card Background** | `oklch(0.2 0.01 280)` | Tool cards, containers |
| **Border** | `oklch(1 0 0 / 10%)` | Subtle dividers |

### Typography

- **Display Font:** Bold sans-serif for headings (h1-h3)
- **Body Font:** Regular sans-serif for content
- **Hierarchy:** 
  - H1: 5xl-7xl (hero title)
  - H2: 4xl-5xl (section headers)
  - H3: 2xl (tool card titles)
  - Body: lg-xl (descriptions)

### Component Patterns

#### Tool Card Structure

Each tool is represented as an interactive card with:

```tsx
interface ToolCard {
  id: string;                    // Unique identifier
  title: string;                 // Tool name
  description: string;           // 1-2 sentence description
  icon: React.ReactNode;         // Icon component (lucide-react)
  color: string;                 // Tailwind gradient class
  url: string;                   // External tool URL
  status: string;                // "Active", "Beta", "Coming Soon"
}
```

**Example:**
```tsx
{
  id: "acc-extractor",
  title: "ACC Asset Extractor",
  description: "Extract and manage assets from Autodesk Construction Cloud...",
  icon: <Zap className="h-8 w-8" />,
  color: "from-orange-500 to-orange-600",
  url: "https://accextractor-wgbdueae.manus.space/",
  status: "Active",
}
```

---

## Integration Workflow

### Step 1: Prepare Your Tool

Before integrating a new tool into OE Toolkit:

1. **Deploy the tool** to a Manus instance or external hosting
2. **Obtain the public URL** (e.g., `https://your-tool.manus.space/`)
3. **Create a tool icon** (lucide-react icon or custom SVG)
4. **Write a concise description** (1-2 sentences, ~100 characters)
5. **Assign a status** ("Active", "Beta", "Coming Soon")

### Step 2: Add Tool to OE Toolkit

#### 2.1 Update the Tools Array

Edit `client/src/pages/Home.tsx` and add your tool to the `tools` array:

```tsx
const tools: ToolCard[] = [
  // ... existing tools
  {
    id: "your-tool-id",
    title: "Your Tool Name",
    description: "Brief description of what your tool does.",
    icon: <YourIcon className="h-8 w-8" />,
    color: "from-[color1]-500 to-[color2]-600",
    url: "https://your-tool-url.manus.space/",
    status: "Active",
  },
];
```

#### 2.2 Import Required Icons

If using a new lucide-react icon, add it to the imports:

```tsx
import { ArrowRight, Zap, BarChart3, YourIcon } from "lucide-react";
```

#### 2.3 Test the Integration

1. Run the dev server: `pnpm dev`
2. Verify the tool card renders correctly
3. Test the link navigates to the correct URL
4. Check responsive behavior on mobile

### Step 3: Deploy Changes

1. Create a checkpoint: `webdev_save_checkpoint`
2. Click the **Publish** button in the Manus UI
3. Verify the live site displays your new tool

---

## Tool Card Styling

### Hover Effects

Tool cards include smooth transitions:

```tsx
className="
  group block
  bg-slate-900/50 border border-slate-700/50 rounded-xl p-8
  transition-all duration-300
  hover:border-orange-500/50 hover:bg-slate-900/80
  hover:shadow-lg hover:shadow-orange-500/10
"
```

### Icon Styling

Tool icons use gradient backgrounds:

```tsx
className={`p-4 rounded-lg bg-gradient-to-br ${tool.color} text-white`}
```

Recommended color gradients:
- Orange: `from-orange-500 to-orange-600`
- Amber: `from-amber-500 to-amber-600`
- Blue: `from-blue-500 to-blue-600`
- Green: `from-green-500 to-green-600`
- Purple: `from-purple-500 to-purple-600`

---

## Header Navigation

The OE Toolkit header includes:

- **Logo Section:** MCE logo + "MAIN CHARACTER ENERGY" branding
- **Desktop Nav:** Tools link + LinkedIn icon
- **Mobile Menu:** Responsive sheet menu with same navigation items

### Adding Header Links

To add new navigation items, edit the header section in `Home.tsx`:

```tsx
{/* Desktop Navigation */}
<div className="hidden md:flex items-center gap-6">
  <a href="#your-section" className="text-slate-300 hover:text-orange-400 transition-colors">
    Your Link
  </a>
</div>
```

---

## Best Practices

### 1. URL Management

- Use **absolute URLs** for external tools (e.g., `https://tool.manus.space/`)
- Use **hash links** for internal sections (e.g., `#tools`)
- Always include `target="_blank"` for external tool links to maintain OE Toolkit context

### 2. Descriptions

- Keep descriptions **concise** (1-2 sentences, ~100 characters)
- Focus on **user benefit** ("Extract and manage..." vs "This tool extracts...")
- Avoid technical jargon; use clear, accessible language

### 3. Icons

- Use **lucide-react** icons for consistency
- Choose icons that **visually represent** the tool's function
- Ensure icons are **recognizable** at small sizes (h-8 w-8)

### 4. Status Badges

- **Active:** Tool is production-ready
- **Beta:** Tool is in testing/early access
- **Coming Soon:** Tool is planned but not yet available

### 5. Testing

Before deploying:

- [ ] Tool card renders correctly
- [ ] Link navigates to correct URL
- [ ] Icon displays properly
- [ ] Hover effects work smoothly
- [ ] Mobile responsive layout works
- [ ] No console errors
- [ ] Accessibility: keyboard navigation works

---

## Common Issues & Solutions

### Issue: Tool Link Opens in Same Tab

**Problem:** User clicks tool card and loses OE Toolkit context.

**Solution:** Ensure external tool links use `target="_blank"`:

```tsx
<a href={tool.url} target="_blank" rel="noopener noreferrer">
```

### Issue: Icon Not Displaying

**Problem:** Icon appears as blank space.

**Solution:** Verify the icon is imported and the className includes size classes:

```tsx
import { YourIcon } from "lucide-react";
// ...
<YourIcon className="h-8 w-8" />  // Must include size classes
```

### Issue: Card Styling Breaks on Mobile

**Problem:** Tool cards don't stack properly on small screens.

**Solution:** The grid is already responsive (`grid-cols-1 md:grid-cols-2`). Check if custom CSS is overriding Tailwind utilities.

### Issue: Nested Anchor Tag Error

**Problem:** React error: "cannot contain a nested `<a>`"

**Solution:** Never wrap anchor tags inside other anchors. Use proper semantic HTML:

```tsx
// ❌ Wrong
<a href="/"><a href="/tool">Link</a></a>

// ✅ Correct
<a href="/tool">Link</a>
```

---

## Performance Considerations

### Image Optimization

- Keep the MCE logo as a small PNG (~10-20KB)
- Use SVG for icons (lucide-react provides optimized SVGs)
- Lazy-load tool card images if added in future

### Bundle Size

Current dependencies are optimized for static hosting:
- React 19: ~42KB (gzipped)
- Tailwind CSS 4: ~15KB (gzipped)
- shadcn/ui: Tree-shakeable, only imports used components

### Caching Strategy

- Static assets in `client/public/` are cached aggressively
- Add content hash to filenames if replacing assets: `logo.3fa9b2e4.png`

---

## Deployment Checklist

Before publishing a new tool integration:

- [ ] Tool URL is correct and accessible
- [ ] Tool card renders without errors
- [ ] Icon displays properly
- [ ] Description is accurate and concise
- [ ] Status badge is appropriate
- [ ] Mobile responsive layout works
- [ ] No console errors or warnings
- [ ] Checkpoint created with descriptive message
- [ ] Live site tested in production

---

## Future Enhancements

Potential features for future OE Toolkit versions:

1. **Tool Search/Filter:** Add search functionality to find tools by name or category
2. **Tool Categories:** Organize tools into groups (Data, Analysis, Management, etc.)
3. **Tool Ratings:** Display user ratings or usage statistics
4. **Quick Start Guides:** Embedded modals with tool setup instructions
5. **Status Dashboard:** Real-time tool uptime and performance metrics
6. **Authentication Integration:** Unified login for all tools
7. **Tool Analytics:** Track which tools are accessed most frequently
8. **Keyboard Shortcuts:** Quick access to tools via keyboard commands

---

## Support & Questions

For questions about OE Toolkit integration:

1. Check this documentation first
2. Review the OE Toolkit repository: https://github.com/robachamilton-afk/oe-toolkit
3. Consult the MCE Style Guide in mce-website repository
4. Open an issue in the OE Toolkit repository

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-15 | Initial release with ACC Asset Extractor and Solar Farm Performance Analyser |

---

## Related Documentation

- [MCE Style Guide](./BRAND_STYLE_GUIDE.md) - Design system and branding guidelines
- [Architecture Overview](./ARCHITECTURE.md) - System design and tool architecture
- [API Contracts](./API_CONTRACTS.md) - API specifications for tool communication
- [Deployment Guide](./DEPLOYMENT.md) - Deployment procedures and environments

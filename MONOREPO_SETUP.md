# MCE Tools Monorepo Setup

## Overview

This monorepo contains the complete OE Toolkit ecosystem:

- **OE Toolkit** (`tools/oe-toolkit/`) - Main landing page and navigation hub
- **ACC Asset Extractor** (`tools/acc-asset-extractor/webapp/`) - Autodesk Construction Cloud asset extraction tool
- **Solar Farm Performance Analyser** (`tools/performance-assessment/solar-analyzer/`) - Solar farm performance analysis tool

## Architecture

### Development Environment

All three applications run simultaneously on different ports:

- **OE Toolkit:** `http://localhost:3000/`
- **ACC Asset Extractor:** `http://localhost:3001/acc-asset-extractor/`
- **Solar Farm Performance Analyser:** `http://localhost:3002/solar-analyzer/`

The OE Toolkit serves as the main entry point and provides navigation to both tools via relative paths.

### Production Deployment

When deployed to GoDaddy as a subsection of the MCE website:

```
mce-website.com/
├── oe-toolkit/                    (OE Toolkit landing page)
├── oe-toolkit/acc-asset-extractor/    (ACC Asset Extractor)
└── oe-toolkit/solar-analyzer/         (Solar Farm Performance Analyser)
```

Each tool is configured with a base path to work correctly under this structure.

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 10+

### Installation

```bash
# Install all dependencies for all three apps
pnpm install

# Or use the convenience script
npm run install-all
```

### Development

Start all three applications simultaneously:

```bash
npm run dev
```

This will launch:
- OE Toolkit on port 3000
- ACC Asset Extractor on port 3001
- Solar Farm Performance Analyser on port 3002

All are accessible from the OE Toolkit landing page at `http://localhost:3000/`

### Individual App Development

To run a single app:

```bash
# OE Toolkit only
npm run dev:oe-toolkit

# ACC Asset Extractor only
npm run dev:acc-extractor

# Solar Farm Performance Analyser only
npm run dev:solar-analyzer
```

## Building for Production

Build all applications:

```bash
npm run build
```

This generates optimized builds for each tool in their respective `dist/` directories.

## File Structure

```
mce-tools/
├── package.json                    # Root monorepo configuration
├── MONOREPO_SETUP.md              # This file
├── tools/
│   ├── oe-toolkit/                # OE Toolkit landing page
│   │   ├── client/
│   │   ├── server/
│   │   └── package.json
│   ├── acc-asset-extractor/
│   │   └── webapp/                # ACC Asset Extractor app
│   │       ├── client/
│   │       ├── server/
│   │       └── package.json
│   └── performance-assessment/
│       └── solar-analyzer/        # Solar Farm Performance Analyser
│           ├── client/
│           ├── server/
│           └── package.json
├── shared/                        # Shared utilities and styles
├── docs/                          # Documentation
└── docker/                        # Docker configuration
```

## Routing Configuration

### OE Toolkit

The OE Toolkit uses relative paths to link to the tools:

```tsx
// In tools/oe-toolkit/client/src/pages/Home.tsx
const tools: ToolCard[] = [
  {
    url: "/acc-asset-extractor/",     // Relative path
    // ...
  },
  {
    url: "/solar-analyzer/",          // Relative path
    // ...
  },
];
```

### Individual Tools

Each tool is configured to work with a base path. When running locally:

- ACC Asset Extractor expects to be at `/acc-asset-extractor/`
- Solar Farm Performance Analyser expects to be at `/solar-analyzer/`

When deployed to production, these paths are preserved under the MCE website structure.

## Development Workflow

### Adding a New Tool

1. Create the tool in `tools/[tool-name]/`
2. Add dev and build scripts to the tool's `package.json`
3. Update the root `package.json` with:
   - New dev script: `"dev:[tool-name]": "cd tools/[tool-name] && pnpm dev --port [PORT]"`
   - New build script: `"build:[tool-name]": "cd tools/[tool-name] && pnpm build"`
   - Update the main `dev` script to include the new tool
4. Add the tool to the `workspaces` array
5. Update OE Toolkit to include the new tool card with the correct path

### Updating Tool URLs

When changing tool URLs or paths:

1. Update the URL in `tools/oe-toolkit/client/src/pages/Home.tsx`
2. Ensure the path matches the tool's base path configuration
3. Test navigation locally before deploying

## Troubleshooting

### Port Already in Use

If a port is already in use, you can specify a different port:

```bash
cd tools/oe-toolkit && pnpm dev --port 3010
```

### Dependencies Not Installed

If you see module not found errors, reinstall dependencies:

```bash
npm run install-all
```

### Build Failures

Clear build artifacts and rebuild:

```bash
rm -rf tools/*/dist
npm run build
```

## Environment Variables

Each tool may require environment variables. Check:

- `tools/oe-toolkit/.env.example`
- `tools/acc-asset-extractor/webapp/.env.example.txt`
- `tools/performance-assessment/solar-analyzer/.env.example`

Copy these to `.env` files and fill in the required values.

## Deployment

### To GoDaddy

1. Build all applications: `npm run build`
2. Deploy the built artifacts to GoDaddy under the `/oe-toolkit/` subdirectory
3. Configure web server to serve each tool from its respective path
4. Ensure routing is configured to serve `index.html` for client-side routing

### To Manus

Each tool can be deployed individually to Manus:

1. Deploy OE Toolkit as the main application
2. Configure the tool URLs to point to their Manus instances
3. Update `tools/oe-toolkit/client/src/pages/Home.tsx` with the Manus URLs

## Documentation

- [OE Toolkit Integration Guide](./docs/OE_TOOLKIT_INTEGRATION.md)
- [MCE Style Guide](./docs/BRAND_STYLE_GUIDE.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)

## Support

For issues or questions:

1. Check the relevant tool's README
2. Review the documentation in `docs/`
3. Check the tool's GitHub issues

---

**Last Updated:** 2026-01-15

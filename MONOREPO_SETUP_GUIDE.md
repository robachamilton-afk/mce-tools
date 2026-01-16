# MCE Tools Monorepo Setup Guide

## Overview
This monorepo contains three applications that run concurrently:
- **OE Toolkit** (Port 3000): Landing page and main entry point
- **ACC Asset Extractor** (Port 3001): Full-stack application
- **Solar Analyzer** (Port 3002): Full-stack application

## Fixed Issues

### 1. Environment Variable Propagation (Windows)
**Problem**: `tsx watch` doesn't properly propagate environment variables on Windows
**Solution**: Replaced `tsx watch` with `tsx` in both tool package.json files
- ACC Extractor: `PORT=3001`
- Solar Analyzer: `PORT=3002`

### 2. Shell Variable Expansion
**Problem**: `${PORT:-3001}` syntax doesn't work with `cross-env` on Windows
**Solution**: Use direct port values in cross-env
```json
"dev": "cross-env NODE_ENV=development PORT=3001 tsx server/_core/index.ts"
```

### 3. Missing Library Files
**Problem**: `.gitignore` was too broad and ignored all `lib/` directories
**Solution**: Changed root `.gitignore` from `lib/` to `/lib/` to only ignore root-level Python lib

**Created missing files:**
- `tools/acc-asset-extractor/webapp/client/src/lib/trpc.ts`
- `tools/acc-asset-extractor/webapp/client/src/lib/utils.ts`
- `tools/performance-assessment/solar-analyzer/client/src/lib/trpc.ts`
- `tools/performance-assessment/solar-analyzer/client/src/lib/utils.ts`

## Setup Instructions

### First Time Setup
```bash
cd mce-tools
npm run install-all
```

This installs dependencies for all three tools:
- `tools/oe-toolkit`
- `tools/acc-asset-extractor/webapp`
- `tools/performance-assessment/solar-analyzer`

### Running Development Server
```bash
npm run dev
```

This starts all three applications concurrently using the `concurrently` package.

### Running Individual Tools
```bash
npm run dev:oe-toolkit:only
npm run dev:acc-extractor:only
npm run dev:solar-analyzer:only
```

## Verification Checklist

After running `npm run dev`, verify:

1. **Port 3000 - OE Toolkit**
   - URL: `http://localhost:3000`
   - Should show landing page with tool cards
   - No console errors

2. **Port 3001 - ACC Asset Extractor**
   - URL: `http://localhost:3001`
   - Server should log: `✅ ACC Asset Extractor server running on http://localhost:3001/`
   - No import errors in browser console

3. **Port 3002 - Solar Analyzer**
   - URL: `http://localhost:3002`
   - Server should log: `✅ Solar Analyzer server running on http://localhost:3002/`
   - No import errors in browser console

## Troubleshooting

### Servers not starting
1. Kill all existing processes: `Ctrl+C`
2. Clear node_modules and reinstall:
   ```bash
   npm run install-all
   ```
3. Restart dev server:
   ```bash
   npm run dev
   ```

### Import errors in browser
1. Check that all files exist in `client/src/lib/`:
   - `trpc.ts`
   - `utils.ts`

2. Verify path aliases in `vite.config.ts`:
   ```typescript
   resolve: {
     alias: {
       "@": path.resolve(import.meta.dirname, "client", "src"),
     },
   }
   ```

### Port already in use
If a port is already in use, the servers will automatically find the next available port and log:
```
⚠️  Port 3001 is busy, using port 3002 instead
```

## Project Structure

```
mce-tools/
├── package.json (root - defines dev scripts)
├── tools/
│   ├── oe-toolkit/
│   │   ├── client/src/
│   │   └── package.json
│   ├── acc-asset-extractor/webapp/
│   │   ├── client/src/
│   │   │   ├── lib/
│   │   │   │   ├── trpc.ts
│   │   │   │   └── utils.ts
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── main.tsx
│   │   ├── server/
│   │   └── package.json
│   └── performance-assessment/solar-analyzer/
│       ├── client/src/
│       │   ├── lib/
│       │   │   ├── trpc.ts
│       │   │   └── utils.ts
│       │   ├── components/
│       │   ├── pages/
│       │   └── main.tsx
│       ├── server/
│       └── package.json
```

## Key Dependencies

### Root Level
- `concurrently`: Run multiple npm scripts in parallel
- `cross-env`: Set environment variables cross-platform

### Each Tool
- `vite`: Frontend build tool
- `react`: UI framework
- `@trpc/react-query`: Type-safe API client
- `express`: Backend server (for full-stack tools)
- `tsx`: TypeScript executor for Node.js

## Next Steps

1. Pull latest changes:
   ```bash
   git pull
   ```

2. Run setup:
   ```bash
   npm run install-all
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

4. Open browser and verify all three ports are accessible

## Notes

- Frontend file watching is handled by Vite (hot reload)
- Backend servers run without file watching (restart required for changes)
- All three apps share the same Tailwind CSS configuration
- OAuth and API endpoints are configured in `const.ts` files

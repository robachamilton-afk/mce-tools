# ACC Asset Extractor

**Extract and manage solar farm assets from engineering documentation using AI**

A web application built by [Main Character Energy](https://maincharacterenergy.com.au) that automatically extracts asset information from PDF engineering documents and exports them in ACC-compatible format for direct import into asset management systems.

![ACC Asset Extractor](https://img.shields.io/badge/React-19-blue) ![Express](https://img.shields.io/badge/Express-4-green) ![tRPC](https://img.shields.io/badge/tRPC-11-purple) ![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)

---

## Features

- **🤖 AI-Powered Extraction**: Uses LLM to intelligently extract asset data from engineering PDFs
- **📊 Real-time Progress Tracking**: Monitor extraction progress with live updates
- **✅ Asset Validation**: Review and validate extracted assets before export
- **📤 Multiple Export Formats**: Export to ACC Excel, JSON, or CSV
- **🎨 Modern UI**: Built with React 19, Tailwind CSS 4, and shadcn/ui components
- **🔐 Secure Authentication**: Manus OAuth integration with role-based access
- **💾 Database Storage**: MySQL/TiDB backend with Drizzle ORM
- **🚀 Production Ready**: Type-safe tRPC API, hot reload, and comprehensive error handling

---

## Tech Stack

### Frontend
- **React 19** with TypeScript
- **Tailwind CSS 4** with OKLCH color system
- **shadcn/ui** component library
- **Wouter** for routing
- **tRPC** for type-safe API calls
- **Vite** for blazing-fast development

### Backend
- **Express 4** with TypeScript
- **tRPC 11** for end-to-end type safety
- **Drizzle ORM** with MySQL/TiDB
- **Manus OAuth** for authentication
- **Python 3.11** for Excel generation (openpyxl)

### AI/ML
- **Ollama** for local LLM inference
- **Qwen2.5:14b** for asset extraction (recommended)
- **Mistral:7b** or **Llama3.1:8b** for chat/assistance

---

## Prerequisites

- **Node.js** 22+ and pnpm
- **Python 3.11** with pip
- **MySQL** or **TiDB** database
- **Ollama** running locally (for AI extraction)
- **Rclone** configured with access to document storage

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/acc-asset-extractor.git
cd acc-asset-extractor
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
pnpm install

# Install Python dependencies for Excel export
pip3 install openpyxl
```

### 3. Set Up Ollama

```bash
# Install Ollama (if not already installed)
curl -fsSL https://ollama.com/install.sh | sh

# Pull required models
ollama pull qwen2.5:14b    # Primary extraction model
ollama pull mistral:7b     # Chat/assistance model

# Start Ollama server (if not running)
ollama serve
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/acc_extractor

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EXTRACTION_MODEL=qwen2.5:14b
OLLAMA_CHAT_MODEL=mistral:7b

# OAuth (optional - for Manus OAuth integration)
JWT_SECRET=your-secret-key-here
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# Application
VITE_APP_TITLE=ACC Asset Extractor
VITE_APP_LOGO=/logo.png
```

### 5. Set Up Database

```bash
# Push schema to database
pnpm db:push

# (Optional) Load demo data
pnpm db:seed
```

### 6. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

---

## Model Selection Guide

Based on your available Ollama models, here's the recommended configuration:

| Task | Recommended Model | Alternative | Reasoning |
|------|------------------|-------------|-----------|
| **Asset Extraction** | **Qwen2.5:14b** | llama3.1:8b | Qwen2.5 excels at structured data extraction and JSON generation. The 14B parameter size provides better accuracy for complex engineering documents. |
| **Chat/Assistance** | **Mistral:7b** | llama3.1:8b | Mistral is faster and more efficient for conversational tasks while maintaining good quality. |
| **Fallback** | llama3.1:8b | mistral:7b | Llama3.1 provides solid all-around performance if Qwen2.5 is unavailable. |

### Performance Considerations

- **Qwen2.5:14b**: ~8-12 seconds per document page (high accuracy)
- **Mistral:7b**: ~2-4 seconds per chat response (fast, efficient)
- **Llama3.1:8b**: ~3-5 seconds per document page (balanced)

### Memory Requirements

- **Qwen2.5:14b**: ~10GB VRAM
- **Mistral:7b**: ~5GB VRAM
- **Llama3.1:8b**: ~6GB VRAM

---

## Project Structure

```
acc-asset-extractor/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable UI components
│   │   ├── lib/           # tRPC client & utilities
│   │   └── App.tsx        # Routes & layout
│   └── public/            # Static assets
├── server/                # Backend Express + tRPC
│   ├── _core/            # Framework core (OAuth, context, etc.)
│   ├── routers.ts        # tRPC procedure definitions
│   ├── db.ts             # Database query helpers
│   ├── extraction.ts     # Asset extraction logic
│   └── excelExport.ts    # ACC Excel generation
├── drizzle/              # Database schema & migrations
│   └── schema.ts         # Table definitions
├── shared/               # Shared types & constants
└── acc-tools/            # Python CLI tools
    └── poc/
        └── acc_excel_cli.py  # ACC Excel generator
```

---

## Usage

### 1. Load Demo Data

Click **"Load Demo Data"** on the home page to populate the database with 537 pre-extracted assets from the Goonumbla Solar Farm project.

### 2. Start New Extraction

1. Enter a **Project Name** (e.g., "Goonumbla Solar Farm")
2. Provide the **Rclone Remote Path** to your PDF documents
3. Click **"Start Extraction"** to begin AI-powered asset extraction

### 3. Monitor Progress

The extraction page shows:
- Real-time progress percentage
- Number of documents processed
- Number of assets extracted
- Live extraction log feed

### 4. Validate Assets

Review extracted assets in the validation table:
- Filter by category (Inverter, Transformer, etc.)
- Check confidence scores
- Verify asset details

### 5. Export Results

Choose your export format:
- **ACC Excel**: Direct import into ACC asset management system
- **JSON**: Raw structured data with full metadata
- **CSV**: Spreadsheet format for Excel/Google Sheets

---

## Configuration

### Ollama Integration

The application uses Ollama for local LLM inference. Configure in `.env`:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EXTRACTION_MODEL=qwen2.5:14b
OLLAMA_CHAT_MODEL=mistral:7b
```

### Database

Supports MySQL and TiDB. Configure connection in `.env`:

```env
DATABASE_URL=mysql://user:password@host:port/database
```

### Rclone

Ensure rclone is configured with access to your document storage:

```bash
rclone config
```

---

## Development

### Run Tests

```bash
pnpm test
```

### Database Management

```bash
# Push schema changes
pnpm db:push

# Generate migrations
pnpm db:generate

# Run migrations
pnpm db:migrate
```

### Code Quality

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint
```

---

## Deployment

### Docker (Recommended)

```bash
# Build image
docker build -t acc-asset-extractor .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://... \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  acc-asset-extractor
```

### Manual Deployment

1. Build the application:
   ```bash
   pnpm build
   ```

2. Set production environment variables

3. Start the server:
   ```bash
   pnpm start
   ```

---

## Troubleshooting

### Excel Export Fails

**Error**: `AssertionError: SRE module mismatch`

**Solution**: Ensure Python 3.11 is used (not 3.13). The application uses `/usr/bin/python3.11` explicitly.

### Ollama Connection Issues

**Error**: `ECONNREFUSED localhost:11434`

**Solution**: 
1. Ensure Ollama is running: `ollama serve`
2. Check firewall settings
3. Verify `OLLAMA_BASE_URL` in `.env`

### Database Connection Fails

**Error**: `ER_ACCESS_DENIED_ERROR`

**Solution**: Verify `DATABASE_URL` credentials and ensure database exists.

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## License

MIT License - see [LICENSE](LICENSE) file for details

---

## Credits

Built by [Main Character Energy](https://maincharacterenergy.com.au)

Powered by:
- [Ollama](https://ollama.com) for local LLM inference
- [tRPC](https://trpc.io) for type-safe APIs
- [Drizzle ORM](https://orm.drizzle.team) for database management
- [shadcn/ui](https://ui.shadcn.com) for beautiful components

---

## Support

For issues and questions:
- 📧 Email: support@maincharacterenergy.com.au
- 🐛 GitHub Issues: [Report a bug](https://github.com/YOUR_USERNAME/acc-asset-extractor/issues)
- 📖 Documentation: [Wiki](https://github.com/YOUR_USERNAME/acc-asset-extractor/wiki)

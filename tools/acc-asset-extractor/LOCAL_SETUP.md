# ACC Asset Extractor - Local Setup Guide

This guide will help you set up the ACC Asset Extractor on your local machine with Ollama for AI-powered extraction.

## Prerequisites

- **Node.js 22+** and **pnpm**
- **MySQL 8.0+** or **MariaDB 10.5+**
- **Ollama** with models installed (see Ollama Setup below)
- **Python 3.11** (for Excel export functionality)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/robachamilton-afk/mce-tools.git
cd mce-tools/tools/acc-asset-extractor
```

### 2. Install Dependencies

```bash
cd webapp
pnpm install
```

### 3. Set Up Local Database

Create a MySQL database:

```sql
CREATE DATABASE acc_assets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'acc_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON acc_assets.* TO 'acc_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example.txt .env
```

Edit `.env` and set your database connection:

```env
DATABASE_URL="mysql://acc_user:your_password@localhost:3306/acc_assets"
JWT_SECRET="your-secret-key-here"
OLLAMA_BASE_URL="http://localhost:11434"
```

### 5. Initialize Database Schema

```bash
pnpm db:push
```

### 6. Seed Demo Data (Optional)

Load the Goonumbla Solar Farm demo data (882 assets, 6 extraction jobs):

```bash
cd ..  # Back to acc-asset-extractor root
node seed_database.mjs
```

### 7. Start Development Server

```bash
cd webapp
pnpm dev
```

The application will be available at `http://localhost:3000`

## Ollama Setup

### Install Ollama

Follow instructions at [ollama.ai](https://ollama.ai) for your platform.

### Pull Required Models

```bash
# Primary extraction model (14B parameters, best quality)
ollama pull qwen2.5:14b

# Chat/assistant model (7B parameters, fast responses)
ollama pull mistral:7b

# Alternative lightweight model (8B parameters)
ollama pull llama3.1:8b
```

### Verify Ollama is Running

```bash
curl http://localhost:11434/api/tags
```

You should see a JSON response listing your installed models.

## Model Configuration

The application uses different models for different tasks:

- **Asset Extraction**: `qwen2.5:14b` (configured in `webapp/server/_core/ollama.ts`)
  - Best for structured data extraction
  - Higher accuracy for technical documentation
  
- **Chat/Q&A**: `mistral:7b`
  - Fast responses for user queries
  - Good general knowledge

You can change models by editing `webapp/server/_core/ollama.ts`:

```typescript
export const OLLAMA_MODELS = {
  extraction: 'qwen2.5:14b',  // Change to llama3.1:8b for faster extraction
  chat: 'mistral:7b',
};
```

## Python Setup (for Excel Export)

The ACC Excel export requires Python 3.11:

```bash
# Install Python dependencies
pip3 install openpyxl

# Verify Python version
python3.11 --version
```

## Database Management

### View Data

Use any MySQL client or the built-in database UI:

```bash
mysql -u acc_user -p acc_assets
```

### Reset Database

```bash
cd webapp
pnpm db:push --force
```

### Export Current Data

```bash
cd webapp
npx tsx ../export_db_data.ts
# Creates /tmp/db_export.json
```

## Troubleshooting

### Port Already in Use

If port 3000 is taken, change it in `webapp/package.json`:

```json
{
  "scripts": {
    "dev": "vite --port 3001"
  }
}
```

### Database Connection Failed

1. Verify MySQL is running: `sudo systemctl status mysql`
2. Check credentials in `.env`
3. Ensure database exists: `SHOW DATABASES;`

### Ollama Connection Failed

1. Check Ollama is running: `ollama list`
2. Verify base URL in `.env`: `OLLAMA_BASE_URL="http://localhost:11434"`
3. Test connection: `curl http://localhost:11434/api/tags`

### Excel Export Fails

1. Verify Python 3.11 is installed: `python3.11 --version`
2. Install openpyxl: `pip3 install openpyxl`
3. Check script path in `webapp/server/excelExport.ts`

## Production Deployment

For production deployment, see the main [README.md](./webapp/README.md) for:

- Environment variable configuration
- Database migration strategies
- Ollama API endpoint setup
- Nginx reverse proxy configuration

## Additional Resources

- [Ollama Setup Guide](./webapp/OLLAMA_SETUP.md) - Detailed Ollama configuration
- [Environment Variables](./webapp/ENV_TEMPLATE.md) - Complete env reference
- [Architecture Documentation](../../docs/acc/ARCHITECTURE.md) - System design
- [Data Model](../../docs/acc/CANONICAL_DATA_MODEL.md) - Database schema

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting) above
2. Review the [ACC documentation](../../docs/acc/)
3. Open an issue in the GitHub repository

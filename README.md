# 🚀 AutoCustomer — AI-Powered Customer Acquisition System

> **AutoCustomer** 是一个 AI 驱动的自动获客 SaaS 平台，包含开发者招募和客户增长两大核心模块。

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: PostgreSQL + Prisma ORM
- **Cache/Queue**: Redis + BullMQ
- **AI**: Vercel AI SDK (Multi-model: OpenAI / DeepSeek / Qwen)
- **Auth**: Auth.js v5 (GitHub / Google OAuth)

## Quick Start

### 1. Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL + Redis)

### 2. Start Services

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432 (user: `postgres`, password: `postgres`, db: `autocustomer`)
- Redis on port 6379

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment

Copy `.env` and fill in your API keys:

```bash
cp .env.example .env
# Edit .env with your keys
```

Required for full functionality:
- `OPENAI_API_KEY` or `DEEPSEEK_API_KEY` or `QWEN_API_KEY` (at least one AI provider)
- `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` (for OAuth)
- `RESEND_API_KEY` or SMTP config (for email sending)

### 5. Initialize Database

```bash
npx prisma migrate dev --name init
npx prisma db seed   # optional: seed with demo data
```

### 6. Start Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the dashboard.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   └── (dashboard)/      # Dashboard layout (sidebar + header)
├── components/
│   ├── ui/               # shadcn/ui base components
│   ├── layout/           # Sidebar, Header
│   ├── dashboard/        # Stats cards, funnel, timeline, tasks
│   ├── developers/       # Developer-specific components
│   └── leads/            # Lead-specific components
├── lib/                  # Utilities, DB client, validations
├── services/
│   ├── ai/               # AI router, providers, prompts
│   ├── github/           # GitHub API integration
│   ├── scraper/          # Lead source scrapers
│   ├── email/            # Email sending, templates
│   └── workflow/         # Workflow engine
├── hooks/                # React hooks
└── types/                # TypeScript types
```

## Development Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| **1** | Developer Recruitment MVP | 🔧 In Progress |
| **2** | Customer Growth Module | 📋 Planned |
| **3** | Workflow Engine + Advanced Features | 📋 Planned |

See [SPEC.md](../auto-customer-system/SPEC.md) for the complete specification.
See [PHASE1.md](../auto-customer-system/PHASE1.md) for Phase 1 details.
See [PHASE2.md](../auto-customer-system/PHASE2.md) for Phase 2 details.

## License

MIT

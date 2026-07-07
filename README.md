# Pryro SOP — AI-Powered SOP Generator

A production-ready AI-powered platform for creating, managing, and exporting professional Standard Operating Procedures.

## Features

- **AI SOP Generation** — Describe a process in plain English; AI generates a complete professional SOP
- **AI Writing Tools** — Improve, rewrite, fix grammar, summarize, simplify, translate any section
- **Multi-Provider AI** — OpenAI, Anthropic, Groq, OpenRouter, DeepSeek, Mistral, custom OpenAI-compatible APIs
- **Full SOP Editor** — Edit every section: purpose, scope, workflow, checklist, responsibilities, resources
- **SOP Management** — Create, edit, duplicate, archive, favorite, delete, search, filter
- **Export** — Export SOPs as professionally formatted HTML (printable as PDF)
- **Comments** — Comment threads on each SOP
- **Activity Log** — Full audit trail of all changes
- **Dashboard** — Stats, recent SOPs, activity feed, AI usage tracking
- **Command Palette** — ⌘K quick navigation and SOP search
- **Dark / Light Mode** — System-aware theme switching
- **Responsive** — Works on desktop and mobile

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives
- **Animations**: Framer Motion
- **Auth**: NextAuth v5 (JWT strategy)
- **Database**: PostgreSQL + Prisma ORM
- **Forms**: React Hook Form + Zod
- **State**: TanStack Query

## Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally or remotely

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Edit `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/pryro_sop"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-32-char-secret-here"
```

Generate a secret:
```bash
openssl rand -base64 32
```

### 4. Create the database

```sql
CREATE DATABASE pryro_sop;
```

### 5. Run migrations

```bash
npx prisma migrate dev --name init
```

### 6. Generate Prisma client

```bash
npx prisma generate
```

### 7. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## AI Configuration

After signing up, go to **Settings → AI Provider** to configure your AI keys:

| Provider | Models |
|----------|--------|
| OpenAI | gpt-4o, gpt-4o-mini, gpt-4-turbo |
| Anthropic | claude-3-5-sonnet, claude-3-haiku |
| Groq | llama-3.3-70b, mixtral-8x7b |
| OpenRouter | Any model |
| DeepSeek | deepseek-chat, deepseek-reasoner |
| Mistral | mistral-large, mistral-small |
| Custom | Any OpenAI-compatible API |

API keys are stored encrypted in the database per user.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, register pages
│   ├── (app)/           # Protected app pages
│   │   ├── dashboard/   # Dashboard
│   │   ├── sops/        # SOP list, new, detail
│   │   └── settings/    # AI & profile settings
│   └── api/             # API routes
│       ├── ai/          # generate, improve, settings
│       ├── auth/        # NextAuth + register
│       ├── sops/        # CRUD + workflow/checklist/comments
│       └── dashboard/   # Stats
├── components/
│   ├── ui/              # All UI primitives (Radix-based)
│   ├── layout/          # Sidebar + header
│   ├── sops/            # SOP editor, workflow, checklist, etc.
│   ├── dashboard/       # Dashboard client
│   ├── settings/        # Settings forms
│   └── auth/            # Login/register forms
├── lib/
│   ├── db.ts            # Prisma client
│   ├── auth.ts          # NextAuth config
│   ├── ai.ts            # AI provider abstraction
│   └── utils.ts         # Helpers + constants
└── hooks/
    └── use-debounce.ts
```

## Database Schema

Key models:
- **User** — Authentication, role, org membership
- **SOP** — Main document with status, versioning
- **SOPSection** — Document sections (purpose, scope, etc.)
- **WorkflowStep** — Ordered process steps
- **ChecklistItem** — Verification checklist
- **Responsibility** — Roles & responsibilities
- **Resource** — Required resources/tools
- **Comment** — Threaded comments
- **Activity** — Audit log
- **AIGeneration** — AI usage tracking
- **AISettings** — Per-user AI provider config
- **ExportHistory** — Export tracking

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npx prisma studio    # Open Prisma database GUI
npx prisma migrate dev  # Run pending migrations
```

## Deployment

The app is ready to deploy to any Node.js host (Vercel, Railway, Render, etc.).

Set these environment variables in production:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_URL` — Your production URL
- `NEXTAUTH_SECRET` — A strong random secret (32+ chars)

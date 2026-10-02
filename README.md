# Deeney — Personal Task Tracker

A clean, calm personal task tracker. Three pages: Dashboard, Task Marker, Task Adder.
Track daily habits, mark tasks done (or honest about why not), and watch your progress over time.

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** components
- **Prisma ORM** with **PostgreSQL**
- **Recharts** for the progress graph
- Session-based auth (email/password + Google demo) with httpOnly cookies

## Quick Start (Local)

### 1. Prerequisites

- Node.js 18+ (or [Bun](https://bun.sh))
- A PostgreSQL database (see below)

### 2. Install dependencies

```bash
bun install
# or: npm install
```

### 3. Set up the database

Create a PostgreSQL database (any of these free options work):

- **[Supabase](https://supabase.com)** — create a project, copy the connection string from Settings → Database
- **[Neon](https://neon.tech)** — create a project, copy the connection string
- **[Vercel Postgres](https://vercel.com/storage/postgres)** — create from the Vercel dashboard
- **Local Postgres** — `docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres`

Copy `.env.example` to `.env` and fill in your connection string:

```bash
cp .env.example .env
# edit .env → DATABASE_URL="postgresql://..."
```

### 4. Push the schema & start

```bash
bun run db:push      # creates all tables
bun run dev          # starts on http://localhost:3000
```

Open http://localhost:3000, sign up with any email, and start tracking.

## Deploy to Vercel

### 1. Push to GitHub

```bash
# If you haven't set up git identity:
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# Create a new GitHub repo and push:
gh repo create deeney --public --source=. --push
# OR create it on github.com, then:
git remote add origin git@github.com:YOUR_USERNAME/deeney.git
git push -u origin main
```

### 2. Create a Postgres database

Provision a free PostgreSQL database (Supabase / Neon / Vercel Postgres).
Copy the connection string — you'll paste it into Vercel.

### 3. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your `deeney` GitHub repo
3. **Framework preset**: Next.js (auto-detected)
4. **Environment Variables** — add:
   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | `postgresql://...` (your Postgres connection string) |
5. Click **Deploy**

Vercel will run `prisma generate` (via `postinstall`) + `next build` automatically.

### 4. Initialize the database schema

After the first deploy, push the schema to your Postgres:

```bash
# Set DATABASE_URL to your production DB, then:
bun run db:push
```

Or run it locally with the production `DATABASE_URL` in your `.env`.

That's it — your app is live.

## Project Structure

```
prisma/schema.prisma     # DB schema (User, Category, Task, Subtask, TaskMark, SubtaskMark)
src/
  app/
    api/                 # API routes (auth, tasks, marks, stats, categories)
    page.tsx             # Auth gate → AppShell
    layout.tsx
  components/
    auth/                # Login / register screen
    layout/              # Top bar + bottom bar + app shell
    adder/               # Task Adder page
    marker/              # Task Marker page (accordion, YES/NO, subtask checkboxes)
    dashboard/           # Dashboard + progress graph
    common/              # Shared UI (states, pills, badges)
    ui/                  # shadcn/ui components
  hooks/                 # React Query data hooks
  lib/                   # db, auth, types, date helpers, api client
```

## Features

- **Task Adder**: name, category (with color), priority (Low/Med/High), repeat (Daily / Every 3 days / Weekly), start date, optional time, collapsible options, subtasks
- **Task Marker**: accordion cards, date picker, individually-checkable subtasks, YES/NO for subtask-free tasks, required reason for "not done", auto-advance, auto-mark "not done" after 48 hours
- **Dashboard**: summary cards (Completed / Pending / Not done), overall progress ring, per-task progress cards with day dots, history side panel, recent "not done" reasons, and a progress line graph with date + task filters
- **Subtasks = main tasks**: each subtask counts individually toward your stats; a task's status is derived from its subtasks (all done = done)
- Light / dark mode
- Responsive (desktop top bar, mobile bottom bar)

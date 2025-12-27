# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**kaku** is an AI-powered English learning journal tool. Users input experiences in Japanese, and the system generates personalized English narratives with spaced repetition learning materials, text-to-speech audio, and study dashboards.

**Tech Stack:**

- Frontend: Vanilla JS (ES modules), Vite
- Backend: Cloudflare Pages Functions (Node.js runtime)
- Database: Supabase (PostgreSQL with RLS)
- AI Models: Google Gemini 2.0/2.5 Flash, DeepSeek
- Testing: Vitest + Happy DOM

## Architecture Overview

### Frontend → Backend → Database Flow

1. **Frontend** (`src/`): Single-page Vite app with modular JS files handling UI, auth, SRS logic, and API calls
2. **API Proxy**: Vite dev server proxies `/api/*` requests to `localhost:8787` (Wrangler Pages Dev)
3. **Backend** (`functions/api/`): Cloudflare Workers functions that validate requests, call LLM APIs, and persist data to Supabase
4. **Database** (`supabase/`): PostgreSQL with RLS policies ensuring users can only access their own data

### Key Module Responsibilities

- **auth.js**: Supabase Auth (email/password + Google OAuth), session management
- **storage.js**: Supabase client wrapper for CRUD operations on `narratives` and `user_stats` tables
- **srs.js**: Spaced Repetition System logic (scheduling, review intervals, difficulty tracking)
- **review-session.js**: Review session state machine and UI rendering
- **stats.js**: Dashboard aggregations (cumulative stats, daily reviews, calendar view)
- **export.js**: JSON/CSV/Markdown export and import functionality
- **main.js**: Main application orchestration, view routing
- **constants.js**: Shared enums (VIEW states, question templates, category labels)

### Data Model

Key tables in Supabase:

- `narratives`: User-created journal entries with metadata (language level, category, created_at, RLS: user_id)
- `narratives_reviews`: Learner review history (linking narratives to SRS scheduling)
- `user_stats`: Aggregated user statistics (cumulative counts, streaks)

RLS policies enforce `auth.uid()` checks so users see only their own data.

## Common Development Commands

```bash
# Frontend development (hot reload, API proxy to localhost:8787)
npm run dev

# Backend + frontend (Wrangler Pages Dev, closer to production)
npm run dev:full

# Build for production
npm run build

# Run all tests
npm run test

# Run linting
npm run lint

# Format code
npm run format

# Supabase local instance management
npx supabase start       # Start local PostgreSQL + Auth
npx supabase status      # Check status
npx supabase stop        # Stop
npx supabase db reset    # Reset DB (re-runs migrations, clears user data)
```

### Single Test Execution

```bash
# Run a specific test file
npx vitest run tests/srs.test.js

# Run tests matching a pattern
npx vitest run --grep "SRS"
```

## Development Workflow

### Local Development Setup

1. Start Supabase: `npx supabase start` (note: Docker required)
2. Copy printed `API URL` and `anon key` to `.env` for frontend
3. Backend `.dev.vars` needs `GEMINI_API_KEY` and database credentials
4. Start frontend: `npm run dev` (serves on `:5173`, proxies `/api` to `:8787`)
5. Backend auto-runs via `npm run dev:full` or manual `wrangler pages dev dist`

### Database Migrations

Create new migrations with:

```bash
npx supabase migration new <migration_name>
# Write SQL in the generated file
npx supabase db reset  # Apply to local instance
```

Migrations auto-apply on Supabase Cloud after git push (via GitHub Actions).

### Adding Features Spanning Frontend + Backend

1. Define/extend Supabase table schema (migration)
2. Update frontend storage layer (storage.js CRUD operations)
3. Add/update API endpoint (functions/api/\*)
4. Add frontend UI logic (main.js or feature module)
5. Add tests if appropriate

## Important Files and Patterns

### Frontend Entry Point

- [src/index.html](src/index.html): Main HTML file (imports main.js)
- [src/main.js](src/main.js): Application initialization, view routing, event delegation

### Auth System

- User session stored in Supabase (`supabase.auth.session()`)
- Auth state changes trigger `onAuthStateChange` listeners
- Protected routes check `isAuthenticated()` before rendering

### API Request Pattern

Backend functions accept POST requests with JSON body. Validation happens in `functions/api/generate.js` before Gemini API calls. CORS is pre-configured via Wrangler.

### Testing

- Tests in `tests/` use Vitest + Happy DOM (no browser required)
- Mocking example: `storage.js` methods are mocked in test setup
- Run `npm run test` to execute all tests

## Key Dependencies

- **@supabase/supabase-js**: Database, auth, real-time (v2.89.0)
- **vite**: Build tool & dev server with automatic module reloading
- **vitest**: Unit testing framework
- **happy-dom**: Lightweight DOM implementation for tests
- **wrangler**: Cloudflare Workers CLI for local backend dev

## Commit Message Rules

Follow Conventional Commits format (defined in `.agent/rules/commit-message-format.md`):

- Prefix types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `style`, `revert`
- Japanese language for messages (since this is a Japanese-first project)
- Format: `<type>(scope): <summary>\n\n- change 1\n- change 2`
- Example: `feat(srs): Add interval multiplier to review spacing`

## Coding Standards

Defined in `.agent/rules/coding.md`:

- Avoid `any` types and intentional type degradation
- Keep changes minimal and focused (no unnecessary refactoring)
- Read files before modifying them
- For critical changes (auth, DB schema, security), propose a plan first
- Run linting on modified files: `npm run lint` or `npm run format`

## Debugging Tips

- **API errors**: Check browser Network tab and Wrangler terminal for 400/500 responses
- **Auth issues**: Verify `.env` Supabase URL/key, check RLS policies in Supabase dashboard
- **SRS/Review logic**: Look at `srs.js` for scheduling calculations and `review-session.js` for state
- **Supabase local issues**: `npx supabase logs --local` shows Docker container logs
- **Missing dependencies**: Delete `node_modules` and run `npm install` fresh

## Notes for Future Development

- The frontend is vanilla JS with no framework; keep modules small and event-driven
- Backend functions are stateless; all persistence goes through Supabase
- RLS policies are strict: test that cross-user data access is blocked
- The `npm run dev` + `npm run dev:backend` in parallel is the standard local workflow (simpler than `npm run dev:full`)
- Gemini/DeepSeek API costs scale with request volume; test locally first

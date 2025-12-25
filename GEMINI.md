# My English Journal (formerly Gemini Narrative AI)

## Project Overview

This is a web application designed to help users improve their English speaking skills by writing diaries. It uses an AI (likely Google Gemini) to generate English journal entries from user input. The frontend is built with vanilla JavaScript and Vite, and the backend is powered by Cloudflare Pages Functions. Supabase is used for the database and user authentication.

## Building and Running

### Development

The primary command for full-stack local development (frontend + backend + migrations) is:

```bash
npm run dev:full
```

This starts the Cloudflare Pages Dev server, which serves the frontend from `src/` and runs the backend functions from `functions/`.

Alternatively, for frontend-only work with Vite:
```bash
npm run dev
```

To run the backend only:
```bash
npm run dev:backend
```

### Environment Variables

- **Frontend:** Managed via `.env`.
- **Backend (Cloudflare):** Managed via `.dev.vars` for local development. This is where `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, and Supabase credentials for the backend should be stored.

## Development Conventions

*   **Database:** Supabase is used for the database. Migrations are located in the `supabase/migrations` directory. To create a new migration, run `npx supabase migration new <migration_name>`. Note: After `npx supabase db reset`, existing login sessions in the browser will become invalid.
*   **Backend:** Backend functions are located in the `functions/api` directory. They use manual validation instead of `ajv` to maintain compatibility with Cloudflare Workers' security policies.
*   **Frontend:** The frontend source code is in the `src` directory.

# GEMINI.md

## Project Overview

This is a web application designed to help users improve their English speaking skills. It uses an AI (likely Google Gemini) to generate English narratives from user input. The frontend is built with vanilla JavaScript and Vite, and the backend is powered by Cloudflare Pages Functions. Supabase is used for the database and user authentication.

## Building and Running

### Development

To run the development server for the frontend:

```bash
npm run dev
```

This will start a Vite development server and proxy API requests to the backend.

To run the backend locally:

```bash
npm run dev:backend
```

### Building

To build the project for production:

```bash
npm run build
```

This will create a `dist` directory with the built files.

### All-in-one

To build the frontend and run the backend server:

```bash
npm run dev:all
```

## Development Conventions

*   **Database:** Supabase is used for the database. Migrations are located in the `supabase/migrations` directory. To create a new migration, run `npx supabase migration new <migration_name>`.
*   **Backend:** Backend functions are located in the `functions/api` directory.
*   **Frontend:** The frontend source code is in the `src` directory.
*   **Environment Variables:** Environment variables are managed with a `.env` file. A `.env.example` file is provided as a template.

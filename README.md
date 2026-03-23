# Collaborative Code Review Platform (Backend)

This is the backend API for a collaborative code review platform built with **TypeScript + Express + Postgres** and **Socket.IO** for real-time project updates.

## Tech Stack
- **Node.js/TypeScript** (Express)
- **PostgreSQL** (`pg` connection pool)
- **JWT** authentication (`jsonwebtoken`)
- **Socket.IO** for real-time updates (project rooms)

## Project Concepts
- **Users**: have a global `role` (`Reviewer` or `Submitter`).
- **Projects**: users join via `project_members`.
- **Project membership role**: `project_members.role` (also `Reviewer` or `Submitter`) controls permissions inside a project.
- **Submissions**: created by project members; have a `status`.
- **Comments**: added by project-level reviewers; belong to a submission and can be line-specific.
- **Reviews**: project-level reviewers approve or request changes; updates submission status.
- **Notifications**: endpoints exist to read and mark notifications as read (creation is currently driven by real-time events).

## Real-time (Socket.IO)
Clients should connect to the Socket.IO server and join a per-project room:
- Emit: `joinProject` with payload like `"1"` (project id as a string)
- Server joins room: `project_<id>`

Security note: `joinProject` is currently not JWT-protected in the backend; clients can join rooms directly. Consider adding auth if you need it.

REST endpoints emit these events to the project room:
- `submissionCreated` (after `POST /api/submissions`)
- `submissionUpdated` (after `PATCH /api/submissions/:id/status`)
- `commentCreated` (after `POST /api/submissions/:id/comments`)
- `submissionApproved` (after `POST /api/submissions/:id/approve`)
- `submissionChangesRequested` (after `POST /api/submissions/:id/request-changes`)

## Requirements
- Node.js 18+
- PostgreSQL

## Environment Variables
Create a `.env` file from `.env.example`:

`JWT_SECRET` is required (no insecure default).

Required variables:
- `PORT` (default: `4000`)
- `NODE_ENV` (e.g. `development`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`
- `JWT_SECRET`, `JWT_EXPIRES_IN` (default: `7d`)
- `CORS_ORIGIN` (default: `http://localhost:3000`)

Note on seeding / `npm run seed`:
- `npm run seed` expects `DATABASE_URL` to be available (it shells out to `psql $DATABASE_URL ...`).
- `DATABASE_URL` is not currently included in `.env.example`, so you must either add `DATABASE_URL` yourself or run the SQL commands manually (Option 2 below).

## Setup (Local)
1. Create your Postgres database.
2. Copy env file:
   - `copy .env.example .env` (PowerShell)
3. Set `JWT_SECRET` to a random string.
4. Install dependencies:
   - `npm ci`
5. Prepare the database (pick one option).

Option 1: set `DATABASE_URL` and use `npm run seed`
- Add this to `.env`:
  - `DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_DATABASE>`
- Then run:
  - `npm run seed`

Option 2: run migrations + seed manually with `psql` (no `DATABASE_URL`)
- Run migrations:
  - `psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $env:DB_DATABASE -f "migrations/schema.sql"`
- Run seed:
  - `psql -h $env:DB_HOST -p $env:DB_PORT -U $env:DB_USER -d $env:DB_DATABASE -f "src/seed/seed.sql"`

6. Start the dev server:
   - `npm run dev`

Seed re-run note:
- The seed script inserts fixed demo users (`alice@example.com`, `bob@example.com`). If you re-run it on a database that already has those emails, it will fail due to the `users.email` unique constraint. Use an empty database (or remove those rows) when re-seeding.

## Health Check
- `GET /health` returns `{ "status": "ok" }` when the DB is reachable.

## REST API (Routes)
All requests require `Authorization: Bearer <jwt>` unless otherwise noted.

### Auth
- `POST /api/auth/register` — register (new users are defaulted to `Submitter`)
- `POST /api/auth/login` — login (returns `{ user, token }`)

### Users
- `GET /api/users/me` — current user profile
- `GET /api/users/:id/notifications` — list a user’s notifications (owner only)
- `PATCH /api/notifications/:id/read` — mark a notification as read (owner only)

### Projects
- `POST /api/projects` — create a project (creator is added as project `Reviewer`)
- `GET /api/projects` — list projects
- `POST /api/projects/:id/members` — add member (project-level `Reviewer` only)
- `DELETE /api/projects/:id/members/:userId` — remove member (project-level `Reviewer` only)

### Submissions
- `POST /api/submissions` — create a submission (must be a project member)
- `GET /api/submissions/project/:id?page=&limit=` — list submissions in a project (member only)
- `PATCH /api/submissions/:id/status` — update status (project-level `Reviewer` only)
- `DELETE /api/submissions/:id` — delete submission (submitter/owner only)

### Comments
- `POST /api/submissions/:id/comments` — add comment (project-level `Reviewer` only)
- `GET /api/submissions/:id/comments?page=&limit=` — list comments (member only)
- `PATCH /api/comments/:id` — edit your comment (comment author only)
- `DELETE /api/comments/:id` — delete your comment (comment author only)

### Reviews
- `POST /api/submissions/:id/approve` — approve (project-level `Reviewer` only)
- `POST /api/submissions/:id/request-changes` — request changes (project-level `Reviewer` only)
- `GET /api/submissions/:id/reviews?page=&limit=` — list reviews (member only)

## Notes
- Access control is enforced primarily via **project membership** (`project_members`) and **resource ownership** (author/submitter).
- Validation is handled with `express-validator` for inputs; errors are returned by the centralized error handler as `{ "message": "..." }`.

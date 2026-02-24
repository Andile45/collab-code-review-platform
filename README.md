<<<<<<< HEAD

=======
# Collaborative Code Review Platform (Backend)

## Requirements
- Docker & Docker Compose OR Node.js + Postgres
- Node 18+ recommended

## Setup (Docker)
1. Copy `.env.example` -> `.env` and fill `JWT_SECRET`.
```bash
cp .env.example .env
# edit .env and set JWT_SECRET to a random string
```

2. Build & run:
```bash
docker-compose up --build
```

3. Seed DB (once the db is healthy):
```bash
docker-compose exec api sh -c "npm run seed"
```

## Setup (Local without Docker)
1. Create Postgres DB locally.
2. Copy `.env.example` -> `.env` and update `DATABASE_URL`.
3. Install deps:
```bash
npm ci
```

4. Run migrations:
```bash
psql $DATABASE_URL -f migrations/schema.sql
psql $DATABASE_URL -f src/seed/seed.sql
```

5. Start dev server:
```bash
npm run dev
```

## API Highlights
- `POST /api/auth/register` — register
- `POST /api/auth/login` — login
- `GET /api/users/me` — profile
- `POST /api/projects` — create project
- `POST /api/submissions` — create submission
- `POST /api/submissions/:id/approve` — approve (Reviewer)
- `POST /api/submissions/:id/request-changes` — request changes (Reviewer)
- Real-time: connect to Socket.IO and `joinProject` room `project_<id>`

## Notes
- Roles: `Reviewer` and `Submitter` enforced by middleware.
- Add more validation as needed.
>>>>>>> origin/master

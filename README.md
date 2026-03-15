# Lemontree Volunteer Outreach Platform

A full-stack self-serve platform for Lemontree nonprofit volunteers to independently organize flyering events, auto-generate branded flyers with QR signup codes, and track collective impact.

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS
- **Backend:** Python, FastAPI
- **Database:** Supabase (Postgres, Auth, Storage)
- **Infra:** Vercel, GitHub

## Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project

## Configuration

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase project settings |
| `SECRET_KEY` | Random secret for token signing (min 32 chars) |
| `FRONTEND_URL` | Frontend base URL (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Backend base URL (default: `http://localhost:8000`) |

## Running the Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API will be available at **http://localhost:8000**
Interactive API docs: **http://localhost:8000/docs**

## Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:3000**

## Project Structure

```
MS-CodeToGive-TEAM3/
├── frontend/            # Next.js app (TypeScript, Tailwind)
│   └── app/
│       ├── login/       # Login page
│       ├── signup/      # Signup page
│       ├── components/  # Shared UI components
│       └── styles/      # Lemontree design system
├── backend/             # FastAPI app (Python)
│   └── app/
│       ├── main.py      # App entry point + middleware
│       ├── core/        # Config, auth, Supabase clients
│       └── api/routes/  # auth, events, signups, flyer, admin
├── assets/              # SVG logos
├── docs/
│   └── BUILD_PLAN.md    # Full architecture and implementation plan
└── .env.example         # Environment variable template
```

## Documentation

- [Build Plan](docs/BUILD_PLAN.md) — Full implementation plan with system architecture, data model, API design, and phased roadmap

# Backend (FastAPI + Supabase)

## Setup

(Would suggest at least Python 3.11)
```zsh
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
```

Copy the root `.env.example` to `.env` and fill in your values:

```zsh
cp ../.env.example ../.env
```

## Run

```zsh
uvicorn app.main:app --reload
```

API docs available at http://localhost:8000/docs

## Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app + middleware
│   ├── core/
│   │   ├── config.py        # Settings (reads from root .env)
│   │   ├── supabase.py      # Supabase client factory
│   │   └── auth.py          # JWT dependency for protected routes
│   └── api/
│       └── routes/
│           ├── auth.py      # /api/v1/auth/* (signup, login, logout)
│           ├── events.py    # /api/v1/events/* (CRUD + nearby resources)
│           ├── admin.py     # /api/v1/admin/* (admin only)
│           └── health.py    # /health
└── requirements.txt
```

## Using the auth dependency

```python
from app.core.auth import CurrentUser

@router.get("/me")
async def me(user: CurrentUser):
    return {"user_id": user["sub"]}
```

## Auth API — cURL Tests                                                                                            
                                                                                                                      
  ### Sign Up (minimal)
  ```zsh                                                                                                             
  curl -s -X POST http://localhost:8000/api/v1/auth/signup \
    -H "Content-Type: application/json" \
    -d '{                                                                                                             
      "name": "Jane Doe",
      "email": "jane@example.com",
      "password": "password123"
    }'

  Sign Up (full)

  curl -s -X POST http://localhost:8000/api/v1/auth/signup \
    -H "Content-Type: application/json" \
    -d '{
      "name": "John Doe",
      "email": "john@example.com",
      "password": "password123",
      "phone": "555-867-5309",
      "category": "corporate",
      "languages": ["en", "es"],
      "referral_source": "friend",
      "referral_code": "abc12345"
    }'

  Sign Up — duplicate email (expect 409)

  curl -s -X POST http://localhost:8000/api/v1/auth/signup \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Jane Doe",
      "email": "jane@example.com",
      "password": "password123"
    }'

  Log In (valid credentials)

  curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "jane@example.com",
      "password": "password123"
    }'

  Log In — wrong password (expect 401)

  curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "jane@example.com",
      "password": "wrongpassword"
    }'

  Log Out (requires access token from login)

  TOKEN="<paste access_token from login response>"

  curl -s -X POST http://localhost:8000/api/v1/auth/logout \
    -H "Authorization: Bearer $TOKEN"

  Log Out — no token (expect 403)

  curl -s -X POST http://localhost:8000/api/v1/auth/logout

## Events API — cURL Tests

### Create event

curl -s -X POST http://localhost:8000/api/v1/events/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Mission District Outreach",
    "description": "Help distribute food pantry flyers.",
    "date": "2026-04-20",
    "start_time": "10:00:00",
    "end_time": "13:00:00",
    "location_name": "Mission Dolores Park",
    "latitude": 37.7599,
    "longitude": -122.4148,
    "volunteer_limit": 10
  }'

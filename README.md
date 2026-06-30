# TaskFlow

A full-stack project and task management application — Trello-style — built with Django REST Framework and React.

## Tech Stack

| Layer      | Technology |
|------------|-----------|
| Backend    | Django 6 + Django REST Framework |
| Auth       | JWT via `djangorestframework-simplejwt` |
| Database   | PostgreSQL (SQLite in development until Postgres is running) |
| Frontend   | React 18 + Vite |
| Styling    | Tailwind CSS v4 |
| HTTP       | Axios with automatic token refresh |

---

## Setup

### Prerequisites

- Python 3.11+
- Node 20+
- PostgreSQL 15+ *(optional for local dev — SQLite fallback is configured)*

---

### Backend

```bash
cd taskflow-backend

# Create and activate virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env — set USE_POSTGRES=True and fill DB_* vars once Postgres is running

# Run migrations
python manage.py migrate

# Start dev server
python manage.py runserver
```

API will be available at `http://localhost:8000`

#### Switching to PostgreSQL

1. Install and start PostgreSQL.
2. Create a database and user:
   ```sql
   CREATE DATABASE taskflow_db;
   CREATE USER taskflow_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE taskflow_db TO taskflow_user;
   ```
3. In `.env`, set `USE_POSTGRES=True` and fill in `DB_*` values.
4. Run `python manage.py migrate`.

---

### Frontend

```bash
cd taskflow-frontend
npm install
npm run dev
```

App will be available at `http://localhost:5173`

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register/` | Public | Register new user, returns tokens |
| POST | `/api/auth/login/` | Public | Login, returns tokens |
| POST | `/api/auth/token/refresh/` | Public | Refresh access token |
| GET | `/api/auth/me/` | Bearer | Get current user profile |

---

## Project Status

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Project setup & JWT authentication | ✅ Complete |
| Phase 2 | Workspace & board management | Pending |
| Phase 3 | Lists & cards (Trello-style drag-and-drop) | Pending |
| Phase 4 | Card details — checklists, due dates, labels | Pending |
| Phase 5 | Team members & permissions | Pending |
| Phase 6 | Real-time updates (WebSockets / Django Channels) | Pending |
| Phase 7 | File attachments & avatar uploads | Pending |
| Phase 8 | Notifications & activity feed | Pending |

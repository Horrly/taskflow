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

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register/` | Public | Register new user, returns tokens |
| POST | `/api/auth/login/` | Public | Login, returns tokens |
| POST | `/api/auth/token/refresh/` | Public | Refresh access token |
| GET | `/api/auth/me/` | Bearer | Get current user profile |

### Workspaces

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workspaces/` | Bearer | List workspaces the current user is a member of |
| POST | `/api/workspaces/` | Bearer | Create a workspace (caller becomes owner) |
| GET | `/api/workspaces/{id}/` | Bearer (member) | Workspace detail |
| PATCH | `/api/workspaces/{id}/` | Bearer (owner) | Rename workspace |
| DELETE | `/api/workspaces/{id}/` | Bearer (owner) | Delete workspace |
| GET | `/api/workspaces/{id}/members/` | Bearer (member) | List all members |
| POST | `/api/workspaces/{id}/invite/` | Bearer (member) | Invite by email `{ "email": "..." }` |
| POST | `/api/workspaces/{id}/remove-member/` | Bearer (owner) | Remove member `{ "user_id": ... }` |

### Projects

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workspaces/{id}/projects/` | Bearer (member) | List projects in a workspace |
| POST | `/api/workspaces/{id}/projects/` | Bearer (member) | Create project (auto-creates 3 default columns) |
| GET | `/api/projects/{id}/` | Bearer (member) | Project detail with nested task lists |
| PATCH | `/api/projects/{id}/` | Bearer (member) | Update name, description, status, due date |
| DELETE | `/api/projects/{id}/` | Bearer (member) | Delete project (cascades to lists) |

### Task Lists (Kanban Columns)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/projects/{id}/lists/` | Bearer (member) | List columns ordered by position (includes nested tasks) |
| POST | `/api/projects/{id}/lists/` | Bearer (member) | Add a column (auto-assigns next position) |
| PATCH | `/api/lists/{id}/` | Bearer (member) | Rename or recolor a column |
| DELETE | `/api/lists/{id}/` | Bearer (member) | Delete column (blocked if it has tasks) |
| PATCH | `/api/lists/{id}/reorder/` | Bearer (member) | Move column: `{ "position": 0 }` shifts others |

### Tasks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/lists/{id}/tasks/` | Bearer (member) | List tasks in a column, ordered by position |
| POST | `/api/lists/{id}/tasks/` | Bearer (member) | Quick-create a task `{ "title": "..." }` |
| GET | `/api/tasks/{id}/` | Bearer (member) | Full task detail with description, assignees, labels |
| PATCH | `/api/tasks/{id}/` | Bearer (member) | Update title, description, priority, due_date, assignees (list of IDs) |
| DELETE | `/api/tasks/{id}/` | Bearer (member) | Delete task |
| PATCH | `/api/tasks/{id}/move/` | Bearer (member) | Move task: `{ "task_list_id": N, "position": N }` — re-sequences both source and dest columns atomically |

### Labels

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workspaces/{id}/labels/` | Bearer (member) | List workspace labels |
| POST | `/api/workspaces/{id}/labels/` | Bearer (member) | Create label `{ "name": "...", "color": "#HEX" }` — name must be unique per workspace |
| PATCH | `/api/labels/{id}/` | Bearer (member) | Update label name or color |
| DELETE | `/api/labels/{id}/` | Bearer (member) | Delete label (removes from all tasks) |
| POST | `/api/tasks/{id}/labels/` | Bearer (member) | Attach label to task `{ "label_id": N }` |
| DELETE | `/api/tasks/{id}/labels/{label_id}/` | Bearer (member) | Detach label from task |

### Comments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/tasks/{id}/comments/` | Bearer (member) | List task comments, oldest first |
| POST | `/api/tasks/{id}/comments/` | Bearer (member) | Post a comment `{ "body": "..." }` |
| PATCH | `/api/comments/{id}/` | Bearer (author) | Edit own comment — sets `is_edited: true` |
| DELETE | `/api/comments/{id}/` | Bearer (author) | Delete own comment — 403 for non-authors |

---

## Project Status

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Project setup & JWT authentication | ✅ Complete |
| **Phase 2** | Workspaces with invite-by-email | ✅ Complete |
| **Phase 3** | Projects & Kanban task lists with drag-and-drop reordering | ✅ Complete |
| **Phase 4** | Tasks — drag-and-drop cards, slide-out detail panel, priorities, due dates, assignees | ✅ Complete |
| **Phase 5** | Labels & comments with author-scoped edit/delete | ✅ Complete |
| Phase 6 | Real-time updates (WebSockets / Django Channels) | Pending |
| Phase 7 | File attachments & avatar uploads | Pending |
| Phase 8 | Notifications & activity feed | Pending |

# TaskFlow

TaskFlow is a project and task management app for small teams. Create a workspace, invite your teammates, and organize work on drag-and-drop Kanban boards — assign tasks, set priorities and due dates, tag things with labels, leave comments, and keep an eye on everything that's happening across your team with a live activity feed. A personal "My Tasks" view pulls together everything assigned to you, across every workspace, with filters and at-a-glance stats so nothing falls through the cracks.

## Features

- **Workspaces** — invite teammates by email, manage membership, owner-only controls for renaming/deleting
- **Projects & Kanban boards** — drag-and-drop columns and cards, custom column colors, reorder everything freely
- **Tasks** — priorities, due dates, multiple assignees, rich descriptions, a slide-out detail panel
- **Labels** — color-coded, workspace-scoped, applied and removed straight from a task
- **Comments** — threaded per task, with author-scoped editing and deletion
- **Activity log** — automatic, signal-driven feed at the workspace, project, task, and personal level
- **My Tasks** — a cross-workspace view of everything assigned to you, with priority/due-date/label/workspace filters and summary stats (overdue, due today, due this week, completed this week)
- **Dark mode** — respects your OS preference by default, with a one-click override that's remembered
- **Polished UX** — skeleton loading states, friendly empty states, toast notifications, and a graceful error screen instead of a blank crash

## Tech Stack

| Backend | Frontend |
|---|---|
| Django 6 | React 19 |
| Django REST Framework | Vite |
| SimpleJWT (JWT auth) | Tailwind CSS v4 |
| PostgreSQL (SQLite fallback for local dev) | React Router |
| pytest + pytest-django + factory-boy | Axios (with automatic token refresh) |
|  | @hello-pangea/dnd (drag-and-drop) |
|  | react-helmet-async |
|  | Playwright (end-to-end tests) |

## Screenshots

> 📸 Screenshot: Project Board (dark mode)

> 📸 Screenshot: My Tasks with filters

> 📸 Screenshot: Task detail panel

*(Screenshots to be added after the build is complete.)*

## Getting Started

### Prerequisites

- Python 3.11+
- Node 20+
- PostgreSQL 15+ *(optional — SQLite is used automatically in local dev)*

### 1. Backend

```bash
cd taskflow-backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

`.env` variables:

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Django secret key | — (set your own) |
| `DEBUG` | Debug mode | `True` |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | `localhost,127.0.0.1` |
| `USE_POSTGRES` | Use PostgreSQL instead of SQLite | `False` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` | PostgreSQL connection (only used if `USE_POSTGRES=True`) | `taskflow_db` / `taskflow_user` / — / `localhost` / `5432` |

```bash
# Run migrations
python manage.py migrate

# Start the dev server
python manage.py runserver
```

The API is now running at `http://localhost:8000`.

### 2. Frontend

```bash
cd taskflow-frontend
npm install
npm run dev
```

The app is now running at `http://localhost:5173`.

Register a new account from the app, create a workspace, and you're in.

## Running Tests

**Backend (pytest)** — 50+ tests covering auth, workspaces, projects, tasks, labels, comments, activity, and filters:

```bash
cd taskflow-backend
python -m pytest --tb=short -q
```

**End-to-end (Playwright)** — covers the critical user flows: auth, workspace creation, the Kanban board (quick-add, priority, drag-and-drop), and My Tasks filters. Requires the Vite dev server to be running (`npm run dev` in another terminal), or relies on the `webServer` block in `playwright.config.js` to start it automatically:

```bash
cd taskflow-frontend
npx playwright install chromium   # one-time browser install
npx playwright test

# Or run a single spec:
npx playwright test e2e/auth.spec.js
```

## Project Status

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Project setup & JWT authentication | ✅ Complete |
| **Phase 2** | Workspaces with invite-by-email | ✅ Complete |
| **Phase 3** | Projects & Kanban task lists with drag-and-drop reordering | ✅ Complete |
| **Phase 4** | Tasks — drag-and-drop cards, slide-out detail panel, priorities, due dates, assignees | ✅ Complete |
| **Phase 5** | Labels & comments with author-scoped edit/delete | ✅ Complete |
| **Phase 6** | Activity log — signal-driven activity feed (workspace, task, personal) | ✅ Complete |
| **Phase 7** | Dashboard & filters — cross-workspace My Tasks view, dashboard stats, project progress | ✅ Complete |
| **Phase 8** | Polish — pytest & Playwright test suites, dark mode, loading/empty states, toasts, error boundary, README | ✅ Complete |

## License

MIT

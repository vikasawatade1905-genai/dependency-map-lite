# DependencyMap Lite

> A full-stack project dependency tracker with a live Kanban board, dependency graph, prerequisite matrix, and an API that prevents circular dependencies and invalid task transitions.

![DependencyMap Lite dashboard](https://img.shields.io/badge/UI-Glass%20Dashboard-393834?style=for-the-badge)
![MERN Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node%20%7C%20Express%20%7C%20MongoDB-668f83?style=for-the-badge)
![DAG Engine](https://img.shields.io/badge/Engine-DFS%20Cycle%20Prevention-b77853?style=for-the-badge)

---

## Architecture Overview

```text
dependency-map-lite/
├── README.md
├── package.json                  # Root monorepo scripts (dev, install-all, seed)
├── server/
│   ├── package.json
│   ├── .env.example              # Environment variable template (copy to .env)
│   ├── server.js                 # Express app + auto-seed bootstrap + graceful shutdown
│   ├── config/
│   │   └── db.js                 # Dual-mode Mongoose + mongodb-memory-server fallback
│   ├── models/
│   │   └── Task.js               # Mongoose schema + virtuals
│   ├── services/
│   │   └── graphEngine.js        # DFS Cycle Detection & Blocker State Resolution Engine
│   ├── middleware/
│   │   ├── validateRequest.js    # Zod schema validation
│   │   └── errorHandler.js       # Centralized error formatter
│   ├── controllers/
│   │   └── taskController.js     # REST CRUD, Dependency Linking, Status Gatekeeper
│   ├── routes/
│   │   └── taskRoutes.js         # Express REST router
│   ├── seed/
│   │   └── seedData.js           # 10-Task realistic DAG software release seeder
│   └── tests/
│       └── verifyGraphEngine.js  # Automated graph engine verification suite
└── client/
    ├── package.json
    ├── vite.config.js            # Vite + /api proxy to http://localhost:5000
    ├── tailwind.config.js        # Dark slate theme tokens & glow animations
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx               # State management, toast notifications, guardrail alerts
        ├── index.css             # Tailwind base & custom glowing effects
        ├── api/
        │   └── taskApi.js        # Axios client with cycle & blocker error extractor
        └── components/
            ├── Header.jsx        # Navigation, search, filter chips, action triggers
            ├── StatsBar.jsx      # Metrics: Total, Ready, Blocked (crimson), In Progress, Done
            ├── TaskBoard.jsx     # Responsive Kanban & Grid views with blocker division
            ├── TaskCard.jsx      # Blocked pills, prerequisite chips, status gatekeepers
            ├── TaskModal.jsx     # Create/Edit modal with multi-select & cycle alert
            └── DependencyGraphModal.jsx # Visual DAG hierarchy & blocker chain inspector
```

---

## Core Algorithms & State Machine Guardrails

### 1. Depth-First Search (DFS) Cycle Detection
When creating or editing a task's prerequisites, `graphEngine.js` performs a 3-color DFS graph traversal across the dependency tree:
- **Direct Self-Dependency:** Rejects tasks that attempt to depend on themselves (`A -> A`).
- **2-Node Loops:** Rejects reciprocal dependencies (`A -> B -> A`).
- **Transitive Multi-Node Cycles:** Detects deep loops (`A -> B -> C -> ... -> A`).
- **Detailed Cycle Path Trace:** Returns the exact human-readable cycle path (e.g., `["Task A", "Task B", "Task C", "Task A"]`) rendered with high visibility in the UI.

### 2. Blocker State Resolution Engine
For every task in the system, its prerequisites are evaluated in real time:
- A task is **BLOCKED** if `status !== 'Done'` and ANY of its direct prerequisites have a status other than `'Done'`.
- A task is **READY TO START** if `status === 'Not Started'` and all its prerequisites are completed (`Done`).

### 3. Strict State Transition Guardrails
- Moving a task to `In Progress` or `Done` is strictly prohibited if any prerequisites are unfinished.
- If a user clicks `Start` or changes status to `In Progress` / `Done` on a blocked task:
  - The card shakes with an interactive alert.
  - The API returns HTTP 400 with the exact list of unfinished blocking prerequisites.
  - A prominent guardrail violation alert appears with a 1-click **Inspect in Graph** shortcut.

### 4. MongoDB persistence and local fallback
- Connects to `process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dependencymap_lite'`.
- If MongoDB is unavailable, it starts `mongodb-memory-server` and seeds 10 demo tasks. This fallback is temporary: data is lost when the process stops. Use `MONGO_URI` for persistent storage.

---

## Quickstart & Commands

### Prerequisites
- Node.js >= 18
- npm >= 9

### Install All Dependencies
From the repository root:
```bash
npm run install-all
```

Copy `server/.env.example` to `server/.env` for local configuration. Set `MONGO_URI` to a MongoDB connection string when persistent local data is needed. Never commit `.env` files.

### Start Development Server
Concurrently launches the Express backend (`http://localhost:5000`) and the Vite React frontend (`http://localhost:5173`):
```bash
npm run dev
```

### Run Graph Engine Test Suite
Executes the automated graph engine test suite verifying cycles, guardrails, and rankings:
```bash
npm run test:engine
```

### Reseed Demo Data
Resets the database and populates 10 DAG tasks:
```bash
npm run seed
```

---

## Deploy the Backend to Render

The root `render.yaml` defines a Node web service for the API. Render builds from `server/`, starts with `npm start`, and checks `/api/health`. Push this repository to GitHub, then create a Render Blueprint from the repository or deploy the service with the Render CLI.

For durable task data, add `MONGO_URI` as a secret environment variable in the Render service settings and point it to a reachable MongoDB deployment. Without it, the API uses its in-memory fallback, and task data is reset when the service restarts or sleeps.

After deployment, verify `https://<your-render-service>.onrender.com/api/health` returns a healthy status.

## REST API Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/tasks` | Get all tasks enriched with dynamic blocker metadata (supports `?status=`, `?priority=`, `?blocked=`, `?ready=`, `?search=`) |
| `GET` | `/api/tasks/graph` | Get graph nodes, directed edges, and topological ranks |
| `GET` | `/api/tasks/:id` | Get single task with populated prerequisites, dependents, and upstream blocker chain |
| `POST` | `/api/tasks` | Create task with DFS cycle detection and guardrail enforcement |
| `PUT` | `/api/tasks/:id` | Update task title, status, priority, or prerequisites with cycle & guardrail checks |
| `DELETE` | `/api/tasks/:id` | Delete task and cascade remove references from dependent tasks |
| `POST` | `/api/tasks/reset` | Reseed the database with 10 demo DAG tasks |

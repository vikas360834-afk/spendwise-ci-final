# SpendWise AI — Smart Expense Tracker with Glassmorphism UI

[![CI Pipeline](https://github.com/spendwise/spendwise-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/spendwise/spendwise-ai/actions)
[![Docker Image](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/react-18.3.1-61dafb.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/license-MIT-purple.svg)](LICENSE)

> **SpendWise AI** is a production-quality personal fintech dashboard built with a **Dark Glassmorphism** design language inspired by modern SaaS applications. It combines real-time cash flow telemetry, monthly category budget caps, savings goal milestones, recurring obligation tracking, and a zero-hallucination **AI Financial Copilot** grounded strictly in verified ledger data.

---

## 🏛️ System Architecture

```
                       +---------------------------------------+
                       |           User Browser / Mobile       |
                       |       (Dark Glassmorphic UI)          |
                       +-------------------+-------------------+
                                           |
                              HTTP / REST  |  Port 4000
                                           v
+---------------------------------------------------------------------------------+
| SpendWise Production Container (Node.js 20 Alpine)                              |
|                                                                                 |
|  +-------------------------+      +------------------------------------------+  |
|  | Express Static Host     | ---> | React 18 + Vite SPA Build (/dist)        |  |
|  +-------------------------+      +------------------------------------------+  |
|                                                                                 |
|  +-------------------------+      +------------------------------------------+  |
|  | REST API Router         |      | Authentication & Security Middleware     |  |
|  |  • /api/auth            |      |  • JWT verification                      |  |
|  |  • /api/expenses        |      |  • Rate limiting                         |  |
|  |  • /api/budgets         |      |  • Tenant data isolation                 |  |
|  |  • /api/categories      |      +------------------------------------------+  |
|  |  • /api/goals           |                                                    |
|  |  • /api/recurring       |      +------------------------------------------+  |
|  |  • /api/ai/chat         | ---> | AI Copilot Grounding Engine              |  |
|  |  • /api/system          |      |  • Offline Deterministic Math Fallback   |  |
|  +-------------------------+      |  • Live LLM Provider Adapter             |  |
|                                   +------------------------------------------+  |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  | Persistence Layer (/app/backend/data - Docker Named Volume)               |  |
|  |  • expenses.json   • budgets.json   • goals.json   • users.json           |  |
|  +---------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------+
                                           |
                                           | Optional DB Sync
                                           v
                       +---------------------------------------+
                       |        MySQL 8.0 Container            |
                       |  (spendwise-mysql-data volume)        |
                       +---------------------------------------+
```

---

## 🎨 UI/UX Design System: Dark Glassmorphism

SpendWise AI is engineered around dark fintech glassmorphism:

- **Midnight Navy Canvas**: Deep `#060919` to `#0d1538` radial background with multi-layered, organic glowing orbs (indigo, cyan, violet) with 120px blur.
- **Frosted Translucent Cards**: `rgba(15, 23, 42, 0.65)` glass panels with `backdrop-filter: blur(20px)`, hairline borders (`rgba(255, 255, 255, 0.09)`), and top inner glow (`inset 0 1px 0 0 rgba(255, 255, 255, 0.1)`).
- **Fintech Accent Gradients**: Electric violet (`#8b5cf6`), vibrant blue (`#38bdf8`), and glowing cyan (`#06b6d4`).
- **Semantic Color Tokens**: Emerald (`#10b981`) for inflows and positive margins, Rose (`#f43f5e`) for outflows and alerts, and Amber (`#f59e0b`) for threshold warnings.
- **Tabular Numeric Typography**: All monetary metrics use `font-variant-numeric: tabular-nums` for alignment.
- **Responsive Layout**:
  - Sticky collapsible sidebar on desktop.
  - Quick action mobile drawer + bottom navigation bar for mobile thumb reach.
  - Floating Action Button (FAB) bottom-right launching the floating AI Assistant panel from anywhere.

---

## 🚀 Key Feature Modules

### 1. Financial Cockpit (Dashboard)
- **5 High-Level Fintech Metrics**:
  - **Net Balance** (Total Inflow - Total Outflow)
  - **Total Income**
  - **Total Expenses**
  - **Savings Rate** (Net Margin %)
  - **Budget Utilization** (Spent vs Cap)
- **Interactive Cash Flow Velocity Chart**: Dual-series canvas chart showing 6 months of income vs expenses with smooth curves and area fills.
- **Category Donut Visualization**: Proportion of total expenses by category with interactive center value.
- **Recent Ledger Entries**: Quick transaction list with type pills and category tags.
- **Monthly Budget Progress**: Visual progress bars alerting when approaching or exceeding limits.
- **Smart AI Financial Advisory**: Contextual recommendations generated from stored ledger data.

### 2. Transaction Management (CRUD)
- Complete Add, Edit, View, and Delete capabilities.
- Toggle between **Income** and **Expense**.
- Metadata: Title, Amount, Category, Date, Payment Method (UPI, Card, Bank, Cash), Tags, and Notes.
- Multi-dimensional filters: Search keyword, Category, Type, Payment Method, Date Range, Sort attribute & order.
- Filtered page totals summary strip (`Page Inflow`, `Page Outflow`, `Net Difference`).
- Pagination with customizable page sizes.
- Form validation with clear required indicators.
- One-click CSV export and demo data loader.

### 3. Category Intelligence
- Category-level distribution ranking.
- Total spent and percentage share of total outflow.
- Budget cap allocation comparison per category.
- Custom and default category metrics.

### 4. Budget Management
- Configure monthly spending caps by category.
- Real-time tracking of consumed vs remaining buffer.
- Warning alerts when consumption reaches 80% and danger alerts when >= 100%.
- **AI Budget Suggestions**: Rolling 3-month trailing mean + 10% safety buffer with a 1-click "Apply" button.

### 5. Savings Goals
- Create and track custom savings targets (e.g. *Emergency Fund*, *New Laptop*, *Japan Trip*).
- Target Amount, Current Saved Amount, Progress Bar (%), and Target Date countdown.
- Quick **+ Add Funds / Deposit** modal to contribute money directly towards any goal.

### 6. AI Financial Copilot (Zero-Hallucination)
Available both as a **dedicated full-page interface** and as a **floating bottom-right chatbot widget**:
- **Prompt suggestions**:
  - *"How much did I spend this month?"*
  - *"What is my biggest expense category?"*
  - *"Compare this month's spending with last month"*
  - *"How much money can I save?"*
  - *"Am I exceeding my budget?"*
  - *"Show my spending trends"*
  - *"Give suggestions to reduce unnecessary expenses"*
- **Strict Data Grounding**: Explicitly distinguishes `[Actual Data]` (computed from backend ledger) from `[AI Suggestion]`.
- **Dual Mode**:
  1. **Offline Mode**: Deterministic calculations from actual stored figures. Zero external dependencies.
  2. **Live AI Mode**: Secure aggregation context sent to OpenAI-compatible LLMs when `AI_API_KEY` is provided.

### 7. Recurring Obligations
- Subscriptions (Netflix, Spotify, AWS), utilities (Electricity, WiFi), rent, and monthly salary.
- Upcoming payments queue (next 30 days) with a **Skip Cycle** action.

### 8. Reports & Audits
- Print-ready monthly statements.
- Complete JSON account backup export for data portability.
- Authenticated CSV ledger export.

### 9. DevOps & System Telemetry
- System status monitoring: Uptime, Node.js version, storage driver, and memory usage.
- Container liveness probe verification (`/health`).
- Entity persistence integrity check.

---

## 📡 REST API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Container liveness probe (`status: ok`) |
| `POST` | `/api/auth/register` | No | Register new user `{name, email, password}` |
| `POST` | `/api/auth/login` | No | Login `{email, password}` -> `{token, user}` |
| `GET` | `/api/auth/me` | Yes | Get authenticated user profile |
| `GET` | `/api/expenses` | Yes | List expenses with search, filter, sort & pagination |
| `POST` | `/api/expenses` | Yes | Create expense/income `{title, amount, type, category, date, ...}` |
| `PUT` | `/api/expenses/:id` | Yes | Update expense record |
| `DELETE` | `/api/expenses/:id` | Yes | Delete expense record |
| `GET` | `/api/expenses/export` | Yes | Download filtered CSV export |
| `GET` | `/api/expenses/meta/categories` | Yes | Get allowed categories list |
| `GET` | `/api/expenses/meta/payment-methods` | Yes | Get allowed payment channels |
| `GET` | `/api/stats` | Yes | Total income, expenses, net, savings rate, by category & month |
| `GET` | `/api/stats/periods` | Yes | 14-day daily, 8-week weekly, and 12-month summaries |
| `GET` | `/api/budgets` | Yes | List budgets for specified `?month=YYYY-MM` |
| `POST` | `/api/budgets` | Yes | Create budget cap `{category, month, limit}` |
| `DELETE` | `/api/budgets/:id` | Yes | Delete category budget cap |
| `GET` | `/api/budgets/status/overview` | Yes | Spent vs limit, remaining, utilization & alert states |
| `GET` | `/api/budgets/suggestions` | Yes | AI budget suggestions based on past 3 months |
| `GET` | `/api/goals` | Yes | List all savings goals with progress % and remaining buffer |
| `POST` | `/api/goals` | Yes | Create savings goal `{title, targetAmount, currentAmount, targetDate}` |
| `PUT` | `/api/goals/:id` | Yes | Update savings goal |
| `POST` | `/api/goals/:id/contribute` | Yes | Deposit funds to savings goal `{amount}` |
| `DELETE` | `/api/goals/:id` | Yes | Delete savings goal |
| `GET` | `/api/recurring` | Yes | List recurring payment rules |
| `GET` | `/api/recurring/upcoming` | Yes | Upcoming payments in next N days (`?days=30`) |
| `POST` | `/api/recurring` | Yes | Create recurring rule `{title, amount, frequency, day, nextDue}` |
| `POST` | `/api/recurring/:id/skip` | Yes | Skip recurring payment to next cycle |
| `DELETE` | `/api/recurring/:id` | Yes | Delete recurring rule |
| `GET` | `/api/ai/status` | Yes | Get AI engine mode (`live` or `demo`) |
| `POST` | `/api/ai/chat` | Yes | Query AI Copilot with prompt `{message}` |
| `GET` | `/api/settings` | Yes | Get user preferences & settings |
| `PUT` | `/api/settings` | Yes | Update currency, theme & preferences |
| `PUT` | `/api/settings/profile` | Yes | Update user display name |
| `GET` | `/api/settings/export-all` | Yes | Export complete account JSON backup |
| `DELETE` | `/api/settings/data` | Yes | Wipe all user data (transactions, budgets, goals) |
| `GET` | `/api/system/health` | Yes | Infrastructure health & storage writable check |
| `GET` | `/api/system/info` | Yes | Node version, environment & release info |
| `POST` | `/api/seed` | Yes | Populate realistic demo transactions & categories |

---

## 🛠️ Local Development & Quick Start

### Prerequisites
- Node.js 20 or higher
- npm 10 or higher
- Docker & Docker Compose (optional for container run)

### Installation
```bash
# 1. Install dependencies for both backend and frontend
npm run install:all
```

### Running Locally (one command)
```bash
# Starts the API (:4000) and the Vite dev server (:5173) together
npm run dev
```
Open **http://localhost:5173** in your browser.

To use a different frontend port (e.g. 5174):
```bash
npm run dev -- --port 5174
```
Then open **http://localhost:5174**. The API stays on `:4000` and Vite proxies
`/api` to it automatically.

A ready-to-use demo account is included:
```
Email:    demo@spendwise.com
Password: demo1234
```
You can also register your own account from the Create Account tab.

> If the demo account is missing or you want to reset its data, run `npm run seed:demo`.
> **Important:** only run one copy of this project at a time. If another copy's
> backend is already using port 4000, the login will check that copy's users and
> your credentials will appear "invalid". `npm run dev` detects ports already in use.

### Running Locally (two terminals, if you prefer)
```bash
# Terminal 1 — Start Backend Express API on http://localhost:4000
npm run dev:backend

# Terminal 2 — Start Frontend Vite Dev Server on http://localhost:5173
npm run dev:frontend
```

### Opening from VS Code
- Run the VS Code task **Start Full Stack (Backend + Frontend)**, or press
  `F5` with the **Full Stack: Backend + Frontend + Browser** configuration.
- Avoid opening `frontend/index.html` with Live Preview/Live Server while the
  backend is not running. If you do preview it on another port, the app falls
  back to `http://localhost:4000` automatically.

### Running Automated Test Suite
```bash
# Run Jest backend test suite with coverage
npm test

# Build frontend production bundle
npm run build
```

---

## 🐳 Docker & DevOps Deployment

SpendWise AI is packaged with a multi-stage production Dockerfile and Docker Compose configuration.

### 1. Multi-Stage Docker Build
```bash
# Build the production image
docker build -t spendwise:latest .

# Run standalone container with persistent named volume
docker run -d -p 4000:4000 \
  -e JWT_SECRET=your-production-secret-key \
  -v spendwise-data:/app/backend/data \
  --name spendwise \
  spendwise:latest

# Verify health check
curl http://localhost:4000/health
```

### 2. Multi-Container Orchestration (SpendWise + MySQL)
```bash
# Spin up SpendWise app along with MySQL 8.0 and persistent volumes
docker compose up -d --build

# View container logs
docker compose logs -f

# Check container health status
docker compose ps
```
Access the application at **http://localhost:4000**.

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Located at `.github/workflows/ci.yml`:
1. **Backend Test Suite**: Runs Jest integration tests with code coverage checks on Node 20.
2. **Frontend Build**: Compiles React 18 SPA with Vite, ensuring zero syntax or bundling errors.
3. **Docker Build & Health Probe**: Builds container image, launches test instance, and runs HTTP health check probe (`/health`) before teardown.

---

## 🔒 Security Best Practices

- **Password Hashing**: Passwords are salted and hashed using `bcryptjs` (never stored in plaintext).
- **JWT Authentication**: Stateless authentication with bearer tokens, isolated per user.
- **Zero API Key Leakage**: LLM provider keys and database secrets are strictly managed in backend environment variables and never exposed to client-side bundles.
- **Tenant Isolation**: All database and storage queries enforce `userId === req.user.id`.
- **Input Validation**: Backend routes validate and sanitize data types, limits, and payload sizes.
- **Rate Limiting**: AI and sensitive routes are protected by IP and user rate limiters.

---

## 📄 License
SpendWise AI is open source software released under the [MIT License](LICENSE).

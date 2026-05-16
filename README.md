<div align="center">

# 🤖 Text-to-SQL AI Chatbot

### *Ask questions in plain English. Get answers from your database instantly.*

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-chatbotsql--lw1o.onrender.com-6C63FF?style=for-the-badge&logo=render&logoColor=white)](https://chatbotsql-lw1o.onrender.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![LangChain](https://img.shields.io/badge/LangChain-1.3-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://langchain.com)
[![Gemini](https://img.shields.io/badge/Gemini%202.5%20Flash-AI%20Engine-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)

</div>

---

## 📌 Overview

**Text-to-SQL AI Chatbot** is a full-stack intelligent querying system that bridges the gap between natural language and structured data. Users simply ask a question — the AI agent autonomously introspects the database schema, composes an accurate SQL query, executes it, and returns a human-readable answer — all in real time.

This project demonstrates expertise in **Agentic AI**, **LLM orchestration**, **RESTful API design**, and **cloud deployment** — making it a compelling example of production-grade AI engineering.

> 🔗 **Try it live:** [https://chatbotsql-lw1o.onrender.com/](https://chatbotsql-lw1o.onrender.com/)

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🧠 **Agentic AI** | LangGraph ReAct agent that autonomously plans, queries, and reasons |
| 💬 **Natural Language Interface** | Ask anything in plain English — no SQL knowledge required |
| 🔍 **Transparent Reasoning** | Expandable "agent steps" panel shows every tool call and query executed |
| 📊 **Interactive Table Viewer** | Browse raw database tables directly in the UI with column/row metadata |
| 🛡️ **Read-Only Enforcement** | System prompt strictly prohibits DML statements (INSERT, UPDATE, DELETE, DROP) |
| 🔄 **Dual-DB Architecture** | MySQL in development, SQLite in production — zero config change required |
| 📱 **Responsive Design** | Mobile-first sidebar with overlay navigation |
| ⚡ **Auto-Schema Discovery** | Agent inspects the live schema before every query — no manual table mapping |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                               │
│                                                                             │
│   ┌──────────────────┐   ┌────────────────────┐   ┌─────────────────────┐  │
│   │   Chat Interface │   │  Table Data Viewer │   │  Suggestion Chips   │  │
│   │  (Vanilla JS/CSS)│   │   (Browse Tables)  │   │  (Quick Questions)  │  │
│   └────────┬─────────┘   └─────────┬──────────┘   └──────────┬──────────┘  │
│            │  POST /api/query       │ GET /api/table/:name     │            │
└────────────┼───────────────────────┼──────────────────────────┼────────────┘
             │                       │                          │
             ▼                       ▼                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLASK REST API (app.py)                            │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                        API Endpoints                                │  │
│   │  POST /api/query   ──►  Run NL→SQL agent, return answer + steps     │  │
│   │  GET  /api/tables  ──►  List all available tables                   │  │
│   │  GET  /api/table/<name> ──►  Fetch columns + rows (max 100)         │  │
│   └─────────────────────────┬───────────────────────────────────────────┘  │
│                             │                                               │
│   ┌─────────────────────────▼───────────────────────────────────────────┐  │
│   │                   LangGraph ReAct Agent                             │  │
│   │                                                                     │  │
│   │   ┌──────────────┐    ┌───────────────┐    ┌─────────────────────┐  │  │
│   │   │ System Prompt│───►│ Gemini 2.5    │───►│ SQLDatabaseToolkit  │  │  │
│   │   │ (dialect +   │    │ Flash (LLM)   │    │  - list_tables      │  │  │
│   │   │  top_k rules)│    └───────┬───────┘    │  - schema_inspector │  │  │
│   │   └──────────────┘           │             │  - query_checker    │  │  │
│   │                              │ Tool calls  │  - query_executor   │  │  │
│   │                              └────────────►└─────────────────────┘  │  │
│   └──────────────────────────────────────────────────────────────────┬──┘  │
│                                                                       │     │
└───────────────────────────────────────────────────────────────────────┼─────┘
                                                                        │
             ┌──────────────────────────────────────────────────────────▼──┐
             │                    DATA LAYER                               │
             │                                                             │
             │   Development                     Production (Render)       │
             │   ┌─────────────┐                 ┌────────────────────┐   │
             │   │   MySQL DB   │                 │  SQLite (file-    │   │
             │   │  localhost   │                 │  based) database.db│   │
             │   │   :3306      │                 │  (bundled in repo) │   │
             │   └─────────────┘                 └────────────────────┘   │
             │         └──────────── SQLAlchemy ORM ──────────────┘        │
             └─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Lifecycle (Sequence Diagram)

```
User          Browser           Flask API          LangGraph Agent        SQLite DB
 │               │                  │                     │                   │
 │─── Question ──►                  │                     │                   │
 │               │─ POST /api/query ►                     │                   │
 │               │                  │─ invoke agent ──────►                   │
 │               │                  │                     │─ list_tables() ───►
 │               │                  │                     │◄──── table names ─│
 │               │                  │                     │─ get_schema() ────►
 │               │                  │                     │◄──── DDL schema ──│
 │               │                  │                     │─ check_query() ──►│
 │               │                  │                     │◄─── validation ───│
 │               │                  │                     │─ execute_query() ─►
 │               │                  │                     │◄──── result rows ─│
 │               │                  │◄─ {answer, steps} ──│                   │
 │               │◄── JSON response ─                     │                   │
 │◄── Renders ───│                  │                     │                   │
     answer +                       
     agent steps
```

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Role |
|---|---|---|
| **Python** | 3.12 | Core runtime |
| **Flask** | 3.1.3 | Web framework & REST API |
| **Flask-CORS** | 6.0.2 | Cross-origin resource sharing |
| **Gunicorn** | 23.0.0 | Production WSGI server |
| **LangChain** | 1.3.0 | LLM orchestration framework |
| **LangGraph** | 1.2.0 | Agentic ReAct loop engine |
| **langchain-community** | 0.4.1 | SQLDatabaseToolkit |
| **langchain-google-genai** | 4.2.2 | Gemini model integration |
| **SQLAlchemy** | (transitive) | Database ORM & abstraction |
| **SQLite / MySQL** | — | Relational data storage |

### Frontend
| Technology | Role |
|---|---|
| **HTML5** | Semantic structure |
| **Vanilla CSS** | Custom styling, animations, dark theme |
| **Vanilla JavaScript (ES6+)** | Chat logic, table viewer, fetch API |

### AI / ML
| Component | Detail |
|---|---|
| **LLM** | Google Gemini 2.5 Flash |
| **Agent Pattern** | ReAct (Reason + Act) via LangGraph |
| **Tools** | `list_tables`, `get_schema`, `check_query`, `execute_query` |
| **Prompt Engineering** | Dialect-aware, top-k limited, read-only enforced |

### DevOps & Deployment
| Tool | Purpose |
|---|---|
| **Render** | Free-tier cloud hosting |
| **render.yaml** | Infrastructure-as-Code deployment config |
| **python-dotenv** | Secrets management via `.env` |
| **`export_to_sqlite.py`** | One-shot MySQL → SQLite migration script |

---

## 📁 Project Structure

```
chatbotsql/
│
├── app.py                  # Flask application — API routes & agent initialization
├── export_to_sqlite.py     # Utility: exports MySQL schema+data → SQLite for deployment
├── database.db             # Bundled SQLite database (production data snapshot)
├── requirements.txt        # Python dependencies (pinned versions)
├── render.yaml             # Render deployment manifest (IaC)
├── code.ipynb              # Jupyter notebook — exploratory development & testing
│
├── static/
│   ├── index.html          # Single-page application shell
│   ├── app.js              # Frontend logic: chat, table viewer, sidebar, UX
│   └── style.css           # Dark theme, animations, responsive layout
│
└── .env                    # Local secrets (GOOGLE_API_KEY) — not committed
```

---

## ⚙️ How It Works

### 1. Agent Initialization (Startup)
On server start, the application:
1. Detects the environment via `DATABASE_URL` env var
2. Connects to **SQLite** (production) or **MySQL** (local dev) through `SQLAlchemy`
3. Instantiates `Gemini 2.5 Flash` as the reasoning LLM
4. Builds a `SQLDatabaseToolkit` which gives the agent four database tools
5. Compiles the `LangGraph ReAct agent` with a carefully engineered system prompt that injects the SQL dialect and result-limit rules

### 2. Query Processing
When a user submits a question:
```
"What are the top 5 customers by total order value?"
```
The agent follows the **ReAct loop**:

```
Think  →  Which tables are available?
Act    →  list_tables()
Observe→  ['orders', 'customers', 'products']

Think  →  What's the schema of 'orders' and 'customers'?
Act    →  get_schema('orders', 'customers')
Observe→  [DDL with columns and types]

Think  →  I'll write a JOIN query with SUM and GROUP BY
Act    →  check_query("SELECT c.name, SUM(o.total) ...")
Observe→  Query is valid

Act    →  execute_query("SELECT c.name, SUM(o.total) ...")
Observe→  [('Alice', 4200), ('Bob', 3800), ...]

Think  →  I have the answer
Answer →  "The top 5 customers by total order value are: ..."
```

### 3. Transparent Reasoning
Every tool call and result is captured from the `agent_executor.stream()` output and returned to the frontend as a structured `steps` array — enabling the **"Show N agent steps"** expandable panel in the UI.

---

## 🌍 Environment Configuration

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_API_KEY` | ✅ Yes | Google Generative AI API key for Gemini |
| `DATABASE_URL` | Production only | Full SQLAlchemy URI (e.g. `sqlite:///database.db`) |

### Dual-Database Strategy

The app uses a clean environment-based switch:

```python
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    db = SQLDatabase.from_uri(DATABASE_URL)   # Production: SQLite on Render
else:
    db = SQLDatabase.from_uri(MYSQL_URI)       # Development: local MySQL
```

This means **zero code changes** are needed between environments — just set the env var.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- A Google AI API Key ([get one free](https://aistudio.google.com/))
- MySQL (for local development) or skip and use SQLite directly

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/Shanto96/chatbotsql.git
cd chatbotsql

# 2. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
echo GOOGLE_API_KEY=your_key_here > .env

# 5. (Optional) If using MySQL locally, export data to SQLite
python export_to_sqlite.py

# 6. Run the development server
python app.py
```

Open your browser at **http://localhost:5000** 🎉

### Production Deployment (Render)

The `render.yaml` file handles everything declaratively:

```yaml
services:
  - type: web
    name: chatbotsql
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app --bind 0.0.0.0:$PORT --timeout 120
    envVars:
      - key: GOOGLE_API_KEY     # Set in Render dashboard
      - key: DATABASE_URL
        value: sqlite:///database.db
      - key: PYTHON_VERSION
        value: 3.12.0
```

Deploy in one click by connecting your GitHub repo to [Render](https://render.com).

---

## 🔌 API Reference

### `POST /api/query`
Submit a natural language question and receive the AI-generated answer.

**Request Body:**
```json
{
  "question": "What is the total revenue for Q1 2024?"
}
```

**Response:**
```json
{
  "answer": "The total revenue for Q1 2024 was $124,580.",
  "steps": [
    { "type": "tool_call",   "tool": "sql_db_list_tables",  "input": {} },
    { "type": "tool_result", "tool": "sql_db_list_tables",  "output": "orders, customers" },
    { "type": "tool_call",   "tool": "sql_db_query",        "input": { "query": "SELECT SUM(total)..." } },
    { "type": "tool_result", "tool": "sql_db_query",        "output": "[(124580.0,)]" }
  ]
}
```

---

### `GET /api/tables`
Returns all queryable table names.

**Response:**
```json
{
  "tables": ["customers", "orders", "products", "employees"]
}
```

---

### `GET /api/table/<table_name>`
Returns columns, rows (up to 100), and total row count for a given table.

**Response:**
```json
{
  "table": "customers",
  "columns": ["id", "name", "email", "city"],
  "rows": [["1", "Alice", "alice@example.com", "New York"], "..."],
  "total_rows": 500,
  "showing": 100
}
```

---

## 🔒 Security Design

- **Read-only enforcement** — The system prompt explicitly prohibits `INSERT`, `UPDATE`, `DELETE`, and `DROP` statements
- **Table allowlisting** — The `/api/table/<name>` endpoint validates the table name against `db.get_usable_table_names()` before executing any query
- **API key isolation** — `GOOGLE_API_KEY` is loaded from environment variables, never hardcoded
- **Query validation** — The agent uses `check_query` tool before execution to catch syntax errors proactively
- **Output truncation** — Tool results are capped at 500 characters in the steps panel to prevent data leakage in the UI

---

## 🗺️ Roadmap

- [ ] **Streaming responses** — Stream the LLM answer token-by-token for a live typing effect
- [ ] **Query history** — Persist and replay past conversations with localStorage
- [ ] **Chart generation** — Auto-render bar/line charts for numeric query results
- [ ] **Multi-database support** — Add support for PostgreSQL and cloud data warehouses
- [ ] **Authentication** — Add user session management for multi-tenant use
- [ ] **Export to CSV** — Allow users to download query results

---

## 👨‍💻 Author

**Shanto**
- 🌐 Live Project: [chatbotsql-lw1o.onrender.com](https://chatbotsql-lw1o.onrender.com/)
- 🐙 GitHub: [github.com/Shanto96](https://github.com/Shanto96)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<div align="center">

*Built with 🧠 LangGraph · ⚡ Gemini 2.5 Flash · 🐍 Flask · ☁️ Render*

**If this project impressed you, consider giving it a ⭐ on GitHub!**

</div>

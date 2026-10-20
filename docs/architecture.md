# Architecture

Sprintwise turns a product idea into a discovery brief and a proposed v1 board. The user signs in, describes the idea, and an Analyst agent streams the reply. When the agent proposes stories, the board pauses until the user approves.

## Layout

pnpm workspace, Turborepo, Node 22. Shared library versions live in the workspace catalog.

| Package                 | Job                                                                         |
| ----------------------- | --------------------------------------------------------------------------- |
| `apps/web`              | Next.js UI. Auth, home, chat, and the board.                                |
| `apps/agents`           | Hono server (default port 8787). Runs the Analyst graph and streams events. |
| `packages/db`           | Drizzle schema and the Postgres client.                                     |
| `packages/schemas`      | Zod for request bodies, tokens, env, and stream events.                     |
| `packages/agent-client` | Browser client. Reads the event stream and folds it into run state.         |
| `packages/ui`           | Shared React components and styles.                                         |

`@repo/schemas` validates inputs and events. `@repo/db/schema` is the tables. They stay separate.

## Request path

```text
Browser
  Next.js (apps/web)
    Auth.js session cookie
    short-lived agent JWT
  Hono (apps/agents)  POST /runs  and  POST /runs/:id/resume
    LangGraph Analyst
      Gemini, or a fake model when FAKE_LLM is set
    Postgres
      app rows (users, projects, runs, messages, stories)
      LangGraph checkpoints
```

1. The home page requires a signed-in user before the chat form is shown. `/chat` redirects home when there is no session.
2. The web app mints a JWT signed with `AGENT_JWT_SECRET` and the browser posts it to the agent server as `Authorization: Bearer`.
3. The agent checks that token, writes the run, and streams Server-Sent Events.
4. `packages/agent-client` parses each `data:` frame with the AG-UI event schema and updates the chat and board.

CORS on the agent server allows only `WEB_ORIGIN`. Auth runs on the POST handlers so the browser preflight is not asked for a token.

## Analyst graph

One LangGraph, compiled with a Postgres checkpointer. The thread id is the project id.

1. **analyst** streams the model with the system prompt and the conversation. The model can call the kanban tool.
2. The tool writes stories for that project.
3. **waitForApproval** interrupts when a kanban was saved. The run status becomes `awaiting_approval`.
4. Resume continues the same thread through `POST /runs/:id/resume`.

`FAKE_LLM` swaps Gemini for a canned model so local work does not need a Google key. A real run needs `GOOGLE_API_KEY`.

## Data

Postgres, owned by Drizzle in `packages/db`.

- **users** — GitHub identity (`githubId`, login, profile). A demo user exists for the credentials provider.
- **projects** — one idea per user (`name`, `idea`).
- **runs** — status `running`, `awaiting_approval`, `completed`, or `failed`.
- **messages** — user and assistant text for a run.
- **stories** — kanban cards on a project. Status is `brainstorm`, `mvp`, or `icebox`.

Deleting a user cascades to projects, and those cascade to runs, messages, and stories.

LangGraph keeps its own checkpoint tables in the same database. The app does not read those tables directly.

## Auth

Auth.js on the web app. Session strategy is JWT (a signed cookie, not a session row).

- GitHub OAuth when `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are set. Sign-in upserts the `users` row.
- A credentials provider signs in the demo user when GitHub is not configured.

The agent server does not use Auth.js. It only verifies the short-lived agent JWT.

## Boundaries

- Pages fetch and compose. Mutations live in server action files.
- `'use server'` code does not import the client agent store. Run rows use the database status values.
- The agent server is the only process that calls the model and writes checkpoints.

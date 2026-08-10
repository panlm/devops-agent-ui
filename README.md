# DevOps Agent UI

A web-based UI for interacting with [AWS DevOps Agent](https://docs.aws.amazon.com/devops-agent/latest/userguide/what-is.html). Built with React + TypeScript (Vite) on the frontend and Node.js/Express on the backend.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Ant Design
- **Backend:** Node.js, Express, AWS SDK (`@aws-sdk/client-devops-agent`)

## Prerequisites

- Node.js >= 18
- AWS credentials configured (via `~/.aws/credentials` or environment variables)
- An existing AWS DevOps Agent Space

## Getting Started

1. Install dependencies:

```bash
npm run install:all
```

2. Configure environment variables — copy `.env.example` to `.env` and fill in your values:

```
AGENT_SPACE_ID=<your-agent-space-id>
AWS_PROFILE=default
DEVOPS_AGENT_REGION=us-east-1
PORT=3001

# Operator role (optional, recommended): assume the DevOps Agent operator role
# (DevOpsAgentRole-WebappAdmin-*) with an AgentSpaceId session tag so sessions
# created here are visible in the standard Web Console. Leave blank to call
# directly with AWS_PROFILE (sessions visible only to this UI). See .env.example.
DEVOPS_OPERATOR_ROLE_ARN=
DEVOPS_OPERATOR_SESSION_NAME=devops-agent-ui
DEVOPS_OPERATOR_SESSION_DURATION=3600
```

3. Start the development servers:

```bash
npm run dev
```

This launches:
- Frontend at http://localhost:5173
- Backend API at http://127.0.0.1:3001

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both frontend and backend concurrently |
| `npm run dev:server` | Start backend only |
| `npm run dev:client` | Start frontend only |
| `npm run install:all` | Install all dependencies (root + client) |

## Testing

Tests use [Vitest](https://vitest.dev/) on both sides, with [Supertest](https://github.com/ladjs/supertest) for the backend HTTP layer. **No test hits AWS or the network** — the backend injects a fake AWS client via the `createApp({ createAwsClient })` factory, and the frontend mocks `fetch`. Tests run offline with no AWS credentials.

Run everything from the repo root:

```bash
npm test          # backend (server/) then frontend (client/)
```

Or each side on its own:

```bash
npm run test:server   # backend only (vitest run, from root)
npm run test:client   # frontend only (delegates to client)
```

What's covered so far:

- **`server/routes.js`** — normal + error paths for the investigations, recommendations, chat, journal (auto-pagination), topology, config, and changes endpoints. AWS SDK exceptions (`ResourceNotFoundException`, `ValidationException`, `AccessDeniedException`, `ThrottlingException`) are asserted to map to the right HTTP status and Chinese error message.
- **`server/index.js`** — the AWS credential-injection middleware returns HTTP 500 with a Chinese message when credential loading fails.
- **`client/src/utils/status.ts`** — status/priority label + color mapping, including the unknown-value fallback.
- **`client/src/api/client.ts`** — the `fetch` wrapper: URL/method/body construction, JSON parsing, and error handling.

CI runs install + lint + test + client build on every push and pull request (see `.github/workflows/test.yml`).

## Project Structure

```
.
├── client/          # React + Vite frontend
├── server/          # Express backend (API proxy to AWS DevOps Agent)
├── docs/            # Documentation
├── .env             # Environment configuration
└── package.json     # Root orchestrator
```

## License

Private

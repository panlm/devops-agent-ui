---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain-skipped
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
  - step-e-01-discovery
  - step-e-02-plan
  - step-e-03-edit
releaseMode: phased
inputDocuments: []
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: web_app
  domain: devops_cloud_operations
  complexity: medium
  projectContext: greenfield
editHistory:
  - date: '2026-04-27'
    summary: 'Sync PRD with v0.0.1+ code: added multi-turn chat (运维对话), prompt history, Markdown rendering, collapsible panels, execution status mapping, User/Agent color coding, duration column, sidebar reorder, DOMPurify security, localStorage persistence. Moved chat from Phase 2 to MVP. Added FRs 28-44, Journey 5, updated API integration table.'
---

# Product Requirements Document - devops-agent-ui

**Author:** Panlm
**Date:** 2026-04-27

## Executive Summary

DevOps Agent UI is a lightweight Chinese-language web client for AWS DevOps Agent that eliminates the friction of AWS Console login and English-only interfaces. Operations engineers launch a local web server (`npm run dev` starts both frontend on port 5173 and backend on port 3001), open a browser, and immediately access their investigation history and recommendations — no Console authentication required. The application reads local AWS credentials (~/.aws/credentials) through a thin Node.js backend proxy, providing direct API access to DevOps Agent services in us-east-1.

The product addresses three distinct use cases: browsing completed investigations with rich Markdown-rendered detail views, creating new investigations via a chat-style interface with prompt history, and conducting multi-turn operational conversations with the DevOps Agent for ad-hoc queries and actions. The MVP delivers a read-optimized investigation browser, chat-based investigation creation, and an interactive multi-turn chat interface — all in Chinese.

### What Makes This Special

The core differentiator is a conversational Chinese-language interface for AWS DevOps Agent — a service with powerful autonomous investigation capabilities locked behind a heavy English-only Console entry point. Engineers type "帮我查一下东京区域这台 EC2 过去一个月的操作" and the system creates an investigation via the DevOps Agent API. For ongoing queries, the multi-turn chat interface (运维对话) lets engineers ask follow-up questions, request actions (e.g., deleting resources), and get structured Markdown responses with tables, code blocks, and formatted analysis. The UI framework renders in Chinese while investigation data (resource IDs, findings, root cause analysis) remains in original English, respecting the technical vocabulary operations engineers work with daily.

This is not a dashboard or management system — it is a lightweight access layer that makes DevOps Agent's existing capabilities frictionless. Local deployment (`npm run dev`), zero-config credentials, and Chinese UI turn a 5-minute Console login workflow into a browser tab.

## Project Classification

- **Type:** Web Application (SPA + Node.js backend proxy)
- **Domain:** DevOps / Cloud Operations
- **Complexity:** Medium — standard CRUD with chat interaction; no regulatory compliance, no multi-tenancy
- **Context:** Greenfield — new project, no existing codebase
- **Target Users:** Operations engineers
- **Deployment:** Local development server (localhost)

## Success Criteria

### User Success

- Operations engineers open the browser and see the investigation list within 3 seconds — no login, no Console navigation
- Engineers create a new investigation by typing a Chinese-language description in the chat interface — no forms, no field mapping
- Investigation details display findings and root causes in a clear, scannable layout — timeline view with key information highlighted
- The UI framework is fully Chinese while technical data (resource IDs, API responses, findings) remains in original English

### Business Success

- MVP functional and usable within a single development sprint — this is a personal/team productivity tool, not a commercial product
- Tool becomes the default entry point for interacting with AWS DevOps Agent, replacing Console login workflow
- Extensible to team use — other operations engineers can clone, configure their AWS profile, and start using immediately

### Technical Success

- Local deployment works with a single command (`npm run dev`)
- Backend proxy correctly reads local AWS credential chain (~/.aws/credentials, profiles, environment variables)
- All DevOps Agent API calls (list, get, create, chat) function reliably through the proxy
- Page load and API response rendering completes within acceptable latency for a local tool

### Measurable Outcomes

- Time from "I want to check investigations" to viewing the list: under 10 seconds (vs. 2-5 minutes via Console login)
- Time from "I want to start an investigation" to investigation created: under 30 seconds via chat input
- Zero configuration required beyond having valid AWS credentials locally

## Product Scope & Phased Development

### MVP Strategy

**Approach:** Problem-solving MVP — deliver the minimum that makes operations engineers say "this is useful" by solving two concrete pain points: Console login friction and English-only interface.

**Resource Requirements:** Single developer. Mainstream tech stack (React, Node.js, Express, AWS SDK) with extensive ecosystem support.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Journey 1: Browse investigation results (read-optimized list + detail with Markdown rendering)
- Journey 2: Create new investigation via chat input with prompt history
- Journey 3: Review recommendations
- Journey 4: First-time setup (npm install && npm run dev)
- Journey 5: Multi-turn operational chat (运维对话)

**Must-Have Capabilities:**

1. **Backend Proxy Server**
   - Node.js + Express server reading local AWS credential chain
   - Proxy routes for all DevOps Agent API endpoints (list-backlog-tasks, get-backlog-task, list-executions, list-journal-records, list-recommendations, create-backlog-task, create-chat, send-message, list-chats)
   - AGENT_SPACE_ID and AWS_PROFILE configuration via .env
   - Pagination token handling
   - Chinese-language error messages for common failures

2. **Investigation List Page**
   - Paginated table view of all backlog tasks with default descending sort by creation time
   - Display: title, status (中文标签), priority, task type, created timestamp, duration (computed from createdAt/updatedAt)
   - Duration display: seconds/minutes/hours based on magnitude; "-" for pending states, live duration for in-progress
   - Click to navigate to detail view

3. **Investigation Detail Page**
   - Task metadata header (status, priority, type, timestamps)
   - Execution list with collapsible panels (Ant Design Collapse) — collapsed by default for scannable overview
   - Execution status mapping with Chinese labels and color-coded tags (已完成/运行中/启动中/等待中)
   - Journal records with Markdown rendering (GFM tables, code blocks, headings) via `marked` + `DOMPurify`
   - User messages (green) and Agent responses (blue) visually differentiated by color
   - Root cause and findings highlighted/structured

4. **Chat-based Investigation Creation**
   - Chat bubble UI with text input
   - Submit creates a new INVESTIGATION task via create-backlog-task API
   - Confirmation with task ID and link to detail view
   - Chinese placeholder text and UI labels
   - localStorage-based prompt history (max 20 entries, deduplicated) displayed inline on the page
   - Clickable history items to fill input, with individual delete buttons

5. **Multi-turn Chat Page (运维对话)**
   - Dedicated chat page for ad-hoc operational conversations with DevOps Agent
   - Auto-creates chat session (CreateChat API) on first message if no session exists
   - Multi-turn conversation via SendMessage API + journal record polling (3s interval during active sending)
   - Chat session persistence via localStorage — survives page navigation and browser refresh
   - "New chat" button to start fresh sessions
   - Markdown rendering for assistant responses (GFM tables, code blocks)
   - Typing indicator ("Agent 思考中...") during response generation
   - Auto-scroll to latest message
   - Stop-polling logic: minimum 5s wait, detect `final_response` record, one final refetch before stopping

6. **Recommendations Page**
   - List of recommendations with title, priority, status
   - Detail view with summary, next steps, affected investigations

7. **Navigation & Layout**
   - Chinese-language sidebar navigation: 新建调查 / 调查列表 / 运维对话 / 推荐建议
   - Fixed sidebar + scrollable main content area
   - Ant Design components throughout
   - "DevOps Agent" branding with CloudServerOutlined icon in sidebar header

### Phase 2 — Enhancement

- Investigation status auto-refresh for in-progress tasks
- Goals view and management
- Search and filter across investigations
- Investigation list sorting options

### Phase 3 — Expansion

- Multi-agent-space support (dropdown selector)
- Multi-user deployment with IAM Identity Center
- English findings → Chinese summary translation via LLM
- Export investigation reports (PDF/Markdown)
- Slack/DingTalk notification integration
- Cross-investigation correlation and trend analysis

### Risk Mitigation Strategy

**Technical Risks:**
- AWS credential chain edge cases (expired SSO tokens, missing profiles) → Clear Chinese error messages guiding users to fix credentials; test with multiple credential types
- DevOps Agent API rate limiting / throttling → Implement request throttling in proxy; cache list responses with TanStack Query stale time
- Journal records can be very large for complex investigations → Paginate journal records; lazy-load on scroll

**Resource Risks:**
- Single developer project → MVP scope is deliberately lean; mainstream tech stack with no custom infrastructure; Ant Design provides pre-built components for 80% of UI needs

## User Journeys

### Journey 1: Operations Engineer — Browse Investigation Results

**Persona:** Wang Wei (老王), senior operations engineer, manages multi-region AWS infrastructure. Uses AWS DevOps Agent regularly for incident investigation and security audits. Prefers Chinese-language tools. Has valid AWS credentials configured locally (~/.aws/credentials with a named profile).

**Opening Scene:** Wang Wei just resolved a production alert in the Tokyo region. He remembers DevOps Agent investigated a security group issue (sg-0123456789example) last week and wants to review the findings before his team meeting. Previously, this meant opening the AWS Console, waiting for SSO authentication (often expired), navigating to DevOps Agent in us-east-1, and scanning through English-language investigation records.

**Rising Action:** Wang Wei opens his browser and navigates to `localhost:3000`. The Chinese-language interface loads instantly — no login prompt, no authentication flow. He sees a list of recent investigations displayed as cards: titles, status badges (已完成/进行中), priority indicators, and timestamps. He spots the security group investigation from March 9th.

**Climax:** He clicks into the investigation detail. A clean timeline view shows the agent's investigation steps. The findings section highlights the root cause: an EC2 instance used overly-permissive IAM role to self-modify security group, adding an insecure ingress rule. Resource IDs and technical details remain in English (natural for ops work), while all UI labels, section headers, and status indicators are in Chinese. He also sees the linked recommendation — "移除 EC2 实例角色的过度权限并实施最小权限 IAM".

**Resolution:** In under 30 seconds, Wang Wei has the complete investigation context for his team meeting — root cause, affected resources, remediation recommendation. No Console login, no English-language navigation, no wasted time.

### Journey 2: Operations Engineer — Create New Investigation via Chat

**Persona:** Same Wang Wei.

**Opening Scene:** Wang Wei notices anomalous behavior on an EC2 instance in the Tokyo region. He needs DevOps Agent to investigate the instance's operations over the past month. Previously, this meant logging into the Console, navigating to DevOps Agent, finding the correct agent space, and filling out an English-language investigation form with multiple required fields.

**Rising Action:** Wang Wei is already on the DevOps Agent UI from checking earlier investigations. He clicks "新建调查" in the sidebar. The page shows a text input at the bottom, and above it — his recent prompt history: past investigation descriptions he's used before. He sees "帮我检查一下新加坡区域的 VPC 配置" from last week, and other saved prompts. He could click one to reuse it, but today he has a new request.

**Climax:** He types: "帮我查一下东京区域 i-0abcdef1234567890 这台 EC2 过去一个月都有哪些操作". He clicks send. The system creates a new investigation task via the DevOps Agent API. The UI confirms: "调查已创建" with the new task ID and a link to track progress. His prompt is automatically saved to history for future reuse.

**Resolution:** In under 15 seconds, Wang Wei has initiated an investigation that would have taken 3-5 minutes through the Console. He can continue monitoring the investigation status from the same interface, and review results when the agent completes its work. Next time he needs a similar investigation, his prompt history will be waiting.

### Journey 5: Operations Engineer — Multi-turn Operational Chat

**Persona:** Same Wang Wei.

**Opening Scene:** Wang Wei wants to ask the DevOps Agent some ad-hoc operational questions — things that don't warrant a full investigation but need the Agent's analytical capabilities. For example, he wants to understand a pattern he noticed across multiple CloudWatch alarms.

**Rising Action:** Wang Wei clicks "运维对话" in the sidebar. The chat page opens with a clean interface — a message input at the bottom and a welcome message. He types his first question: "最近一周东京区域有哪些 CloudWatch 告警频繁触发？"

**Climax:** The message appears in a blue bubble on the right. A typing indicator ("Agent 思考中...") appears while the Agent processes his request. After a few seconds, the Agent's response streams in on the left — a formatted Markdown response with a table of recent alarms, their frequencies, and affected resources. Wang Wei follows up: "帮我分析一下 CPU 告警和网络告警之间有没有关联". The Agent responds with a detailed correlation analysis. He navigates to the investigation list to check something, then comes back to "运维对话" — his conversation is still there, preserved by the session persistence.

**Resolution:** Wang Wei has had a productive multi-turn conversation with the DevOps Agent without creating a formal investigation. The chat interface gives him a lightweight way to leverage the Agent's capabilities for quick queries and analysis. When he's done, he can start a new chat with "新对话" button.

### Journey 3: Operations Engineer — Review Recommendations

**Persona:** Same Wang Wei.

**Opening Scene:** It's Monday morning. Wang Wei wants to check if DevOps Agent has generated any new operational recommendations from its weekly analysis goal. He's particularly interested in infrastructure optimization suggestions.

**Rising Action:** He opens DevOps Agent UI and navigates to the "推荐建议" section. A list of recommendations appears with titles, priority levels, and associated investigations. He sees two items: a DynamoDB billing optimization suggestion and the IAM security recommendation from the previous investigation.

**Climax:** He clicks into the DynamoDB recommendation. The detail view shows a structured summary: the problem (zero-traffic tables maintaining provisioned capacity causing continuous alarm noise), the recommended action (switch to on-demand billing), affected resources, and estimated impact ($1.36/month savings + elimination of 4 false alarms). All presented with Chinese labels framing the English technical content.

**Resolution:** Wang Wei has a clear, actionable list of improvements to discuss with his team — no Console navigation required, each recommendation traceable back to its source investigation.

### Journey 4: New Team Member — First-Time Setup and Use

**Persona:** Li Na (小李), junior operations engineer joining Wang Wei's team. Has AWS CLI configured locally but has never used DevOps Agent UI.

**Opening Scene:** Wang Wei tells Li Na about the tool and shares the git repository URL. Li Na clones the repo and wants to get started.

**Rising Action:** Li Na runs `npm install && npm run dev` in her terminal. The application starts and she opens `localhost:3000` in her browser. The Chinese interface loads immediately — her local AWS credentials are automatically picked up by the backend proxy. No additional configuration needed.

**Climax:** She sees the same investigation list as Wang Wei (same agent space, same AWS account). She explores completed investigations to familiarize herself with the team's operational history, then creates her first investigation using the chat interface: "帮我检查一下新加坡区域的 VPC 配置".

**Resolution:** From git clone to first investigation created: under 5 minutes. No onboarding documentation needed beyond "clone, install, run". The Chinese interface removes the English-language barrier that would slow down her first AWS DevOps Agent experience.

### Journey Requirements Summary

| Capability | Revealed by Journey |
|---|---|
| Investigation list with Chinese labels, status, priority, timestamps, duration | Journey 1, 3, 4 |
| Investigation detail with collapsible panels, Markdown rendering, User/Agent color coding | Journey 1 |
| Chat-based investigation creation (natural language input) | Journey 2, 4 |
| Prompt history persistence and reuse (localStorage) | Journey 2 |
| Investigation creation confirmation and status tracking | Journey 2 |
| Multi-turn operational chat with session persistence | Journey 5 |
| Chat session survives page navigation (localStorage) | Journey 5 |
| Markdown rendering for Agent responses (GFM tables, code blocks) | Journey 1, 5 |
| Recommendations list and detail view | Journey 3 |
| Backend proxy with automatic local AWS credential detection | Journey 1, 2, 3, 4, 5 |
| Zero-config first-time setup (`npm install && npm run dev`) | Journey 4 |
| Chinese UI framework with English technical data passthrough | All journeys |

## Web Application Specific Requirements

### Technical Architecture

**Frontend:**
- SPA built with React + Vite + TypeScript
- UI component library: Ant Design (Chinese ecosystem, Timeline/Table/Chat components)
- State management: TanStack Query for API data caching and pagination
- Routing: React Router for navigation between views (investigation list, detail, recommendations, chat)

**Backend:**
- Node.js + Express thin proxy server
- AWS SDK v3 (@aws-sdk/client) for credential chain resolution
- Reads ~/.aws/credentials, environment variables, SSO token cache — standard credential provider chain
- API routes mirror DevOps Agent endpoints
- Single agent space ID configured via environment variable or config file

**API Integration Points:**

| Frontend View | Backend Proxy Route | AWS DevOps Agent API |
|---|---|---|
| Investigation List | POST /api/tasks/list | list-backlog-tasks |
| Investigation Detail | GET /api/tasks/:taskId | get-backlog-task |
| Execution Timeline | GET /api/tasks/:taskId/executions | list-executions |
| Journal Records | GET /api/executions/:executionId/journal | list-journal-records |
| Recommendations | POST /api/recommendations/list | list-recommendations |
| Recommendation Detail | GET /api/recommendations/:recommendationId | get-recommendation |
| Create Investigation | POST /api/tasks | create-backlog-task |
| Chat Creation | POST /api/chat | create-chat |
| Send Chat Message | POST /api/chat/:executionId/message | send-message |
| List Chat Sessions | GET /api/chats | list-chats |
| Configuration | GET /api/config | (local config) |

### Browser & Layout

- Chrome (latest) — primary and only supported browser
- Localhost-only deployment, no cross-browser compatibility required
- Desktop-only layout — optimized for standard monitor widths (1280px+)
- No mobile or tablet layout required for MVP
- Fixed sidebar navigation + main content area layout pattern

### Configuration

- **Credential configuration:** Support AWS_PROFILE environment variable to select profile; default to 'default' profile
- **Agent space configuration:** Single AGENT_SPACE_ID in .env file; no multi-space switching in MVP
- **Region:** Hardcoded to us-east-1 (DevOps Agent service region)
- **Error handling:** Display Chinese-language error messages for common failures (credentials expired, API throttling, network errors)
- **Data pagination:** Backend handles AWS API pagination tokens; frontend uses infinite scroll or page buttons

## Functional Requirements

### Investigation Browsing

- FR1: Operations engineer can view a paginated table of all investigations with title, status, priority, type, created timestamp, and computed duration, sorted by creation time descending by default
- FR2: Operations engineer can navigate from investigation list to investigation detail view
- FR3: Operations engineer can view investigation metadata including status, priority, task type, creation and update timestamps
- FR4: Operations engineer can view execution records associated with an investigation in collapsible panels (Ant Design Collapse), collapsed by default
- FR5: Operations engineer can view journal records for an execution with full Markdown rendering (GFM tables, code blocks, headings, blockquotes) via `marked` library with `DOMPurify` sanitization
- FR6: Operations engineer can distinguish between different journal record types (message, finding, investigation_summary)
- FR7: Operations engineer can view root cause findings with highlighted structure separate from general messages
- FR8: Operations engineer can view investigation summary when available
- FR29: Operations engineer can visually distinguish User messages (green) from Agent responses (blue) by color coding in journal records
- FR30: Execution status displays Chinese labels with color-coded tags: STOPPED→已完成(green), RUNNING→运行中(blue), STARTING→启动中(orange), PENDING→等待中(default)
- FR31: Investigation duration column computes elapsed time from createdAt/updatedAt; displays "-" for pending states, live duration for in-progress tasks

### Investigation Creation

- FR9: Operations engineer can create a new investigation by typing a natural language description in a chat interface
- FR10: Operations engineer can set priority level when creating an investigation
- FR11: System confirms investigation creation with task ID and provides navigation to the new investigation detail
- FR12: System maps chat input to create-backlog-task API call with task type INVESTIGATION
- FR32: System persists prompt history in localStorage (max 20 entries, deduplicated) and displays inline on the investigation creation page
- FR33: Operations engineer can click a history prompt to auto-fill the input field
- FR34: Operations engineer can delete individual prompt history entries

### Multi-turn Chat (运维对话)

- FR35: Operations engineer can start a multi-turn operational conversation with DevOps Agent via dedicated chat page
- FR36: System auto-creates a chat session (CreateChat API) on first message if no active session exists
- FR37: Operations engineer can send messages in an existing chat session via SendMessage API
- FR38: System polls journal records at 3-second intervals during active response generation to display incremental Agent replies
- FR39: System detects response completion via `final_response` record type and stops polling (with minimum 5s wait and one final refetch)
- FR40: Chat session (executionId) persists in localStorage — session survives page navigation and browser refresh
- FR41: Operations engineer can start a new chat session via "新对话" button, clearing current conversation
- FR42: Agent responses render with full Markdown support (GFM tables, code blocks, headings)
- FR43: System displays typing indicator ("Agent 思考中...") while waiting for Agent response
- FR44: Chat auto-scrolls to the latest message on new message arrival

### Recommendations

- FR13: Operations engineer can view a list of all recommendations with title, priority, and status
- FR14: Operations engineer can view recommendation detail including summary, next steps, considerations, and affected investigations
- FR15: Operations engineer can navigate from a recommendation to its associated investigation

### Navigation & Layout

- FR16: Operations engineer can navigate between investigation list, investigation creation, multi-turn chat, and recommendations views via persistent sidebar navigation (新建调查 / 调查列表 / 运维对话 / 推荐建议)
- FR17: All UI navigation elements, labels, status indicators, and section headers render in Chinese
- FR18: Technical data content (resource IDs, findings text, API responses) renders in original English within Chinese-labeled containers
- FR28: Sidebar displays "DevOps Agent" branding with CloudServerOutlined icon, collapsible to icon-only mode

### Backend & Credential Management

- FR19: System reads AWS credentials from local credential chain (credentials file, environment variables, SSO token cache)
- FR20: System supports AWS profile selection via environment variable configuration
- FR21: System supports agent space ID configuration via environment file
- FR22: System proxies all frontend API requests to AWS DevOps Agent service in us-east-1
- FR23: System handles API pagination transparently for list operations

### Error Handling & Feedback

- FR24: System displays Chinese-language error messages when AWS credentials are invalid or expired
- FR25: System displays Chinese-language error messages when API calls fail (throttling, network errors, service unavailable)
- FR26: System displays loading states during API calls
- FR27: System displays empty states with Chinese guidance when no data is available

## Non-Functional Requirements

### Performance

- Page initial load completes within 2 seconds on localhost
- Investigation list renders within 1 second after API response received
- Investigation detail page (including journal records) renders within 2 seconds after API response received
- Chat-based investigation creation provides confirmation feedback within 1 second of API response
- Pagination requests (next page) complete rendering within 500ms after response

### Security

- AWS credentials never leave the local backend server — frontend has zero access to credential data
- Backend proxy listens only on localhost (127.0.0.1) — not accessible from external network
- No credentials, tokens, or sensitive configuration stored in frontend code or browser storage
- .env file containing AGENT_SPACE_ID and AWS_PROFILE excluded from version control via .gitignore
- All Markdown-rendered HTML sanitized via DOMPurify before injection into DOM (防止 XSS 攻击)
- localStorage used only for non-sensitive UI state: chat session executionId and prompt history text

### Integration

- Backend supports full AWS credential provider chain: credentials file (~/.aws/credentials), environment variables (AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY), SSO token cache, and shared config file (~/.aws/config)
- Backend correctly handles AWS API pagination tokens for all list operations
- Backend returns structured error responses for all AWS API failure modes (AccessDeniedException, ThrottlingException, ValidationException, ResourceNotFoundException)
- API proxy maintains compatibility with AWS DevOps Agent API as documented — no transformation of request/response schemas beyond pagination assembly

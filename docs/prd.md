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
  - date: '2026-06-13'
    summary: 'Sync PRD with latest code: (1) Multi-turn chat now has a session list sidebar (lists all chat sessions via list-chats, sorted by recency, click to switch history sessions) — added FRs 45-48 and expanded Journey 5. (2) Added operator-role credential mode (assume DevOpsAgentRole-WebappAdmin + AgentSpaceId session tag + aligned RoleSessionName) so self-hosted UI shares the same session bucket as the standard Web Console — added FRs 49-51, Configuration and Security updates. (3) Renamed API routes /api/tasks/* → /api/investigations/* (chat routes unchanged). (4) Journal reads now auto-paginate to fetch all pages.'
---

# 产品需求文档 - devops-agent-ui

**作者:** Panlm
**日期:** 2026-04-27

## 执行摘要

DevOps Agent UI 是面向 AWS DevOps Agent 的轻量级中文 Web 客户端,消除了 AWS 控制台登录和纯英文界面带来的摩擦。运维工程师启动本地 Web 服务(`npm run dev` 同时拉起 5173 端口的前端和 3001 端口的后端),打开浏览器,即可立刻访问自己的调查历史与推荐建议 —— 无需控制台认证。应用通过一个轻量的 Node.js 后端代理读取本地 AWS 凭证(~/.aws/credentials),直接访问 us-east-1 区域的 DevOps Agent 服务 API。

产品覆盖三类不同的使用场景:浏览已完成的调查(带丰富的 Markdown 渲染详情视图)、通过带提示历史的对话式界面创建新调查、以及与 DevOps Agent 进行多轮运维对话以处理临时查询和操作。MVP 交付一个读取优化的调查浏览器、基于对话的调查创建、以及一个交互式多轮对话界面 —— 全部为中文界面。

### 产品的独特之处

核心差异化在于为 AWS DevOps Agent 提供一个对话式中文界面 —— 这是一个具备强大自主调查能力、却被笨重的纯英文控制台入口挡在门外的服务。工程师输入"帮我查一下东京区域这台 EC2 过去一个月的操作",系统便通过 DevOps Agent API 创建一个调查。对于持续性查询,多轮对话界面(运维对话)让工程师可以追问、请求执行操作(例如删除资源),并获得带表格、代码块和格式化分析的结构化 Markdown 回复。UI 框架以中文呈现,而调查数据(资源 ID、发现、根因分析)保留原始英文,尊重运维工程师日常使用的技术词汇。

这不是一个仪表盘或管理系统 —— 它是一个轻量接入层,让 DevOps Agent 既有的能力变得毫无摩擦。本地部署(`npm run dev`)、零配置凭证、中文 UI,把一套 5 分钟的控制台登录流程变成了一个浏览器标签页。

## 项目分类

- **类型:** Web 应用(SPA + Node.js 后端代理)
- **领域:** DevOps / 云运维
- **复杂度:** 中等 —— 标准 CRUD 加对话交互;无合规监管要求,无多租户
- **背景:** 全新项目(Greenfield)—— 无既有代码库
- **目标用户:** 运维工程师
- **部署方式:** 本地开发服务器(localhost)

## 成功标准

### 用户成功

- 运维工程师打开浏览器,3 秒内看到调查列表 —— 无需登录,无需控制台导航
- 工程师在对话界面输入中文描述即可创建新调查 —— 无表单,无字段映射
- 调查详情以清晰、易扫读的布局展示发现与根因 —— 时间线视图,关键信息高亮
- UI 框架全中文,而技术数据(资源 ID、API 响应、发现)保留原始英文

### 业务成功

- MVP 在单个开发冲刺内即可用 —— 这是个人/团队效率工具,而非商业产品
- 工具成为与 AWS DevOps Agent 交互的默认入口,替代控制台登录流程
- 可扩展到团队使用 —— 其他运维工程师克隆仓库、配置自己的 AWS profile,即可立即上手

### 技术成功

- 本地部署一条命令即可(`npm run dev`)
- 后端代理正确读取本地 AWS 凭证链(~/.aws/credentials、profile、环境变量)
- 所有 DevOps Agent API 调用(列表、获取、创建、对话)通过代理稳定工作
- 页面加载与 API 响应渲染在本地工具可接受的延迟内完成

### 可量化成果

- 从"我想查看调查"到看到列表:10 秒以内(对比控制台登录的 2-5 分钟)
- 从"我想发起调查"到调查创建完成:通过对话输入 30 秒以内
- 除本地有有效 AWS 凭证外,零配置

## 产品范围与分阶段开发

### MVP 策略

**思路:** 问题导向的 MVP —— 通过解决两个具体痛点(控制台登录摩擦、纯英文界面),交付让运维工程师觉得"这玩意儿有用"的最小集合。

**资源需求:** 单人开发。主流技术栈(React、Node.js、Express、AWS SDK),生态支持广泛。

### MVP 功能集(第一阶段)

**支持的核心用户旅程:**
- 旅程 1:浏览调查结果(读取优化的列表 + 带 Markdown 渲染的详情)
- 旅程 2:通过带提示历史的对话输入创建新调查
- 旅程 3:查看推荐建议
- 旅程 4:首次安装上手(npm install && npm run dev)
- 旅程 5:多轮运维对话(运维对话)

**必备能力:**

1. **后端代理服务**
   - Node.js + Express 服务,读取本地 AWS 凭证链
   - 代理所有 DevOps Agent API 端点(list-backlog-tasks、get-backlog-task、list-executions、list-journal-records、list-recommendations、create-backlog-task、create-chat、send-message、list-chats);调查类路由暴露在 `/api/investigations/*`,对话类路由在 `/api/chat(s)/*`
   - 可选的 operator 角色 assume(DEVOPS_OPERATOR_ROLE_ARN)并带 AgentSpaceId session tag,以与标准 Web 控制台共享同一会话桶
   - 通过 .env 配置 AGENT_SPACE_ID 和 AWS_PROFILE
   - 处理分页 token,包括自动翻页读取 journal 以返回完整记录
   - 常见故障的中文错误提示

2. **调查列表页**
   - 所有 backlog task 的分页表格视图,默认按创建时间降序
   - 展示:标题、状态(中文标签)、优先级、任务类型、创建时间、耗时(由 createdAt/updatedAt 计算)
   - 耗时展示:按量级显示秒/分钟/小时;等待态显示"-",进行中显示实时耗时
   - 点击进入详情视图

3. **调查详情页**
   - 任务元数据头部(状态、优先级、类型、时间戳)
   - 执行记录列表,采用可折叠面板(Ant Design Collapse)—— 默认折叠,便于扫读总览
   - 执行状态映射为中文标签和带颜色标签(已完成/运行中/启动中/等待中)
   - journal 记录通过 `marked` + `DOMPurify` 做 Markdown 渲染(GFM 表格、代码块、标题)
   - 用户消息(绿色)与 Agent 回复(蓝色)用颜色区分
   - 根因与发现以高亮/结构化方式呈现

4. **基于对话的调查创建**
   - 对话气泡式 UI 加文本输入框
   - 提交后通过 create-backlog-task API 创建一个 INVESTIGATION 任务
   - 创建确认,附带任务 ID 和详情页链接
   - 中文占位文案与 UI 标签
   - 基于 localStorage 的提示历史(最多 20 条,去重),在页面内联展示
   - 历史项可点击填入输入框,并带单条删除按钮

5. **多轮对话页(运维对话)**
   - 双栏布局:左侧会话列表(会话列表)+ 右侧对话区
   - 会话列表通过 ListChats API 列出所有对话会话,按最近活动时间排序(updatedAt/createdAt 降序),每行展示自动生成的会话标题(summary)和时间戳
   - 点击某行会话即切换到该历史对话;当前会话高亮;列表头部带手动刷新按钮
   - 发送消息期间会话列表自动刷新(5 秒间隔),让新建/改名的会话出现;响应完成后再刷新一次
   - 若无会话,首条消息时自动创建对话会话(CreateChat API)
   - 通过 SendMessage API + journal 记录轮询(发送中 3 秒间隔)实现多轮对话
   - 当前对话会话通过 localStorage 持久化 —— 页面切换和浏览器刷新后仍在
   - "新对话"按钮可开启全新会话
   - 助手回复支持 Markdown 渲染(GFM 表格、代码块)
   - 响应生成时显示输入指示("Agent 思考中...");打开历史会话时显示加载态
   - 自动滚动行为:切换会话时直接跳到最后一条(无动画);同一会话内来新消息时平滑滚动
   - 停止轮询逻辑:至少等待 5 秒,检测到 `final_response` 记录后,停止前再做一次最终拉取

6. **推荐建议页**
   - 推荐建议列表,含标题、优先级、状态
   - 详情视图含摘要、后续步骤、关联调查

7. **导航与布局**
   - 中文侧边栏导航:新建调查 / 调查列表 / 运维对话 / 推荐建议
   - 固定侧边栏 + 可滚动主内容区
   - 全程使用 Ant Design 组件
   - 侧边栏头部为 "DevOps Agent" 品牌标识,配 CloudServerOutlined 图标

### 第二阶段 —— 增强

- 进行中任务的调查状态自动刷新
- Goals(目标)视图与管理
- 跨调查的搜索与筛选
- 调查列表排序选项

### 第三阶段 —— 扩展

- 多 agent space 支持(下拉选择器)
- 基于 IAM Identity Center 的多用户部署
- 通过 LLM 将英文发现 → 中文摘要翻译
- 导出调查报告(PDF/Markdown)
- Slack/钉钉通知集成
- 跨调查的关联分析与趋势分析

### 风险缓解策略

**技术风险:**
- AWS 凭证链边界情况(SSO token 过期、profile 缺失)→ 清晰的中文错误提示,引导用户修复凭证;用多种凭证类型测试
- DevOps Agent API 限流 / 节流 → 在代理中实现请求节流;用 TanStack Query 的 stale time 缓存列表响应
- 复杂调查的 journal 记录可能非常大 → 对 journal 记录分页;滚动时懒加载

**资源风险:**
- 单人开发项目 → MVP 范围刻意精简;主流技术栈,无自建基础设施;Ant Design 提供 80% UI 所需的现成组件

## 用户旅程

### 旅程 1:运维工程师 —— 浏览调查结果

**人物:** 王伟(老王),资深运维工程师,管理多区域 AWS 基础设施。经常使用 AWS DevOps Agent 进行事件调查和安全审计。偏好中文工具。本地已配置有效 AWS 凭证(~/.aws/credentials 中有一个命名 profile)。

**开场:** 王伟刚处理完东京区域的一个生产告警。他记得 DevOps Agent 上周调查过一个安全组问题(sg-0123456789example),想在团队会议前回顾一下发现。以前这意味着打开 AWS 控制台、等待 SSO 认证(经常已过期)、导航到 us-east-1 的 DevOps Agent、再翻阅英文调查记录。

**推进:** 王伟打开浏览器,访问 `localhost:3000`。中文界面瞬间加载 —— 没有登录提示,没有认证流程。他看到最近调查以卡片形式展示:标题、状态徽标(已完成/进行中)、优先级标识和时间戳。他找到了 3 月 9 日那个安全组调查。

**高潮:** 他点进调查详情。一个清爽的时间线视图展示了 agent 的调查步骤。发现部分高亮了根因:某台 EC2 实例用过度宽松的 IAM 角色自行修改安全组,添加了一条不安全的入站规则。资源 ID 和技术细节保留英文(对运维工作来说很自然),而所有 UI 标签、章节标题和状态指示都是中文。他还看到了关联的推荐建议 —— "移除 EC2 实例角色的过度权限并实施最小权限 IAM"。

**收尾:** 30 秒内,王伟就为团队会议拿到了完整的调查上下文 —— 根因、受影响资源、修复建议。没有控制台登录,没有英文导航,没有浪费时间。

### 旅程 2:运维工程师 —— 通过对话创建新调查

**人物:** 同上,王伟。

**开场:** 王伟注意到东京区域一台 EC2 实例行为异常。他需要 DevOps Agent 调查这台实例过去一个月的操作。以前这意味着登录控制台、导航到 DevOps Agent、找到正确的 agent space、再填一个有多个必填字段的英文调查表单。

**推进:** 王伟刚查完之前的调查,还停留在 DevOps Agent UI 上。他点击侧边栏的"新建调查"。页面底部是一个文本输入框,上方是他最近的提示历史:他用过的调查描述。他看到上周的"帮我检查一下新加坡区域的 VPC 配置"和其他保存的提示。他可以点一个复用,但今天他有新需求。

**高潮:** 他输入:"帮我查一下东京区域 i-0abcdef1234567890 这台 EC2 过去一个月都有哪些操作"。点击发送。系统通过 DevOps Agent API 创建一个新调查任务。UI 确认:"调查已创建",附带新任务 ID 和一个跟踪进度的链接。他的提示自动保存到历史,供日后复用。

**收尾:** 15 秒内,王伟就发起了一个本来要花 3-5 分钟通过控制台才能完成的调查。他可以在同一界面继续监控调查状态,等 agent 完成后查看结果。下次需要类似调查时,他的提示历史已经等在那里。

### 旅程 5:运维工程师 —— 多轮运维对话

**人物:** 同上,王伟。

**开场:** 王伟想问 DevOps Agent 一些临时的运维问题 —— 那些不值得发起一次完整调查、但又需要 Agent 分析能力的问题。比如,他想搞清楚自己在多个 CloudWatch 告警里注意到的一个模式。

**推进:** 王伟点击侧边栏的"运维对话"。对话页以双栏布局打开 —— 左侧是会话列表,右侧是对话区。左栏展示他过去的对话,每条带一个自动生成的中文标题和时间戳,最近的在最上面。他点击"新对话"开启新会话,输入第一个问题:"最近一周东京区域有哪些 CloudWatch 告警频繁触发？"

**高潮:** 消息以蓝色气泡出现在右侧。Agent 处理请求时出现输入指示("Agent 思考中...")。几秒后,Agent 的回复在左侧流式呈现 —— 一段格式化的 Markdown 回复,带一张近期告警的表格、各自的触发频率和受影响资源。这个新对话带着自动生成的标题出现在左侧会话列表里。王伟追问:"帮我分析一下 CPU 告警和网络告警之间有没有关联"。Agent 给出详细的关联分析。他切到调查列表查了点东西,再回到"运维对话"—— 对话还在,被会话持久化保留着。

**收尾:** 当天下午晚些时候,王伟想回看上周的一段对话。他打开"运维对话",在左侧会话列表里按标题找到它,点进去 —— 完整历史瞬间加载,并滚动到最新一条。会话列表背后是与标准 Web 控制台相同的会话桶,这意味着他(或标准 Web UI)进行过的每一段对话都触手可及。他与 DevOps Agent 进行了一组高效的多轮对话,全程没有创建任何正式调查,而且随时可以接着任意一段继续。

### 旅程 3:运维工程师 —— 查看推荐建议

**人物:** 同上,王伟。

**开场:** 周一早晨。王伟想看看 DevOps Agent 是否从每周分析目标中生成了新的运维建议。他尤其关心基础设施优化方面的建议。

**推进:** 他打开 DevOps Agent UI,导航到"推荐建议"区。一个推荐建议列表出现,带标题、优先级和关联调查。他看到两项:一个 DynamoDB 计费优化建议,和上一个调查里的 IAM 安全建议。

**高潮:** 他点进 DynamoDB 那条建议。详情视图展示了结构化摘要:问题(零流量表仍维持预置容量,造成持续告警噪音)、建议操作(切换到按需计费)、受影响资源、以及预估影响(每月节省 $1.36 + 消除 4 个误报告警)。全部用中文标签框定英文技术内容。

**收尾:** 王伟拿到了一份清晰、可执行的改进清单,可以和团队讨论 —— 无需控制台导航,每条建议都能追溯回它的来源调查。

### 旅程 4:新团队成员 —— 首次安装与使用

**人物:** 李娜(小李),加入王伟团队的初级运维工程师。本地配好了 AWS CLI,但从未用过 DevOps Agent UI。

**开场:** 王伟告诉李娜有这个工具,并分享了 git 仓库 URL。李娜克隆仓库,想上手试试。

**推进:** 李娜在终端运行 `npm install && npm run dev`。应用启动,她在浏览器打开 `localhost:3000`。中文界面立即加载 —— 她的本地 AWS 凭证被后端代理自动拾取。无需额外配置。

**高潮:** 她看到和王伟一样的调查列表(同一个 agent space,同一个 AWS 账号)。她浏览已完成的调查,熟悉团队的运维历史,然后用对话界面创建了她的第一个调查:"帮我检查一下新加坡区域的 VPC 配置"。

**收尾:** 从 git clone 到第一个调查创建完成:不到 5 分钟。除了"克隆、安装、运行"外不需要任何上手文档。中文界面消除了本会拖慢她首次 AWS DevOps Agent 体验的英文语言障碍。

### 旅程需求汇总

| 能力 | 由哪个旅程体现 |
|---|---|
| 带中文标签、状态、优先级、时间戳、耗时的调查列表 | 旅程 1、3、4 |
| 带可折叠面板、Markdown 渲染、用户/Agent 颜色区分的调查详情 | 旅程 1 |
| 基于对话的调查创建(自然语言输入) | 旅程 2、4 |
| 提示历史的持久化与复用(localStorage) | 旅程 2 |
| 调查创建确认与状态跟踪 | 旅程 2 |
| 带会话持久化的多轮运维对话 | 旅程 5 |
| 会话列表 —— 浏览并切换历史对话(ListChats) | 旅程 5 |
| 当前对话会话在页面切换后仍保留(localStorage) | 旅程 5 |
| 自建 UI 与标准 Web 控制台共享同一会话桶 | 旅程 5 |
| Agent 回复的 Markdown 渲染(GFM 表格、代码块) | 旅程 1、5 |
| 推荐建议列表与详情视图 | 旅程 3 |
| 带本地 AWS 凭证自动检测的后端代理 | 旅程 1、2、3、4、5 |
| 零配置首次安装上手(`npm install && npm run dev`) | 旅程 4 |
| 中文 UI 框架 + 英文技术数据透传 | 所有旅程 |

## Web 应用特定需求

### 技术架构

**前端:**
- 基于 React + Vite + TypeScript 的 SPA
- UI 组件库:Ant Design(中文生态,Timeline/Table/Chat 组件)
- 状态管理:TanStack Query,用于 API 数据缓存与分页
- 路由:React Router,用于在各视图间导航(调查列表、详情、推荐建议、对话)

**后端:**
- Node.js + Express 轻量代理服务
- AWS SDK v3(@aws-sdk/client),用于凭证链解析
- 读取 ~/.aws/credentials、环境变量、SSO token 缓存 —— 标准凭证提供链
- API 路由镜像 DevOps Agent 端点
- 单个 agent space ID,通过环境变量或配置文件配置

**API 集成点:**

| 前端视图 | 后端代理路由 | AWS DevOps Agent API |
|---|---|---|
| 调查列表 | POST /api/investigations/list | list-backlog-tasks |
| 调查详情 | GET /api/investigations/:investigationId | get-backlog-task |
| 执行时间线 | GET /api/investigations/:investigationId/executions | list-executions |
| journal 记录(自动翻页) | GET /api/executions/:executionId/journal | list-journal-records |
| 推荐建议 | POST /api/recommendations/list | list-recommendations |
| 推荐建议详情 | GET /api/recommendations/:recommendationId | get-recommendation |
| 创建调查 | POST /api/investigations | create-backlog-task |
| 创建对话 | POST /api/chat | create-chat |
| 发送对话消息 | POST /api/chat/:executionId/message | send-message |
| 列出对话会话 | GET /api/chats | list-chats |
| 配置 | GET /api/config | (本地配置) |

> 命名说明:调查类路由用 `/api/investigations/*`(底层是 Backlog Task API);对话类路由用 `/api/chat(s)/*`。两个领域刻意保持分离 —— 对话的 `executionId` 代表一个会话,与调查的一次 execution(执行)是不同概念。

### 浏览器与布局

- Chrome(最新版)—— 主要且唯一支持的浏览器
- 仅 localhost 部署,无需跨浏览器兼容
- 仅桌面布局 —— 针对标准显示器宽度优化(1280px+)
- MVP 不需要移动端或平板布局
- 固定侧边栏导航 + 主内容区的布局模式

### 配置

- **凭证配置:** 支持 AWS_PROFILE 环境变量选择 profile;未设置时回退到默认凭证链
- **Operator 角色模式(可选,推荐):** 当设置了 `DEVOPS_OPERATOR_ROLE_ARN` 时,后端用 AWS_PROFILE(或默认链)作为主凭证去 assume DevOps Agent 的 operator 角色(`DevOpsAgentRole-WebappAdmin-*`),注入 `AgentSpaceId` session tag,并把 `RoleSessionName` 对齐到标准 Web 控制台 "Operator access" 入口的身份。这让自建 UI 的会话在标准 Web 控制台里也可见(同一会话桶)。通过 `DEVOPS_OPERATOR_ROLE_ARN`、`DEVOPS_OPERATOR_SESSION_NAME`、`DEVOPS_OPERATOR_SESSION_DURATION` 配置。未设置时,回退为直接用 AWS_PROFILE 调用(会话仅自建 UI 可见)。
- **Agent space 配置:** .env 文件中单个 AGENT_SPACE_ID;MVP 不支持多 space 切换。启用 operator 角色模式时必填(用作 session tag 的值)。
- **区域:** 默认 us-east-1(DevOps Agent 服务区域),可通过 `DEVOPS_AGENT_REGION` 覆盖
- **错误处理:** 常见故障显示中文错误提示(凭证过期、API 节流、网络错误)
- **数据分页:** 后端透明处理 AWS API 分页 token,并对 journal 读取自动翻页拉取全部页;前端使用无限滚动或翻页按钮

## 功能需求

### 调查浏览

- FR1:运维工程师可查看所有调查的分页表格,含标题、状态、优先级、类型、创建时间和计算出的耗时,默认按创建时间降序
- FR2:运维工程师可从调查列表导航到调查详情视图
- FR3:运维工程师可查看调查元数据,包括状态、优先级、任务类型、创建和更新时间戳
- FR4:运维工程师可在可折叠面板(Ant Design Collapse,默认折叠)中查看某个调查关联的执行记录
- FR5:运维工程师可查看某次执行的 journal 记录,经 `marked` 库渲染 + `DOMPurify` 清洗,支持完整 Markdown(GFM 表格、代码块、标题、引用块)
- FR6:运维工程师可区分不同的 journal 记录类型(message、finding、investigation_summary)
- FR7:运维工程师可查看根因发现,其结构高亮、与普通消息分开
- FR8:运维工程师在有调查摘要时可查看摘要
- FR29:运维工程师可在 journal 记录中通过颜色区分用户消息(绿色)与 Agent 回复(蓝色)
- FR30:执行状态以中文标签和带颜色标签展示:STOPPED→已完成(绿)、RUNNING→运行中(蓝)、STARTING→启动中(橙)、PENDING→等待中(默认)
- FR31:调查耗时列由 createdAt/updatedAt 计算流逝时间;等待态显示"-",进行中任务显示实时耗时

### 调查创建

- FR9:运维工程师可在对话界面输入自然语言描述来创建新调查
- FR10:运维工程师可在创建调查时设置优先级
- FR11:系统以任务 ID 确认调查创建,并提供到新调查详情的导航
- FR12:系统将对话输入映射为 create-backlog-task API 调用,任务类型为 INVESTIGATION
- FR32:系统在 localStorage 中持久化提示历史(最多 20 条,去重),并在调查创建页内联展示
- FR33:运维工程师可点击历史提示自动填入输入框
- FR34:运维工程师可删除单条提示历史

### 多轮对话(运维对话)

- FR35:运维工程师可通过专门的对话页与 DevOps Agent 开启多轮运维对话
- FR36:若无活动会话,系统在首条消息时自动创建对话会话(CreateChat API)
- FR37:运维工程师可通过 SendMessage API 在已有对话会话中发送消息
- FR38:系统在响应生成期间以 3 秒间隔轮询 journal 记录,以展示 Agent 的增量回复
- FR39:系统通过 `final_response` 记录类型检测响应完成并停止轮询(至少等待 5 秒,并做一次最终拉取)
- FR40:对话会话(executionId)在 localStorage 中持久化 —— 会话在页面切换和浏览器刷新后仍在
- FR41:运维工程师可通过"新对话"按钮开启新会话,清空当前对话
- FR42:Agent 回复支持完整 Markdown 渲染(GFM 表格、代码块、标题)
- FR43:等待 Agent 响应时系统显示输入指示("Agent 思考中...")
- FR44:对话自动滚动到最新消息 —— 切换会话时直接跳转(无动画),同一会话内来新消息时平滑滚动
- FR45:运维工程师可在左侧栏查看所有对话会话的列表(通过 ListChats API),按最近活动排序(updatedAt/createdAt 降序),每条展示自动生成的会话标题和时间戳
- FR46:运维工程师可点击列表中某个会话切换并加载该历史对话;当前会话有视觉高亮
- FR47:系统在发送消息期间自动刷新会话列表(5 秒间隔),并在响应完成后再刷新一次,让新建和改名的会话出现
- FR48:运维工程师可通过列表头部的刷新按钮手动刷新会话列表

### 推荐建议

- FR13:运维工程师可查看所有推荐建议的列表,含标题、优先级和状态
- FR14:运维工程师可查看推荐建议详情,包括摘要、后续步骤、注意事项和受影响的调查
- FR15:运维工程师可从一条推荐建议导航到其关联调查

### 导航与布局

- FR16:运维工程师可通过常驻侧边栏导航(新建调查 / 调查列表 / 运维对话 / 推荐建议)在调查列表、调查创建、多轮对话和推荐建议各视图间切换
- FR17:所有 UI 导航元素、标签、状态指示和章节标题均以中文呈现
- FR18:技术数据内容(资源 ID、发现文本、API 响应)在中文标签容器内保留原始英文
- FR28:侧边栏展示 "DevOps Agent" 品牌标识及 CloudServerOutlined 图标,可折叠为仅图标模式

### 后端与凭证管理

- FR19:系统从本地凭证链读取 AWS 凭证(凭证文件、环境变量、SSO token 缓存)
- FR20:系统支持通过环境变量配置选择 AWS profile
- FR21:系统支持通过环境文件配置 agent space ID
- FR22:系统将所有前端 API 请求代理到 us-east-1 区域的 AWS DevOps Agent 服务
- FR23:系统对列表操作透明处理 API 分页,包括对 journal 记录读取自动翻页,把所有页汇总成单个响应
- FR49:当配置了 `DEVOPS_OPERATOR_ROLE_ARN` 时,系统 assume DevOps Agent 的 operator 角色(用 AWS_PROFILE 或默认链作主凭证)并注入 `AgentSpaceId` session tag,使会话创建在与标准 Web 控制台相同的身份桶下;未设置时,系统回退为直接用本地凭证链调用
- FR50:系统把 assume 角色的 `RoleSessionName` 对齐到可配置的值(`DEVOPS_OPERATOR_SESSION_NAME`),使对话会话列表与标准 Web 控制台 "Operator access" 视图一致
- FR51:当设置了 `DEVOPS_OPERATOR_ROLE_ARN` 但缺少 `AGENT_SPACE_ID`(session tag 必需)时,系统快速失败并给出清晰错误

### 错误处理与反馈

- FR24:当 AWS 凭证无效或过期时,系统显示中文错误提示
- FR25:当 API 调用失败时(节流、网络错误、服务不可用),系统显示中文错误提示
- FR26:API 调用期间系统显示加载态
- FR27:无数据时系统显示带中文引导的空状态

## 非功能需求

### 性能

- 页面首次加载在 localhost 上 2 秒内完成
- 收到 API 响应后,调查列表 1 秒内渲染完成
- 收到 API 响应后,调查详情页(含 journal 记录)2 秒内渲染完成
- 基于对话的调查创建在 API 响应后 1 秒内给出确认反馈
- 分页请求(下一页)在响应后 500ms 内完成渲染

### 安全

- AWS 凭证绝不离开本地后端服务 —— 前端对凭证数据零访问
- 后端代理仅监听 localhost(127.0.0.1)—— 外部网络不可访问
- 前端代码或浏览器存储中不保存任何凭证、token 或敏感配置
- Operator 角色凭证是短期 STS 会话凭证(服务端通过 fromTemporaryCredentials assume,默认 1 小时,可配置);operator 角色 ARN、session name 和 AgentSpaceId 仅存在于后端 .env
- 含 AGENT_SPACE_ID、AWS_PROFILE 和 operator 角色配置(DEVOPS_OPERATOR_ROLE_ARN / DEVOPS_OPERATOR_SESSION_NAME / DEVOPS_OPERATOR_SESSION_DURATION)的 .env 文件通过 .gitignore 排除出版本控制;仓库中提交一份脱敏的 .env.example 作为模板
- 所有 Markdown 渲染的 HTML 在注入 DOM 前经 DOMPurify 清洗(防止 XSS 攻击)
- localStorage 仅用于非敏感 UI 状态:当前对话会话的 executionId 和提示历史文本

### 集成

- 后端支持完整的 AWS 凭证提供链:凭证文件(~/.aws/credentials)、环境变量(AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY)、SSO token 缓存、以及共享配置文件(~/.aws/config)
- 后端可选地通过 STS(fromTemporaryCredentials)assume DevOps Agent 的 operator 角色并带 AgentSpaceId session tag —— 这是该角色权限策略所必需的,因为其 Resource 被限定为 `agentspace/${aws:PrincipalTag/AgentSpaceId}`
- 后端对所有列表操作正确处理 AWS API 分页 token,并对 journal 记录读取自动翻页(ListJournalRecords,每页 100 条),使长对话和长调查返回完整记录而非只有第一页
- 后端为所有 AWS API 失败模式返回结构化错误响应(AccessDeniedException、ThrottlingException、ValidationException、ResourceNotFoundException)
- API 代理与文档所述的 AWS DevOps Agent API 保持兼容 —— 除分页汇总外,不对请求/响应 schema 做任何转换

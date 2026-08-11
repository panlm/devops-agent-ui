const express = require('express');
const {
  ListBacklogTasksCommand,
  GetBacklogTaskCommand,
  ListExecutionsCommand,
  ListJournalRecordsCommand,
  ListRecommendationsCommand,
  GetRecommendationCommand,
  CreateBacklogTaskCommand,
  CreateChatCommand,
  SendMessageCommand,
  ListChatsCommand,
  ListAssociationsCommand,
  ListServicesCommand,
  ListGoalsCommand,
} = require('@aws-sdk/client-devops-agent');

const path = require('path');
// 根 package.json 的 version。启动时读一次即可，无需每次请求都读盘。
const { version: APP_VERSION } = require(path.join(__dirname, '..', 'package.json'));

const router = express.Router();

// ============================================================
// SendMessage 事件流消费
//
// SendMessage 的响应 `events` 是 AsyncIterable<SendMessageEvents>，是个
// discriminated union，每个事件对象只有一个 key 被填充。9 种成员：
//   responseCreated / responseInProgress / responseCompleted / responseFailed
//   contentBlockStart / contentBlockDelta / contentBlockStop
//   summary / heartbeat
//
// 助手回复的文本按 contentBlockStart → contentBlockDelta(增量) →
// contentBlockStop(该 block 完整文本) 的序列到达，以 responseCompleted
// 或 responseFailed 终止。
//
// ⚠️ 坑 1：contentBlockDelta.delta 是二级 union，取文本必须走
//        delta.textDelta.text
//    不是 delta.text（那个字段不存在）。另一支 delta.jsonDelta.partialJson
//    是 tool-use / 遥测的 JSON 片段，不是用户可见内容，要跳过。取错字段的
//    表现是事件流干净结束但一个字都没有。
//
// ⚠️ 坑 2：一次回答会产生多个 block，必须按 contentBlockStart.type 区分，
//    否则内容重复 + 混入内部数据。实测一次 "1+1=?" 的 block 序列：
//      idx=0 type=text            逐字增量的正文        ← 只有这个要显示
//      idx=1 type=context_usage   {"metadata":...} JSON  ← 内部遥测
//      idx=2 type=final_response  与 idx=0 相同的全文     ← 重复
//      idx=3 type=chat_title      "Simple Math Question" ← 会话标题
//    只认 type=text 才是流式正文。final_response 是同一段话的整体重发，
//    journal 里已有记录，前端不需要它。chat_title 单独回调出去，可用于
//    即时更新会话列表标题。
//
// ⚠️ 坑 3：contentBlockStop.text 实测恒为空（服务契约里是 optional），
//    所以 block 的完整文本只能靠按 index 累积的 delta 片段拼出来。
// ============================================================

// 只保留一个硬上限。不要在收到正文 block 后收紧 deadline —— agent 常见的
// 模式是先说一句「让我来查看…」，再调工具（可能好几轮，每轮数十秒），然后
// 才输出真正的答案。收紧到 5 秒会在工具执行期间提前 break，答案被砍掉，
// 表现为回答只剩开场白。responseCompleted / responseFailed 才是正常终止信号，
// 这个上限只用于防止流永不关闭时挂死。
const SEND_MESSAGE_TIMEOUT_MS = 300000; // 5 分钟

// 用户可见正文的 block type。其余 type 只用于内部/元数据。
const TEXT_BLOCK_TYPE = 'text';
const TITLE_BLOCK_TYPE = 'chat_title';
// 工具调用进度。内容是模型自述的动作，不进正文，但值得作为进度提示推给前端：
// agent 调工具时流会静默数十秒，没有提示用户会以为卡死。
const TOOL_BLOCK_TYPE = 'tool_summary';

async function consumeSendMessageEvents(sendResponse, opts = {}) {
  const { onDelta, onBlock, onTitle, onTool, onSummary, isAborted } = opts;
  const events = sendResponse?.events;
  if (!events) return { text: '', usage: undefined, error: undefined };

  const deadline = Date.now() + SEND_MESSAGE_TIMEOUT_MS;
  const typeByIndex = new Map(); // index -> block type（来自 contentBlockStart）
  const deltasByIndex = new Map(); // index -> 增量片段数组
  const textBlocks = []; // 仅 type=text 的完整文本，按 stop 顺序
  let title;
  let usage;
  let error;
  let terminal; // 'completed' | 'failed' | undefined(EOF)

  for await (const event of events) {
    if (isAborted?.()) break;
    if (Date.now() > deadline) {
      console.warn('[chat] SendMessage 事件流超时，返回已收到的内容');
      break;
    }

    if (event.contentBlockStart) {
      const { index, type } = event.contentBlockStart;
      if (index !== undefined) typeByIndex.set(index, type);
    } else if (event.contentBlockDelta) {
      const { index, delta } = event.contentBlockDelta;
      // 只取 textDelta.text；jsonDelta.partialJson 是内部 JSON，跳过
      const chunk = delta?.textDelta?.text;
      if (chunk && index !== undefined) {
        if (!deltasByIndex.has(index)) deltasByIndex.set(index, []);
        deltasByIndex.get(index).push(chunk);
        // 只有正文 block 往前端推增量
        if (typeByIndex.get(index) === TEXT_BLOCK_TYPE) onDelta?.(index, chunk);
      }
    } else if (event.contentBlockStop) {
      const { index, text } = event.contentBlockStop;
      const blockType = typeByIndex.get(index);
      // stop.text 实测恒空，回落到累积的 delta
      const blockText = text || (deltasByIndex.get(index) || []).join('');
      if (!blockText) continue;

      if (blockType === TEXT_BLOCK_TYPE) {
        textBlocks.push(blockText);
        onBlock?.(index, blockText);
      } else if (blockType === TITLE_BLOCK_TYPE) {
        title = blockText;
        onTitle?.(blockText);
      } else if (blockType === TOOL_BLOCK_TYPE) {
        // 不进正文，只作为进度提示
        onTool?.(blockText);
      }
      // context_usage / final_response 等其余 type 丢弃：
      // 前者是内部遥测，后者与正文重复且 journal 已记录
    } else if (event.summary) {
      if (event.summary.content) onSummary?.(event.summary.content);
    } else if (event.responseCompleted) {
      usage = event.responseCompleted.usage;
      terminal = 'completed';
      break;
    } else if (event.responseFailed) {
      const f = event.responseFailed;
      error = { code: f.errorCode, message: f.errorMessage };
      terminal = 'failed';
      break;
    }
    // responseCreated / responseInProgress / heartbeat 无需处理，
    // heartbeat 的作用是保持连接活跃
  }

  const text = textBlocks.join('\n');
  console.log(
    `[chat] 事件流消费完成 textBlocks=${textBlocks.length} chars=${text.length} ` +
      `types=${[...typeByIndex.values()].join(',')} 终止=${terminal || 'eof'}` +
      (error ? ` error=${JSON.stringify(error)}` : '')
  );
  return { text, title, usage, error };
}

// ============================================================
// Health（健康检查）—— 不依赖 AWS 可达性，无凭证 / 无网络也能响应。
// ============================================================

// GET /api/health - 轻量健康检查
// 复用注入中间件的凭证加载结果(req.awsCredentialsOk)，绝不新发起 AWS 调用。
// 凭证缺失时仍返回 HTTP 200，只把 status 置为 degraded。
router.get('/health', (req, res) => {
  const awsCredentials = req.awsCredentialsOk === true;
  res.status(200).json({
    status: awsCredentials ? 'ok' : 'degraded',
    aws_credentials: awsCredentials,
    agent_space_id_configured: Boolean(process.env.AGENT_SPACE_ID),
    uptime_seconds: Math.floor(process.uptime()),
    version: APP_VERSION,
  });
});

// ============================================================
// Investigation(调查 = Backlog Task)相关接口
// ============================================================

// POST /api/investigations/list - 列出所有调查任务
router.post('/investigations/list', async (req, res, next) => {
  try {
    const { nextToken, filter, sort } = req.body;
    const command = new ListBacklogTasksCommand({
      agentSpaceId: req.agentSpaceId,
      nextToken,
      filter,
      sort,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/investigations/:investigationId - 获取单个调查
router.get('/investigations/:investigationId', async (req, res, next) => {
  try {
    const command = new GetBacklogTaskCommand({
      agentSpaceId: req.agentSpaceId,
      taskId: req.params.investigationId,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/investigations - 创建一个新调查
router.post('/investigations', async (req, res, next) => {
  try {
    const { title, description, priority } = req.body;
    const command = new CreateBacklogTaskCommand({
      agentSpaceId: req.agentSpaceId,
      taskType: 'INVESTIGATION',
      title: title || `Investigation ${new Date().toISOString()}`,
      description,
      priority: priority || 'MEDIUM',
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/investigations/:investigationId/executions - 列出调查的执行记录
router.get('/investigations/:investigationId/executions', async (req, res, next) => {
  try {
    const command = new ListExecutionsCommand({
      agentSpaceId: req.agentSpaceId,
      taskId: req.params.investigationId,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// 通用：journal 记录（调查的执行时间线 + 对话的消息历史，底层同一接口）
// ============================================================

// GET /api/executions/:executionId/journal - 读取 journal 记录
// 自动翻页：ListJournalRecords 每页上限 100 条，会话消息多时会分页。
// 这里循环拉完所有页再返回，保证调用方拿到完整记录（否则长会话只显示第一页）。
router.get('/executions/:executionId/journal', async (req, res, next) => {
  try {
    const { recordType, order } = req.query;
    const allRecords = [];
    let nextToken = req.query.nextToken || undefined;
    // 安全上限，防止异常情况下无限翻页（100 页 = 1万条，足够任何会话）
    for (let page = 0; page < 100; page++) {
      const command = new ListJournalRecordsCommand({
        agentSpaceId: req.agentSpaceId,
        executionId: req.params.executionId,
        recordType: recordType || undefined,
        order: order || 'ASC',
        nextToken,
      });
      const result = await req.awsClient.send(command);
      if (result.records) allRecords.push(...result.records);
      nextToken = result.nextToken;
      if (!nextToken) break;
    }
    res.json({ records: allRecords });
  } catch (err) {
    next(err);
  }
});

// POST /api/recommendations/list - List recommendations
router.post('/recommendations/list', async (req, res, next) => {
  try {
    const { nextToken, limit, priority, status, taskId, goalId } = req.body;
    const command = new ListRecommendationsCommand({
      agentSpaceId: req.agentSpaceId,
      nextToken,
      limit,
      priority,
      status,
      taskId,
      goalId,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/recommendations/:recommendationId - Get a single recommendation
router.get('/recommendations/:recommendationId', async (req, res, next) => {
  try {
    const command = new GetRecommendationCommand({
      agentSpaceId: req.agentSpaceId,
      recommendationId: req.params.recommendationId,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// Chat(对话)相关接口 —— 与 Investigation 完全独立
// 注意：CreateChat 直接返回 executionId，这里的 executionId 即「一个会话」，
// 与 Investigation 下的 execution（一次调查执行）是不同领域，勿混淆。
// ============================================================

// GET /api/chats - 列出对话会话
router.get('/chats', async (req, res, next) => {
  try {
    const command = new ListChatsCommand({
      agentSpaceId: req.agentSpaceId,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/chat - Create a new chat
router.post('/chat', async (req, res, next) => {
  try {
    const command = new CreateChatCommand({
      agentSpaceId: req.agentSpaceId,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/:executionId/message - Send message in chat（非流式，等全部内容返回）
router.post('/chat/:executionId/message', async (req, res, next) => {
  try {
    const { message } = req.body;
    const command = new SendMessageCommand({
      agentSpaceId: req.agentSpaceId,
      executionId: req.params.executionId,
      content: message,
    });
    const result = await req.awsClient.send(command);
    const { text, title, usage, error } = await consumeSendMessageEvents(result);
    if (error) return res.status(502).json({ error: error.message || error.code || '响应失败' });
    res.json({ text, title, usage });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/:executionId/message/stream - Send message，以 SSE 逐块推送
//
// SendMessage 的 events 是 AsyncIterable<SendMessageEvents>（9 种成员）。
// 这里把它转成浏览器可消费的 SSE：
//   event: delta      data: {"index":0,"text":"增量片段"}      仅正文(type=text)
//   event: block      data: {"index":0,"text":"该 block 完整文本"}
//   event: title      data: {"title":"会话标题"}               可即时更新会话列表
//   event: tool       data: {"note":"正在查询…"}               工具调用进度提示
//   event: summary    data: {"content":"..."}
//   event: complete   data: {"text":"全文","usage":{...}}
//   event: error      data: {"message":"..."}
// 前端只靠 delta 做打字机效果，靠 complete 收尾；断流时 journal 仍是真相源。
router.post('/chat/:executionId/message/stream', async (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // 反代（nginx/ALB）不要缓冲
  });
  res.flushHeaders?.();

  // 客户端断开就停止消费上游事件流
  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });

  const send = (event, data) => {
    if (aborted || res.writableEnded) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { message } = req.body;
    const command = new SendMessageCommand({
      agentSpaceId: req.agentSpaceId,
      executionId: req.params.executionId,
      content: message,
    });
    const result = await req.awsClient.send(command);
    const { text, usage, error } = await consumeSendMessageEvents(result, {
      onDelta: (index, chunk) => send('delta', { index, text: chunk }),
      onBlock: (index, blockText) => send('block', { index, text: blockText }),
      onTitle: (title) => send('title', { title }),
      onTool: (note) => send('tool', { note }),
      onSummary: (content) => send('summary', { content }),
      isAborted: () => aborted,
    });
    if (error) send('error', { message: error.message || error.code || '响应失败' });
    else send('complete', { text, usage });
  } catch (err) {
    send('error', { message: err.message || String(err) });
  } finally {
    if (!res.writableEnded) res.end();
  }
});

// ============================================================
// Topology（拓扑）相关接口
// ============================================================

// GET /api/topology/associations - 列出 agent space 的所有关联
router.get('/topology/associations', async (req, res, next) => {
  try {
    const allAssociations = [];
    let nextToken;
    for (let page = 0; page < 20; page++) {
      const command = new ListAssociationsCommand({
        agentSpaceId: req.agentSpaceId,
        maxResults: 50,
        nextToken,
      });
      const result = await req.awsClient.send(command);
      if (result.associations) allAssociations.push(...result.associations);
      nextToken = result.nextToken;
      if (!nextToken) break;
    }
    res.json({ associations: allAssociations });
  } catch (err) {
    next(err);
  }
});

// GET /api/topology/services - 列出账号级的已注册服务
// 注意: ListServices 是账号级 API,operator 角色可能无权限,静默返回空
router.get('/topology/services', async (req, res) => {
  try {
    const allServices = [];
    let nextToken;
    for (let page = 0; page < 20; page++) {
      const command = new ListServicesCommand({
        maxResults: 50,
        nextToken,
      });
      const result = await req.awsClient.send(command);
      if (result.services) allServices.push(...result.services);
      nextToken = result.nextToken;
      if (!nextToken) break;
    }
    res.json({ services: allServices });
  } catch (err) {
    // operator 角色通常无 ListServices 权限,静默返回空列表
    res.json({ services: [] });
  }
});

// ============================================================
// Goals（目标）相关接口 —— 用于 Artifacts 页
// ============================================================

// POST /api/goals/list - 列出目标
router.post('/goals/list', async (req, res, next) => {
  try {
    const { status, goalType, limit, nextToken } = req.body;
    const command = new ListGoalsCommand({
      agentSpaceId: req.agentSpaceId,
      status,
      goalType,
      limit,
      nextToken,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ============================================================
// Changes（变更）—— 当前 SDK 无独立 ListChanges API。
// 官方 Changes 页展示的是代码变更审查(Proposed changes),
// 这些通过 chat 触发 Agent 评审代码分支后产生,暂无公开 list API。
// 这里返回空列表,等 SDK 支持后再接入。
// ============================================================

// POST /api/changes/list
router.post('/changes/list', async (req, res) => {
  res.json({ tasks: [] });
});

// GET /api/config - Return current config (no secrets)
router.get('/config', (req, res) => {
  res.json({
    agentSpaceId: req.agentSpaceId,
    region: process.env.DEVOPS_AGENT_REGION || 'us-east-1',
    profile: process.env.AWS_PROFILE || 'default',
  });
});

module.exports = router;

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

// POST /api/chat/:executionId/message - Send message in chat
router.post('/chat/:executionId/message', async (req, res, next) => {
  try {
    const { message } = req.body;
    const command = new SendMessageCommand({
      agentSpaceId: req.agentSpaceId,
      executionId: req.params.executionId,
      content: message,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
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

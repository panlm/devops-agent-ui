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
} = require('@aws-sdk/client-devops-agent');

const router = express.Router();

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

// GET /api/config - Return current config (no secrets)
router.get('/config', (req, res) => {
  res.json({
    agentSpaceId: req.agentSpaceId,
    region: process.env.DEVOPS_AGENT_REGION || 'us-east-1',
    profile: process.env.AWS_PROFILE || 'default',
  });
});

module.exports = router;

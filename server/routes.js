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

// GET /api/tasks - List all backlog tasks
router.post('/tasks/list', async (req, res, next) => {
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

// GET /api/tasks/:taskId - Get a single task
router.get('/tasks/:taskId', async (req, res, next) => {
  try {
    const command = new GetBacklogTaskCommand({
      agentSpaceId: req.agentSpaceId,
      taskId: req.params.taskId,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/tasks - Create a new investigation
router.post('/tasks', async (req, res, next) => {
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

// GET /api/tasks/:taskId/executions - List executions for a task
router.get('/tasks/:taskId/executions', async (req, res, next) => {
  try {
    const command = new ListExecutionsCommand({
      agentSpaceId: req.agentSpaceId,
      taskId: req.params.taskId,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/executions/:executionId/journal - List journal records
router.get('/executions/:executionId/journal', async (req, res, next) => {
  try {
    const { recordType, order, nextToken } = req.query;
    const command = new ListJournalRecordsCommand({
      agentSpaceId: req.agentSpaceId,
      executionId: req.params.executionId,
      recordType: recordType || undefined,
      order: order || 'ASC',
      nextToken: nextToken || undefined,
    });
    const result = await req.awsClient.send(command);
    res.json(result);
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
      body: message,
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

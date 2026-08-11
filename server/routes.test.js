// describe / it / expect / beforeEach / vi 由 vitest globals 提供（见 vitest.config.js: globals:true）。
const request = require('supertest');
const { createApp } = require('./index');

// ⭐ AWS SDK 绝不真调：通过 createApp 注入一个假的 createAwsClient，
// 它返回带可控 send 的假 client。每个用例用 mockSend 设定这一次 send 的
// 返回值 / 抛错。测试跑的是真实的中间件 + 路由 + 错误处理，只是 AWS 调用被替换，
// 因此完全离线、无需任何凭证。
const mockSend = vi.fn();
const app = createApp({ createAwsClient: async () => ({ send: mockSend }) });

// 路由从 process.env.AGENT_SPACE_ID 读取 agentSpaceId
process.env.AGENT_SPACE_ID = 'space-test-123';

beforeEach(() => {
  mockSend.mockReset();
});

describe('investigations 端点', () => {
  it('POST /api/investigations/list 正常路径：透传 SDK 结果', async () => {
    mockSend.mockResolvedValueOnce({ tasks: [{ taskId: 't1' }], nextToken: 'nt' });

    const res = await request(app).post('/api/investigations/list').send({ filter: 'OPEN' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tasks: [{ taskId: 't1' }], nextToken: 'nt' });
    expect(mockSend).toHaveBeenCalledTimes(1);
    // 传入的 command 应带上 agentSpaceId 与请求体字段
    const command = mockSend.mock.calls[0][0];
    expect(command.input).toMatchObject({ agentSpaceId: 'space-test-123', filter: 'OPEN' });
  });

  it('GET /api/investigations/:id 正常路径', async () => {
    mockSend.mockResolvedValueOnce({ task: { taskId: 'abc', title: 'T' } });

    const res = await request(app).get('/api/investigations/abc');

    expect(res.status).toBe(200);
    expect(res.body.task).toMatchObject({ taskId: 'abc' });
    expect(mockSend.mock.calls[0][0].input).toMatchObject({ taskId: 'abc' });
  });

  it('GET /api/investigations/:id 错误路径：ResourceNotFoundException → 404 + 中文错误', async () => {
    const err = new Error('task not found');
    err.name = 'ResourceNotFoundException';
    mockSend.mockRejectedValueOnce(err);

    const res = await request(app).get('/api/investigations/missing');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('资源未找到');
    expect(res.body.detail).toBe('task not found');
  });

  it('POST /api/investigations 错误路径：ValidationException → 400', async () => {
    const err = new Error('bad input');
    err.name = 'ValidationException';
    mockSend.mockRejectedValueOnce(err);

    const res = await request(app).post('/api/investigations').send({ description: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('请求参数无效');
  });
});

describe('recommendations 端点', () => {
  it('POST /api/recommendations/list 正常路径', async () => {
    mockSend.mockResolvedValueOnce({ recommendations: [{ id: 'r1' }] });

    const res = await request(app).post('/api/recommendations/list').send({ limit: 10, priority: 'HIGH' });

    expect(res.status).toBe(200);
    expect(res.body.recommendations).toHaveLength(1);
    expect(mockSend.mock.calls[0][0].input).toMatchObject({ limit: 10, priority: 'HIGH' });
  });

  it('POST /api/recommendations/list 错误路径：AccessDeniedException → 403', async () => {
    const err = new Error('denied');
    err.name = 'AccessDeniedException';
    mockSend.mockRejectedValueOnce(err);

    const res = await request(app).post('/api/recommendations/list').send({});

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('访问被拒绝，请检查 AWS 权限配置');
  });
});

describe('chat 端点', () => {
  it('POST /api/chat 正常路径：返回 executionId', async () => {
    mockSend.mockResolvedValueOnce({ executionId: 'exec-1' });

    const res = await request(app).post('/api/chat');

    expect(res.status).toBe(200);
    expect(res.body.executionId).toBe('exec-1');
  });

  it('POST /api/chat/:id/message 正常路径：message 作为 content 透传', async () => {
    mockSend.mockResolvedValueOnce({ ok: true });

    const res = await request(app).post('/api/chat/exec-1/message').send({ message: '你好' });

    expect(res.status).toBe(200);
    expect(mockSend.mock.calls[0][0].input).toMatchObject({ executionId: 'exec-1', content: '你好' });
  });

  it('POST /api/chat/:id/message 错误路径：ThrottlingException → 429', async () => {
    const err = new Error('slow down');
    err.name = 'ThrottlingException';
    mockSend.mockRejectedValueOnce(err);

    const res = await request(app).post('/api/chat/exec-1/message').send({ message: 'hi' });

    expect(res.status).toBe(429);
    expect(res.body.error).toBe('API 请求过于频繁，请稍后再试');
  });
});

describe('journal 端点（自动翻页）', () => {
  it('GET /api/executions/:id/journal：跟随 nextToken 拉完多页后合并', async () => {
    mockSend
      .mockResolvedValueOnce({ records: [{ id: 1 }], nextToken: 'p2' })
      .mockResolvedValueOnce({ records: [{ id: 2 }], nextToken: undefined });

    const res = await request(app).get('/api/executions/exec-9/journal');

    expect(res.status).toBe(200);
    expect(res.body.records).toEqual([{ id: 1 }, { id: 2 }]);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });
});

describe('topology 端点', () => {
  it('GET /api/topology/services：SDK 抛错时静默返回空列表（不进全局错误处理）', async () => {
    const err = new Error('no permission');
    err.name = 'AccessDeniedException';
    mockSend.mockRejectedValueOnce(err);

    const res = await request(app).get('/api/topology/services');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ services: [] });
  });
});

describe('不依赖 SDK 的端点', () => {
  it('GET /api/config：返回配置，不调用 AWS', async () => {
    const res = await request(app).get('/api/config');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ agentSpaceId: 'space-test-123' });
    expect(res.body).toHaveProperty('region');
    expect(res.body).toHaveProperty('profile');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('POST /api/changes/list：当前恒定返回空 tasks', async () => {
    const res = await request(app).post('/api/changes/list').send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tasks: [] });
    expect(mockSend).not.toHaveBeenCalled();
  });
});

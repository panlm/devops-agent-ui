// describe / it / expect 由 vitest globals 提供（见 vitest.config.js: globals:true）。
const request = require('supertest');
const { createApp } = require('./index');
const { version: APP_VERSION } = require('../package.json');

// /api/health 是健康检查，不是业务接口：
//   - 凭证正常 → status: ok, aws_credentials: true
//   - 凭证加载失败 → 仍返回 HTTP 200，但 status: degraded, aws_credentials: false
// 全程不真调 AWS：createApp 注入假的 createAwsClient（成功 / 抛错两种）。

process.env.AGENT_SPACE_ID = 'space-test-123';

describe('GET /api/health', () => {
  it('凭证正常：status=ok, aws_credentials=true, 含 uptime/version', async () => {
    const app = createApp({ createAwsClient: async () => ({ send: () => {} }) });

    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.aws_credentials).toBe(true);
    expect(res.body.agent_space_id_configured).toBe(true);
    expect(res.body.version).toBe(APP_VERSION);
    expect(typeof res.body.uptime_seconds).toBe('number');
    expect(Number.isInteger(res.body.uptime_seconds)).toBe(true);
    expect(res.body.uptime_seconds).toBeGreaterThanOrEqual(0);
  });

  it('凭证加载失败：仍返回 HTTP 200，但 status=degraded, aws_credentials=false', async () => {
    const app = createApp({
      createAwsClient: async () => {
        throw new Error('凭证文件不存在');
      },
    });

    const res = await request(app).get('/api/health');

    // 健康检查不能因凭证缺失而 500
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.aws_credentials).toBe(false);
    // 端点不依赖 AWS 可达性，其余字段照常返回
    expect(res.body.version).toBe(APP_VERSION);
    expect(Number.isInteger(res.body.uptime_seconds)).toBe(true);
  });

  it('AGENT_SPACE_ID 未配置：agent_space_id_configured=false', async () => {
    const saved = process.env.AGENT_SPACE_ID;
    delete process.env.AGENT_SPACE_ID;
    try {
      const app = createApp({ createAwsClient: async () => ({ send: () => {} }) });

      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.agent_space_id_configured).toBe(false);
    } finally {
      process.env.AGENT_SPACE_ID = saved;
    }
  });
});

// describe / it / expect 由 vitest globals 提供（见 vitest.config.js: globals:true）。
const request = require('supertest');
const { createApp } = require('./index');

// 模拟「凭证加载失败」：注入的 createAwsClient 抛错。
// index.js 的注入中间件应捕获它，返回 500 且带中文错误信息，
// 请求不会到达任何路由 handler（也就绝不会触碰 AWS）。
const app = createApp({
  createAwsClient: async () => {
    throw new Error('凭证文件不存在');
  },
});

process.env.AGENT_SPACE_ID = 'space-test-123';

describe('AWS 凭证注入中间件', () => {
  it('凭证加载失败时返回 500 且带中文错误信息', async () => {
    const res = await request(app).get('/api/config');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('AWS 凭证错误');
    expect(res.body.message).toContain('无法加载 AWS 凭证');
    expect(res.body.detail).toBe('凭证文件不存在');
  });
});

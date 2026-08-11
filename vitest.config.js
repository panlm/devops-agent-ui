import { defineConfig } from 'vitest/config';

// 后端测试配置：node 环境，只跑 server/ 下的测试。
// 前端测试有独立的 client/vitest.config.ts，通过 `npm test` 的组合脚本一起触发。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/**/*.test.js'],
    globals: true,
  },
});

import { defineConfig } from 'vitest/config'

// 前端测试：纯逻辑（工具函数 + API 封装），用 node 环境即可，无需 jsdom。
// 复用项目的 vite 生态，零额外插件。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})

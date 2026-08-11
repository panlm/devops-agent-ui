import { describe, it, expect } from 'vitest'
import { deriveHealthIndicator } from './health'
import type { HealthResponse } from '../api/client'

// 健康指示三态渲染的数据来源就是 deriveHealthIndicator。
// 组件只是把它的 color/label 塞进 antd Badge，因此测这个纯函数即覆盖三态。
const okHealth: HealthResponse = {
  status: 'ok',
  aws_credentials: true,
  agent_space_id_configured: true,
  uptime_seconds: 42,
  version: '1.0.0',
}

describe('deriveHealthIndicator（三态）', () => {
  it('绿色/正常：请求成功且 status=ok', () => {
    const ind = deriveHealthIndicator(okHealth, false)
    expect(ind.state).toBe('green')
    expect(ind.color).toBe('success')
    expect(ind.label).toBe('正常')
  })

  it('黄色/降级：请求成功但 status=degraded', () => {
    const ind = deriveHealthIndicator({ ...okHealth, status: 'degraded', aws_credentials: false }, false)
    expect(ind.state).toBe('yellow')
    expect(ind.color).toBe('warning')
    expect(ind.label).toBe('降级')
  })

  it('红色/无法连接后端：请求失败', () => {
    const ind = deriveHealthIndicator(undefined, true)
    expect(ind.state).toBe('red')
    expect(ind.color).toBe('error')
    expect(ind.label).toBe('无法连接后端')
  })

  it('红色兜底：无错误标记但也没有数据（如首次加载失败态）', () => {
    const ind = deriveHealthIndicator(undefined, false)
    expect(ind.state).toBe('red')
    expect(ind.color).toBe('error')
  })
})

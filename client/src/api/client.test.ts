import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  listInvestigations,
  getInvestigation,
  createChat,
  sendMessage,
  getExecutionJournal,
  getConfig,
} from './client'

const BASE = 'http://127.0.0.1:3001/api'

// 用 mock 的 global.fetch 断言请求封装：URL / method / body / 成功解析 / 错误抛出。
// 全程不发真实网络请求。
function mockFetch(status: number, body: unknown) {
  const fn = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }))
  // @ts-expect-error 测试里把 fetch 替换为 mock
  globalThis.fetch = fn
  return fn
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  // @ts-expect-error 清理注入的 fetch
  delete globalThis.fetch
})

describe('request 成功路径', () => {
  it('GET：拼出正确 URL 并返回解析后的 JSON', async () => {
    const fetchMock = mockFetch(200, { agentSpaceId: 's1', region: 'us-east-1', profile: 'default' })

    const result = await getConfig()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/config`)
    // GET 没有显式 method
    expect(options?.method).toBeUndefined()
    expect((options?.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(result).toEqual({ agentSpaceId: 's1', region: 'us-east-1', profile: 'default' })
  })

  it('GET 带路径参数：getInvestigation 拼接 id', async () => {
    const fetchMock = mockFetch(200, { task: { taskId: 'abc' } })

    await getInvestigation('abc')

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/investigations/abc`)
  })

  it('POST：带 method 与 JSON body', async () => {
    const fetchMock = mockFetch(200, { tasks: [] })

    await listInvestigations({ filter: 'OPEN' })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/investigations/list`)
    expect(options?.method).toBe('POST')
    expect(options?.body).toBe(JSON.stringify({ filter: 'OPEN' }))
  })

  it('POST 无 body 参数：序列化为空对象', async () => {
    const fetchMock = mockFetch(200, {})

    await listInvestigations()

    expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify({}))
  })

  it('createChat：POST 且无 body', async () => {
    const fetchMock = mockFetch(200, { executionId: 'exec-1' })

    const res = await createChat()

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/chat`)
    expect(options?.method).toBe('POST')
    expect(res).toEqual({ executionId: 'exec-1' })
  })

  it('sendMessage：把 message 放进 body', async () => {
    const fetchMock = mockFetch(200, { ok: true })

    await sendMessage('exec-1', '你好')

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(`${BASE}/chat/exec-1/message`)
    expect(options?.body).toBe(JSON.stringify({ message: '你好' }))
  })

  it('getExecutionJournal：把 params 拼成 query string', async () => {
    const fetchMock = mockFetch(200, { records: [] })

    await getExecutionJournal('exec-9', { recordType: 'MESSAGE', order: 'ASC' })

    const url = fetchMock.mock.calls[0][0] as string
    expect(url.startsWith(`${BASE}/executions/exec-9/journal?`)).toBe(true)
    expect(url).toContain('recordType=MESSAGE')
    expect(url).toContain('order=ASC')
  })

  it('getExecutionJournal：无 params 时不带 query string', async () => {
    const fetchMock = mockFetch(200, { records: [] })

    await getExecutionJournal('exec-9')

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/executions/exec-9/journal`)
  })
})

describe('request 错误路径', () => {
  it('非 2xx 且响应带 error 字段：抛出该 error 文案', async () => {
    mockFetch(404, { error: '资源未找到' })

    await expect(getConfig()).rejects.toThrow('资源未找到')
  })

  it('非 2xx 且响应体无法解析：抛出带状态码的兜底文案', async () => {
    const fn = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('invalid json')
      },
    }))
    // @ts-expect-error 注入 mock fetch
    globalThis.fetch = fn

    await expect(getConfig()).rejects.toThrow('请求失败 (500)')
  })
})

const BASE_URL = 'http://127.0.0.1:3001/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `请求失败 (${res.status})`);
  }
  return res.json();
}

// ============================================================
// Investigation（调查 = Backlog Task）
// 一个调查可包含多个 execution（执行），execution 的过程记录通过 journal 读取。
// ============================================================

export function listInvestigations(body?: Record<string, unknown>) {
  return request('/investigations/list', { method: 'POST', body: JSON.stringify(body || {}) });
}

export function getInvestigation(investigationId: string) {
  return request(`/investigations/${investigationId}`);
}

export function createInvestigation(data: { title?: string; description: string; priority?: string }) {
  return request('/investigations', { method: 'POST', body: JSON.stringify(data) });
}

export function listInvestigationExecutions(investigationId: string) {
  return request(`/investigations/${investigationId}/executions`);
}

/** 读取某次调查执行的 journal（调查时间线：发现/总结/消息等） */
export function getExecutionJournal(
  executionId: string,
  params?: { recordType?: string; order?: string; nextToken?: string }
) {
  return getJournal(executionId, params);
}

// ============================================================
// Chat（对话）—— 与 Investigation 完全独立。
// createChat 返回的 executionId 即代表「一个会话」。
// ============================================================

export function listChats() {
  return request('/chats');
}

export function createChat() {
  return request<{ executionId: string }>('/chat', { method: 'POST' });
}

export function sendMessage(executionId: string, message: string) {
  return request<{ text: string; title?: string; usage?: TokenUsage }>(
    `/chat/${executionId}/message`,
    { method: 'POST', body: JSON.stringify({ message }) }
  );
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

/**
 * 后端 SSE 事件（对应 server/routes.js 的 /message/stream）
 * delta / block 只包含用户可见正文；后端已按 block type 过滤掉
 * context_usage(内部遥测) 和 final_response(与正文重复)。
 */
export type ChatStreamEvent =
  | { event: 'delta'; data: { index: number; text: string } }
  | { event: 'block'; data: { index: number; text: string } }
  | { event: 'title'; data: { title: string } }
  | { event: 'tool'; data: { note: string } }
  | { event: 'summary'; data: { content: string } }
  | { event: 'complete'; data: { text: string; usage?: TokenUsage } }
  | { event: 'error'; data: { message: string } };

/**
 * 流式发消息。用 fetch + ReadableStream 而不是 EventSource，原因：
 * EventSource 只支持 GET 且不能带自定义 header / body，这里要 POST 消息体。
 *
 * onEvent 会随事件到达被逐个调用。返回 abort 函数用于中断（切会话/卸载时调用）。
 * 流断了不影响正确性 —— journal 才是消息历史的真相源，前端照常轮询兜底。
 */
export function sendMessageStream(
  executionId: string,
  message: string,
  onEvent: (e: ChatStreamEvent) => void
): { done: Promise<void>; abort: () => void } {
  const controller = new AbortController();

  const done = (async () => {
    const res = await fetch(`${BASE_URL}/chat/${executionId}/message/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `流式请求失败 (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    // 关键：currentEvent / currentData 必须在 while 之外声明。
    // 单个 SSE 事件可能被 TCP 分块切开，跨 chunk 时状态要保留，
    // 否则事件在边界处被静默丢弃。
    let currentEvent = '';
    let currentData = '';

    try {
      for (;;) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 最后一行可能不完整，留在 buffer

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
          } else if (line === '' && currentEvent && currentData) {
            try {
              onEvent({ event: currentEvent, data: JSON.parse(currentData) } as ChatStreamEvent);
            } catch {
              console.warn('SSE 事件解析失败:', currentEvent, currentData);
            }
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } finally {
      reader.cancel().catch(() => {});
    }
  })();

  return { done, abort: () => controller.abort() };
}

/** 读取某个对话会话的消息历史（底层与调查 journal 同一接口，语义不同） */
export function getChatMessages(
  executionId: string,
  params?: { recordType?: string; order?: string; nextToken?: string }
) {
  return getJournal(executionId, params);
}

// ============================================================
// 通用底层：journal 记录读取
// 后端 GET /executions/:executionId/journal 既服务于调查执行，也服务于对话会话。
// 上层请用 getExecutionJournal / getChatMessages 表达各自语义，不要直接调它。
// ============================================================

function getJournal(
  executionId: string,
  params?: { recordType?: string; order?: string; nextToken?: string }
) {
  const qs = new URLSearchParams();
  if (params?.recordType) qs.set('recordType', params.recordType);
  if (params?.order) qs.set('order', params.order);
  if (params?.nextToken) qs.set('nextToken', params.nextToken);
  const query = qs.toString();
  return request(`/executions/${executionId}/journal${query ? `?${query}` : ''}`);
}

// ============================================================
// Recommendations（推荐建议）
// ============================================================

export function listRecommendations(body?: Record<string, unknown>) {
  return request('/recommendations/list', { method: 'POST', body: JSON.stringify(body || {}) });
}

export function getRecommendation(recommendationId: string) {
  return request(`/recommendations/${recommendationId}`);
}

// ============================================================
// Topology（拓扑）
// ============================================================

export function listAssociations() {
  return request('/topology/associations');
}

export function listServices() {
  return request('/topology/services');
}

// ============================================================
// Goals（目标）—— 用于 Artifacts 页
// ============================================================

export function listGoals(body?: Record<string, unknown>) {
  return request('/goals/list', { method: 'POST', body: JSON.stringify(body || {}) });
}

// ============================================================
// Changes（变更）
// ============================================================

export function listChanges(body?: Record<string, unknown>) {
  return request('/changes/list', { method: 'POST', body: JSON.stringify(body || {}) });
}

// ============================================================
// 其它
// ============================================================

export function getConfig() {
  return request<{ agentSpaceId: string; region: string; profile: string }>('/config');
}

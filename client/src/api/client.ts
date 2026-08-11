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
  return request(`/chat/${executionId}/message`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
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

// ============================================================
// Health（健康检查）
// ============================================================

export interface HealthResponse {
  status: 'ok' | 'degraded';
  aws_credentials: boolean;
  agent_space_id_configured: boolean;
  uptime_seconds: number;
  version: string;
}

export function getHealth() {
  return request<HealthResponse>('/health');
}

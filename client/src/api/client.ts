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

export function listTasks(body?: Record<string, unknown>) {
  return request('/tasks/list', { method: 'POST', body: JSON.stringify(body || {}) });
}

export function getTask(taskId: string) {
  return request(`/tasks/${taskId}`);
}

export function createTask(data: { title?: string; description: string; priority?: string }) {
  return request('/tasks', { method: 'POST', body: JSON.stringify(data) });
}

export function listExecutions(taskId: string) {
  return request(`/tasks/${taskId}/executions`);
}

export function listJournalRecords(executionId: string, params?: { recordType?: string; order?: string; nextToken?: string }) {
  const qs = new URLSearchParams();
  if (params?.recordType) qs.set('recordType', params.recordType);
  if (params?.order) qs.set('order', params.order);
  if (params?.nextToken) qs.set('nextToken', params.nextToken);
  const query = qs.toString();
  return request(`/executions/${executionId}/journal${query ? `?${query}` : ''}`);
}

export function listRecommendations(body?: Record<string, unknown>) {
  return request('/recommendations/list', { method: 'POST', body: JSON.stringify(body || {}) });
}

export function getRecommendation(recommendationId: string) {
  return request(`/recommendations/${recommendationId}`);
}

export function getConfig() {
  return request<{ agentSpaceId: string; region: string; profile: string }>('/config');
}

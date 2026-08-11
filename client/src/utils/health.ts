import type { HealthResponse } from '../api/client';

// 健康指示的三态推导——纯函数，与 UI 解耦，便于在 node 环境下直接测试。
//   - green  正常          ：请求成功且后端 status === 'ok'
//   - yellow 降级          ：请求成功但后端 status === 'degraded'（如凭证未加载）
//   - red    无法连接后端  ：请求失败（isError 或无数据）
export type HealthState = 'green' | 'yellow' | 'red';

export interface HealthIndicator {
  state: HealthState;
  /** antd Badge status / Tag color 可直接用的颜色语义 */
  color: 'success' | 'warning' | 'error';
  label: string;
}

const INDICATORS: Record<HealthState, HealthIndicator> = {
  green: { state: 'green', color: 'success', label: '正常' },
  yellow: { state: 'yellow', color: 'warning', label: '降级' },
  red: { state: 'red', color: 'error', label: '无法连接后端' },
};

/**
 * 根据 react-query 的取数结果推导健康指示三态。
 * @param data     /api/health 返回体（成功时）
 * @param isError  请求是否失败（网络错误 / 非 2xx）
 */
export function deriveHealthIndicator(
  data: HealthResponse | undefined,
  isError: boolean
): HealthIndicator {
  if (isError || !data) return INDICATORS.red;
  if (data.status === 'degraded') return INDICATORS.yellow;
  return INDICATORS.green;
}

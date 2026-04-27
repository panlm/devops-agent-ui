export const statusMap: Record<string, { label: string; color: string }> = {
  PENDING_TRIAGE: { label: '待分类', color: 'default' },
  LINKED: { label: '已关联', color: 'blue' },
  PENDING_START: { label: '待开始', color: 'orange' },
  IN_PROGRESS: { label: '进行中', color: 'processing' },
  PENDING_CUSTOMER_APPROVAL: { label: '待审批', color: 'warning' },
  COMPLETED: { label: '已完成', color: 'success' },
  FAILED: { label: '失败', color: 'error' },
  TIMED_OUT: { label: '已超时', color: 'error' },
  CANCELLED: { label: '已取消', color: 'default' },
  PROPOSED: { label: '已建议', color: 'blue' },
  ACCEPTED: { label: '已接受', color: 'success' },
  REJECTED: { label: '已拒绝', color: 'error' },
  UPDATE_IN_PROGRESS: { label: '更新中', color: 'processing' },
};

export const priorityMap: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: '紧急', color: 'red' },
  HIGH: { label: '高', color: 'orange' },
  MEDIUM: { label: '中', color: 'blue' },
  LOW: { label: '低', color: 'green' },
  MINIMAL: { label: '最低', color: 'default' },
};

export const taskTypeMap: Record<string, string> = {
  INVESTIGATION: '调查',
  EVALUATION: '评估',
};

export function getStatus(status: string) {
  return statusMap[status] || { label: status, color: 'default' };
}

export function getPriority(priority: string) {
  return priorityMap[priority] || { label: priority, color: 'default' };
}

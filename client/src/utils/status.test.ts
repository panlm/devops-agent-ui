import { describe, it, expect } from 'vitest'
import { getStatus, getPriority, statusMap, priorityMap } from './status'

describe('getStatus', () => {
  it('已知状态返回对应的中文标签与颜色', () => {
    expect(getStatus('IN_PROGRESS')).toEqual({ label: '进行中', color: 'processing' })
    expect(getStatus('COMPLETED')).toEqual({ label: '已完成', color: 'success' })
  })

  it('STOPPED 与 COMPLETED 都映射为「已完成」', () => {
    expect(getStatus('STOPPED').label).toBe('已完成')
    expect(getStatus('COMPLETED').label).toBe('已完成')
  })

  it('未知状态回退：label 原样返回，color 为 default', () => {
    expect(getStatus('SOMETHING_NEW')).toEqual({ label: 'SOMETHING_NEW', color: 'default' })
  })

  it('每个已定义状态都能被 getStatus 命中（不走回退）', () => {
    for (const key of Object.keys(statusMap)) {
      expect(getStatus(key)).toBe(statusMap[key])
    }
  })
})

describe('getPriority', () => {
  it('已知优先级返回对应标签与颜色', () => {
    expect(getPriority('CRITICAL')).toEqual({ label: '紧急', color: 'red' })
    expect(getPriority('LOW')).toEqual({ label: '低', color: 'green' })
  })

  it('未知优先级回退：label 原样返回，color 为 default', () => {
    expect(getPriority('WEIRD')).toEqual({ label: 'WEIRD', color: 'default' })
  })

  it('每个已定义优先级都能被 getPriority 命中', () => {
    for (const key of Object.keys(priorityMap)) {
      expect(getPriority(key)).toBe(priorityMap[key])
    }
  })
})

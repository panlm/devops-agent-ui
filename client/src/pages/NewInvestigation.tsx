import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, Input, Button, Typography, Space, Select, message } from 'antd';
import { SendOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createInvestigation } from '../api/client';

const { Title, Text } = Typography;
const { TextArea } = Input;

const HISTORY_KEY = 'devops-agent-prompt-history';
const MAX_HISTORY = 20;

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(list: string[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
}

interface ChatMessage {
  role: 'user' | 'system';
  content: string;
  taskId?: string;
}

export default function NewInvestigation() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [history, setHistory] = useState<string[]>(loadHistory);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content: '你好！请描述你要调查的问题，我会帮你创建一个新的调查任务。',
    },
  ]);

  const mutation = useMutation({
    mutationFn: (data: { description: string; priority: string }) =>
      createInvestigation({ description: data.description, priority: data.priority }) as Promise<any>,
    onSuccess: (result) => {
      const taskId = result.task?.taskId || result.taskId;
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: `调查已创建！任务 ID: ${taskId}\n\n点击下方按钮查看调查详情。`,
          taskId,
        },
      ]);
      message.success('调查已创建');
    },
    onError: (err: Error) => {
      setMessages((prev) => [
        ...prev,
        { role: 'system', content: `创建失败: ${err.message}` },
      ]);
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;
    const desc = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: desc }]);
    setInput('');
    const updated = [desc, ...history.filter((h) => h !== desc)].slice(0, MAX_HISTORY);
    setHistory(updated);
    saveHistory(updated);
    mutation.mutate({ description: desc, priority });
  };

  const handleDeleteHistory = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter((_, i) => i !== idx);
    setHistory(updated);
    saveHistory(updated);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Title level={3}>新建调查</Title>
      <Card
        style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
          {/* System greeting */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{ maxWidth: '80%', padding: '10px 16px', borderRadius: 12, background: '#f0f0f0', color: '#000', whiteSpace: 'pre-wrap' }}>
              {messages[0].content}
            </div>
          </div>

          {/* History prompts */}
          {history.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>
                历史提示词:
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...history].reverse().map((h, i) => (
                  <div
                    key={i}
                    onClick={() => setInput(h)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid #e8e8e8',
                      cursor: 'pointer',
                      background: '#fafafa',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e6f4ff';
                      e.currentTarget.style.borderColor = '#91caff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fafafa';
                      e.currentTarget.style.borderColor = '#e8e8e8';
                    }}
                  >
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(0,0,0,0.88)' }}>
                      {h}
                    </div>
                    <DeleteOutlined
                      style={{ color: '#bfbfbf', fontSize: 12, flexShrink: 0 }}
                      onClick={(e) => handleDeleteHistory(history.length - 1 - i, e)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat messages (skip first system greeting) */}
          {messages.slice(1).map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  maxWidth: '80%',
                  padding: '10px 16px',
                  borderRadius: 12,
                  background: msg.role === 'user' ? '#1677ff' : '#f0f0f0',
                  color: msg.role === 'user' ? '#fff' : '#000',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
                {msg.taskId && (
                  <div style={{ marginTop: 8 }}>
                    <Button
                      type="primary"
                      size="small"
                      ghost={msg.role !== 'user'}
                      onClick={() => navigate(`/tasks/${msg.taskId}`)}
                    >
                      查看调查详情
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {mutation.isPending && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{ padding: '10px 16px', borderRadius: 12, background: '#f0f0f0' }}>
                <Text type="secondary">正在创建调查...</Text>
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <Select
            value={priority}
            onChange={setPriority}
            style={{ width: 100 }}
            options={[
              { value: 'CRITICAL', label: '紧急' },
              { value: 'HIGH', label: '高' },
              { value: 'MEDIUM', label: '中' },
              { value: 'LOW', label: '低' },
            ]}
          />
          <TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="描述你要调查的问题..."
            autoSize={{ minRows: 1, maxRows: 4 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            style={{ flex: 1 }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={mutation.isPending}
            disabled={!input.trim()}
          >
            发送
          </Button>
        </div>
      </Card>
    </Space>
  );
}

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, Input, Button, Typography, Space, Alert, Select, message } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createTask } from '../api/client';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ChatMessage {
  role: 'user' | 'system';
  content: string;
  taskId?: string;
}

export default function NewInvestigation() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content: '你好！请描述你要调查的问题，我会帮你创建一个新的调查任务。\n\n例如: "帮我查一下东京区域 i-07a97aa2582de1825 这台 EC2 过去一个月都有哪些操作"',
    },
  ]);

  const mutation = useMutation({
    mutationFn: (data: { description: string; priority: string }) =>
      createTask({ description: data.description, priority: data.priority }) as Promise<any>,
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
    mutation.mutate({ description: desc, priority });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Title level={3}>新建调查</Title>
      <Card
        style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16 }}>
          {messages.map((msg, i) => (
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

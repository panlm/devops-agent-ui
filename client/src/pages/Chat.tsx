import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Input, Button, Typography, Space, Spin, List, Empty, Tooltip } from 'antd';
import { SendOutlined, PlusOutlined, MessageOutlined, ReloadOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import dayjs from 'dayjs';
import { createChat, sendMessage, getChatMessages, listChats } from '../api/client';

marked.setOptions({ breaks: true, gfm: true });

const { Title, Text } = Typography;
const { TextArea } = Input;

const CHAT_SESSION_KEY = 'devops-agent-chat-session';

interface DisplayMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  time?: string;
}

interface ChatSession {
  executionId: string;
  summary?: string;
  createdAt?: string;
  updatedAt?: string;
}

function Md({ children }: { children: string }) {
  const raw = marked.parse(children || '') as string;
  const html = DOMPurify.sanitize(raw);
  return <div className="md-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function Chat() {
  const [executionId, setExecutionId] = useState<string | null>(() => {
    return localStorage.getItem(CHAT_SESSION_KEY);
  });
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentAtRef = useRef<number>(0);
  const lastScrolledSessionRef = useRef<string | null>(null);

  // 会话清单
  const {
    data: chatsData,
    refetch: refetchChats,
    isFetching: chatsLoading,
  } = useQuery({
    queryKey: ['chats'],
    queryFn: () => listChats() as Promise<{ executions?: ChatSession[] }>,
    refetchInterval: sending ? 5000 : false,
  });

  const sessions: ChatSession[] = (chatsData?.executions || [])
    .slice()
    .sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));

  // Poll journal records for current execution
  const { data: journalData, refetch: refetchJournal } = useQuery({
    queryKey: ['chat-messages', executionId],
    queryFn: () => getChatMessages(executionId!, { order: 'ASC' }) as Promise<any>,
    enabled: !!executionId,
    refetchInterval: sending ? 3000 : false,
  });

  // Parse journal records into display messages
  useEffect(() => {
    if (!journalData?.records) return;
    const msgs: DisplayMessage[] = [];
    for (const record of journalData.records) {
      if (record.recordType !== 'message' && record.recordType !== 'final_response') continue;
      let parsed: any;
      try {
        parsed = JSON.parse(record.content);
      } catch {
        continue;
      }
      const role = parsed.role || 'system';
      const texts: string[] = [];
      if (parsed.content && Array.isArray(parsed.content)) {
        for (const c of parsed.content) {
          if (c.type === 'text' && c.text) texts.push(c.text);
        }
      } else if (typeof parsed.text === 'string') {
        texts.push(parsed.text);
      }
      if (texts.length === 0) continue;
      // Skip duplicate final_response if same content as last assistant message
      if (record.recordType === 'final_response' && msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        if (last.role === 'assistant' && last.content === texts.join('\n\n')) continue;
      }
      msgs.push({
        role: role === 'assistant' ? 'assistant' : 'user',
        content: texts.join('\n\n'),
        time: record.createdAt,
      });
    }
    setMessages(msgs);
  }, [journalData]);

  // 滚动到底部：切换会话首次加载时瞬间定位到最后一条（无动画，不再从头滚），
  // 同一会话内来新消息时才平滑滚动。
  useEffect(() => {
    if (messages.length === 0) return;
    const isNewSession = lastScrolledSessionRef.current !== executionId;
    if (isNewSession) {
      lastScrolledSessionRef.current = executionId;
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending, executionId]);

  // Stop polling: wait at least 5s, then check if last record is final_response.
  // After stopping, do one final refetch to ensure we have the complete response.
  useEffect(() => {
    if (!sending || !journalData?.records) return;
    const elapsed = Date.now() - sentAtRef.current;
    if (elapsed < 5000) return;
    const records = journalData.records;
    const last = records[records.length - 1];
    if (!last) return;
    if (last.recordType === 'final_response') {
      // One final refetch then stop
      setTimeout(() => {
        refetchJournal();
        setSending(false);
        refetchChats(); // 刷新清单（新会话发首条消息后会出现 + 标题更新）
      }, 1000);
    }
  }, [journalData, sending, refetchJournal, refetchChats]);

  const selectSession = (eid: string) => {
    if (eid === executionId) return;
    setMessages([]);
    setExecutionId(eid);
    localStorage.setItem(CHAT_SESSION_KEY, eid);
  };

  const handleNewChat = async () => {
    try {
      const result = (await createChat()) as any;
      setExecutionId(result.executionId);
      localStorage.setItem(CHAT_SESSION_KEY, result.executionId);
      setMessages([]);
    } catch (err: any) {
      setMessages([{ role: 'system', content: `创建对话失败: ${err.message}` }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');

    // Create chat session if none
    let eid = executionId;
    if (!eid) {
      try {
        const result = (await createChat()) as any;
        eid = result.executionId;
        setExecutionId(eid);
        localStorage.setItem(CHAT_SESSION_KEY, eid!);
      } catch (err: any) {
        setMessages((prev) => [...prev, { role: 'system', content: `创建对话失败: ${err.message}` }]);
        return;
      }
    }

    // Optimistically show user message
    setMessages((prev) => [...prev, { role: 'user', content: text, time: new Date().toISOString() }]);
    sentAtRef.current = Date.now();
    setSending(true);

    try {
      await sendMessage(eid!, text);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'system', content: `发送失败: ${err.message}` }]);
      setSending(false);
    }
  };

  const hasConversation = messages.length > 0;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={3} style={{ margin: 0 }}>运维对话</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleNewChat}>新对话</Button>
      </div>

      <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 200px)' }}>
        {/* 左侧：会话清单 */}
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span><MessageOutlined /> 会话列表</span>
              <Tooltip title="刷新列表">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined spin={chatsLoading} />}
                  onClick={() => refetchChats()}
                />
              </Tooltip>
            </div>
          }
          style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, overflowY: 'auto', padding: 0 } }}
        >
          {sessions.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={chatsLoading ? '加载中...' : '暂无会话'}
              style={{ marginTop: 40 }}
            />
          ) : (
            <List
              size="small"
              dataSource={sessions}
              renderItem={(s) => {
                const active = s.executionId === executionId;
                return (
                  <List.Item
                    onClick={() => selectSession(s.executionId)}
                    style={{
                      cursor: 'pointer',
                      padding: '10px 16px',
                      background: active ? '#e6f4ff' : undefined,
                      borderLeft: active ? '3px solid #1677ff' : '3px solid transparent',
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      <div
                        style={{
                          fontWeight: active ? 600 : 400,
                          color: active ? '#1677ff' : 'rgba(0,0,0,0.88)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.summary || '(未命名会话)'}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {dayjs(s.updatedAt || s.createdAt).format('MM-DD HH:mm')}
                      </Text>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </Card>

        {/* 右侧：对话区 */}
        <Card
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
        >
          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, paddingRight: 16 }}>
            {/* Welcome */}
            {!hasConversation && !executionId && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                <div style={{ maxWidth: '80%', padding: '10px 16px', borderRadius: 12, background: '#f0f0f0', color: '#000', whiteSpace: 'pre-wrap' }}>
                  你好！这里是运维对话，可以自由提问，Agent 会帮你查询和处理。左侧可切换历史会话。
                </div>
              </div>
            )}
            {!hasConversation && executionId && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                <Spin /> <Text type="secondary" style={{ marginLeft: 8 }}>加载会话内容...</Text>
              </div>
            )}

            {/* Messages */}
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
                    background: msg.role === 'user' ? '#1677ff' : msg.role === 'system' ? '#fff2e8' : '#f0f0f0',
                    color: msg.role === 'user' ? '#fff' : '#000',
                  }}
                >
                  {msg.role === 'user' ? (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  ) : (
                    <Md>{msg.content}</Md>
                  )}
                  {msg.time && (
                    <div style={{ textAlign: 'right', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.35)' }}>
                        {dayjs(msg.time).format('HH:mm:ss')}
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {sending && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                <div style={{ padding: '10px 16px', borderRadius: 12, background: '#f0f0f0' }}>
                  <Spin size="small" /> <Text type="secondary" style={{ marginLeft: 8 }}>Agent 思考中...</Text>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的问题..."
              autoSize={{ minRows: 1, maxRows: 4 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{ flex: 1 }}
              disabled={sending}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={sending}
              disabled={!input.trim() || sending}
            >
              发送
            </Button>
          </div>
        </Card>
      </div>
    </Space>
  );
}

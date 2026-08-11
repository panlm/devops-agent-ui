import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Input, Button, Typography, Space, Spin, List, Empty, Tooltip } from 'antd';
import { SendOutlined, PlusOutlined, MessageOutlined, ReloadOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import dayjs from 'dayjs';
import { createChat, sendMessageStream, getChatMessages, listChats } from '../api/client';

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
  // 流式增量文本。非空时渲染成一个临时的 assistant 气泡；
  // journal 轮询把正式消息取回来后清空，避免与正式消息重复显示。
  const [streamingText, setStreamingText] = useState('');
  // 工具调用进度提示。Agent 调工具时事件流会静默数十秒，用它避免看起来像卡死。
  const [toolNote, setToolNote] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentAtRef = useRef<number>(0);
  const lastScrolledSessionRef = useRef<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  // 卸载或切会话时中断在途的流
  useEffect(() => {
    return () => {
      abortRef.current?.();
      abortRef.current = null;
    };
  }, [executionId]);

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
    if (messages.length === 0 && !streamingText) return;
    const isNewSession = lastScrolledSessionRef.current !== executionId;
    if (isNewSession) {
      lastScrolledSessionRef.current = executionId;
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      // 流式增量期间用 auto，避免每个 chunk 都触发一次平滑动画导致抖动
      bottomRef.current?.scrollIntoView({ behavior: streamingText ? 'auto' : 'smooth' });
    }
  }, [messages, sending, executionId, streamingText]);

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
    setStreamingText('');
    setToolNote('');

    // 逐块累积：每个 index 的 delta 各自拼接，再按 index 顺序合并。
    // 服务端已按 block 顺序推送，这里用 Map 保证乱序到达也能正确归位。
    const chunksByIndex = new Map<number, string[]>();
    const render = () =>
      setStreamingText(
        [...chunksByIndex.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, parts]) => parts.join(''))
          .join('\n')
      );

    const { done, abort } = sendMessageStream(eid!, text, (e) => {
      if (e.event === 'delta') {
        const arr = chunksByIndex.get(e.data.index) || [];
        arr.push(e.data.text);
        chunksByIndex.set(e.data.index, arr);
        render();
      } else if (e.event === 'block') {
        // block 事件带该块最终文本，用它覆盖累积值（stop.text 可能比 delta 更完整）
        chunksByIndex.set(e.data.index, [e.data.text]);
        render();
      } else if (e.event === 'title') {
        // Agent 生成了会话标题，立刻刷新左侧列表（不必等轮询）
        refetchChats();
      } else if (e.event === 'tool') {
        // Agent 在调工具，期间流会静默数十秒，显示动作让用户知道没卡死
        setToolNote(e.data.note);
      } else if (e.event === 'error') {
        setMessages((prev) => [...prev, { role: 'system', content: `响应失败: ${e.data.message}` }]);
      }
      // complete 不在这里收尾：交给 journal 轮询取正式消息，
      // 保证刷新页面后看到的内容与流式期间一致。
    });
    abortRef.current = abort;

    try {
      await done;
      // 流结束后立刻拉一次 journal，正式消息落地后清掉临时气泡
      await refetchJournal();
      setStreamingText('');
      setToolNote('');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => [...prev, { role: 'system', content: `发送失败: ${err.message}` }]);
      }
      setStreamingText('');
      setToolNote('');
      setSending(false);
    } finally {
      abortRef.current = null;
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
          classNames={{ body: 'custom-scroll' }}
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
          <div className="custom-scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, paddingRight: 16 }}>
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
                    minWidth: 0,
                    overflow: 'hidden',
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

            {/* 流式输出中的临时气泡 */}
            {streamingText && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                <div
                  style={{
                    maxWidth: '80%',
                    minWidth: 0,
                    overflow: 'hidden',
                    padding: '10px 16px',
                    borderRadius: 12,
                    background: '#f0f0f0',
                    color: '#000',
                  }}
                >
                  <Md>{streamingText}</Md>
                  <span className="stream-caret" />
                </div>
              </div>
            )}

            {/* 进度提示：调工具时显示动作，否则显示思考中。
                正文已开始流出且无工具动作时不显示，避免与正文气泡叠加。 */}
            {sending && (toolNote || !streamingText) && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                <div style={{ padding: '10px 16px', borderRadius: 12, background: '#f0f0f0' }}>
                  <Spin size="small" />
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {toolNote || 'Agent 思考中...'}
                  </Text>
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

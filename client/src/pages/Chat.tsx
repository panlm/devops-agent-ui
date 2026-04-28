import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Input, Button, Typography, Space, Spin } from 'antd';
import { SendOutlined, PlusOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import dayjs from 'dayjs';
import { createChat, sendMessage, listJournalRecords } from '../api/client';

marked.setOptions({ breaks: true, gfm: true });

const { Title, Text } = Typography;
const { TextArea } = Input;

const CHAT_SESSION_KEY = 'devops-agent-chat-session';

interface DisplayMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  time?: string;
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

  // Poll journal records for current execution
  const { data: journalData, refetch: refetchJournal } = useQuery({
    queryKey: ['journal', executionId],
    queryFn: () => listJournalRecords(executionId!, { order: 'ASC' }) as Promise<any>,
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

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

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
      }, 1000);
    }
  }, [journalData, sending, refetchJournal]);

  const handleNewChat = async () => {
    try {
      const result = await createChat() as any;
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
        const result = await createChat() as any;
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
        <Button icon={<PlusOutlined />} onClick={handleNewChat}>新对话</Button>
      </div>
      <Card
        style={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
      >
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 16, paddingRight: 16 }}>
          {/* Welcome */}
          {!hasConversation && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{ maxWidth: '80%', padding: '10px 16px', borderRadius: 12, background: '#f0f0f0', color: '#000', whiteSpace: 'pre-wrap' }}>
                你好！这里是运维对话，可以自由提问，Agent 会帮你查询和处理。
              </div>
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
    </Space>
  );
}

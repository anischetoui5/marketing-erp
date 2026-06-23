'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BotMessageSquare, Send, Loader2, Trash2, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { sendMessage, type ChatMessage } from '@/lib/chatbot';

/* ── Markdown-lite renderer (bold + line breaks only) ─────────────────────── */
function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

/* ── Message bubble ───────────────────────────────────────────────────────── */
function Bubble({ msg, isLatest }: { msg: ChatMessage; isLatest: boolean }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 12 }}
    >
      {!isUser && (
        <div style={{ height: 28, width: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #4E5ABF, #7B6CF0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8, marginTop: 2, boxShadow: '0 0 10px rgba(123,108,240,0.35)' }}>
          <Sparkles size={12} style={{ color: '#fff' }} />
        </div>
      )}

      <div
        style={{
          maxWidth: '72%',
          padding: '10px 14px',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          background: isUser
            ? 'linear-gradient(135deg, #4E5ABF, #7B6CF0)'
            : 'var(--surface)',
          border: isUser ? 'none' : '1px solid var(--border)',
          boxShadow: isUser ? '0 2px 12px rgba(78,90,191,0.3)' : 'none',
        }}
      >
        <p
          style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, lineHeight: 1.65, color: isUser ? '#fff' : 'var(--text)', margin: 0, wordBreak: 'break-word' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
        />
        {!isUser && isLatest && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <Sparkles size={9} style={{ color: '#7B6CF0' }} />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em' }}>Claude</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Typing indicator ─────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ height: 28, width: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #4E5ABF, #7B6CF0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 10px rgba(123,108,240,0.35)' }}>
        <Sparkles size={12} style={{ color: '#fff' }} />
      </div>
      <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', gap: 5, alignItems: 'center' }}>
        {[0, 1, 2].map((i) => (
          <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: '#7B6CF0' }} />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Suggested prompts ────────────────────────────────────────────────────── */
const SUGGESTIONS = [
  "What's the current status of my projects?",
  "Which tasks are overdue right now?",
  "What should I prioritise today?",
  "Summarise what's waiting for review",
];

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput('');
    setError(null);

    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setLoading(true);

    try {
      const { reply } = await sendMessage(next);
      setMessages([...next, { role: 'assistant', content: reply }]);
    } catch {
      setError('Something went wrong. Please try again.');
      setMessages(next.slice(0, -1));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const clearChat = () => { if (confirm('Clear this conversation?')) setMessages([]); };

  const empty = messages.length === 0;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', height: 'calc(100vh - 112px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ height: 36, width: 36, borderRadius: 10, background: 'linear-gradient(135deg, #4E5ABF, #7B6CF0)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(123,108,240,0.4)' }}>
            <BotMessageSquare size={17} style={{ color: '#fff' }} />
          </div>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>AI Assistant</h2>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', margin: 0, letterSpacing: '0.08em' }}>Powered by Claude · Knows your workspace</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button onClick={clearChat}
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', background: 'none', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", fontSize: 10 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = '#fb7185'; (e.currentTarget as HTMLElement).style.color = '#fb7185'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}>
            <Trash2 size={11} /> Clear
          </button>
        )}
      </motion.div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 2px 8px', minHeight: 0 }}>

        {/* Empty state */}
        {empty && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.35 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 24, textAlign: 'center', paddingBottom: 40 }}>
            <div>
              <div style={{ height: 60, width: 60, borderRadius: 18, background: 'linear-gradient(135deg, #4E5ABF, #7B6CF0)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 0 30px rgba(123,108,240,0.3)' }}>
                <BotMessageSquare size={26} style={{ color: '#fff' }} />
              </div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: '0 0 6px' }}>
                Hey {user?.fullName?.split(' ')[0] ?? 'there'} 👋
              </h3>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'var(--text-2)', margin: 0, lineHeight: 1.6 }}>
                I know your projects, tasks, and deadlines.<br />Ask me anything about your workspace.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 480 }}>
              {SUGGESTIONS.map((s) => (
                <motion.button key={s} onClick={() => handleSend(s)} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-2)', lineHeight: 1.4 }}>
                  {s}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <Bubble key={i} msg={msg} isLatest={i === messages.length - 1 && msg.role === 'assistant'} />
        ))}

        <AnimatePresence>{loading && <TypingIndicator />}</AnimatePresence>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#fb7185', textAlign: 'center', margin: '8px 0' }}>
            {error}
          </motion.p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}
        style={{ flexShrink: 0, paddingTop: 12 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', boxShadow: loading ? '0 0 0 1px #7B6CF040' : 'none', transition: 'box-shadow 0.2s' }}
          onFocus={() => {}} >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your projects, tasks, deadlines…  (Enter to send)"
            rows={1}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'var(--text)', lineHeight: 1.6, maxHeight: 120, overflowY: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            style={{ height: 34, width: 34, borderRadius: 9, background: input.trim() && !loading ? 'linear-gradient(135deg, #4E5ABF, #7B6CF0)' : 'var(--border)', border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s', boxShadow: input.trim() && !loading ? '0 2px 10px rgba(123,108,240,0.35)' : 'none' }}>
            {loading
              ? <Loader2 size={15} style={{ color: '#7B6CF0', animation: 'spin 1s linear infinite' }} />
              : <Send size={14} style={{ color: input.trim() ? '#fff' : 'var(--text-3)' }} />}
          </button>
        </div>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: 'var(--text-3)', textAlign: 'center', marginTop: 6, letterSpacing: '0.06em' }}>
          Shift+Enter for new line · Context refreshes per message
        </p>
      </motion.div>
    </div>
  );
}

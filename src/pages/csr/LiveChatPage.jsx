import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Send, ExternalLink, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSupportChat } from '../../hooks/useSupportChat';
import { linkifyParts } from '../../utils/linkify';
import '../../components/shared/SupportChatWidget.css';
import './LiveChatPage.css';

function toTime(ms) {
  return ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}
function toRelative(ms) {
  if (!ms) return '';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// CSR's live support-chat queue — every open/closed conversation, real-time
// (Realtime Database, not Firestore — see docs/CRM-Support.md). Split view:
// chat list on the left, active conversation on the right.
export default function LiveChatPage() {
  const { user, userProfile } = useAuth();
  const { sendMessage, subscribeToMessages, subscribeToQueue, closeChat } = useSupportChat();

  const [chats, setChats] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => subscribeToQueue(setChats), [subscribeToQueue]);

  useEffect(() => {
    if (!selectedId) return;
    setMessages([]);
    return subscribeToMessages(selectedId, setMessages);
  }, [selectedId, subscribeToMessages]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const selected = chats.find(c => c.id === selectedId) || null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !selectedId) return;
    setSending(true);
    try {
      await sendMessage({
        chatId: selectedId,
        senderId: user.uid,
        senderRole: 'csr',
        senderName: userProfile?.displayName || user.email,
        text,
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="livechat-shell">
      <div className="livechat-list">
        <div className="livechat-list-header">
          <h1 style={{ fontSize: '1.1rem', margin: 0 }}>Live Chat</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0.2rem 0 0' }}>{chats.length} conversation{chats.length === 1 ? '' : 's'}</p>
        </div>
        {chats.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <MessageCircle size={28} />
            <p style={{ fontSize: '0.85rem' }}>No conversations yet.</p>
          </div>
        ) : (
          chats.map(c => (
            <button
              key={c.id}
              className={`livechat-list-item ${selectedId === c.id ? 'active' : ''}`}
              onClick={() => setSelectedId(c.id)}
            >
              <div className="livechat-list-item-top">
                <span className="livechat-list-name">{c.subjectName || 'Unknown'}</span>
                <span className={`badge badge-${c.status === 'open' ? 'pending' : 'confirmed'}`} style={{ fontSize: '0.65rem' }}>{c.status}</span>
              </div>
              <p className="livechat-list-preview">
                {c.lastSenderRole === 'csr' ? 'You: ' : ''}{c.lastMessagePreview || '—'}
              </p>
              <span className="livechat-list-time">{toRelative(c.lastMessageAt)} · {c.subjectType}</span>
            </button>
          ))
        )}
      </div>

      <div className="livechat-conversation">
        {!selected ? (
          <div className="empty-state" style={{ margin: 'auto' }}>
            <MessageCircle size={32} />
            <p>Pick a conversation to start replying.</p>
          </div>
        ) : (
          <>
            <div className="livechat-conv-header">
              <div>
                <p style={{ fontWeight: 600 }}>{selected.subjectName}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selected.subjectEmail}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link
                  to={`/qufreecrm/subject/user/${selected.subjectId}`}
                  className="btn btn-ghost btn-sm"
                  title="Open full profile"
                >
                  <ExternalLink size={13} /> Profile
                </Link>
                {selected.status === 'open' && (
                  <button className="btn btn-ghost btn-sm" onClick={() => closeChat(selected.id)}>Close chat</button>
                )}
              </div>
            </div>

            <div className="livechat-conv-messages" ref={listRef}>
              {messages.map(m => (
                <div key={m.id} className={`chat-bubble ${m.senderRole === 'csr' ? 'from-me' : 'from-support'}`}>
                  <p className="chat-bubble-text">
                    {linkifyParts(m.text).map((part, i) =>
                      part.type === 'link' ? (
                        <a key={i} href={part.href} target="_blank" rel="noopener noreferrer" className="chat-bubble-link">{part.value}</a>
                      ) : (
                        <span key={i}>{part.value}</span>
                      )
                    )}
                  </p>
                  <span className="chat-bubble-time">{toTime(m.createdAt)}</span>
                </div>
              ))}
            </div>

            <form className="livechat-input-row" onSubmit={handleSend}>
              <input
                className="form-control"
                placeholder="Type a reply…"
                value={text}
                onChange={e => setText(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" type="submit" disabled={sending || !text.trim()}>
                <Send size={15} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

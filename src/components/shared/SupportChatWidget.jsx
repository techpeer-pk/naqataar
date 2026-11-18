import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSupportChat } from '../../hooks/useSupportChat';
import { useFaqs } from '../../hooks/useFaqs';
import { CHAT_TOGGLE_EVENT } from '../../utils/chatEvents';
import { linkifyParts } from '../../utils/linkify';
import './SupportChatWidget.css';
import { t } from '../../i18n';

function toTime(ms) {
  return ms ? new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}

let localMsgSeq = 0;

// Floating "Chat with Support" widget — visible to everyone (see
// docs/CRM-Support.md); the footer note tells signed-out visitors to log in.
// Mounted globally in App.jsx.
export default function SupportChatWidget({ docked = false }) {
  const { user, userProfile, isCustomer, isAdmin } = useAuth();
  const { ensureChatStarted, sendMessage, subscribeToMessages } = useSupportChat();
  const { faqs, fetchAll: fetchFaqs } = useFaqs();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [localMsgs, setLocalMsgs] = useState([]);
  const [pendingScrollId, setPendingScrollId] = useState(null);
  const [typingFaq, setTypingFaq] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const eligible = user && (isCustomer || isAdmin);

  useEffect(() => {
    if (!open || !eligible) return;
    let unsub = () => {};
    (async () => {
      await ensureChatStarted({
        uid: user.uid,
        subjectType: isAdmin ? 'businessAdmin' : 'customer',
        name: userProfile?.displayName || user.email,
        email: user.email,
      });
      unsub = subscribeToMessages(user.uid, setMessages);
    })();
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eligible]);

  useEffect(() => {
    if (open) fetchFaqs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allMessages = [...messages, ...localMsgs].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  // Real chat messages (yours or CSR's) — jump to the newest, like any chat.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  // FAQ answers can run long — scrolling to the bottom would show only the
  // tail of the answer, hiding the question that gives it context. Scroll
  // the question bubble to the top instead, so it reads start-to-finish.
  useEffect(() => {
    if (!pendingScrollId) return;
    const el = listRef.current?.querySelector(`[data-msg-id="${pendingScrollId}"]`);
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setPendingScrollId(null);
  }, [localMsgs, pendingScrollId]);

  // Cancel any pending "typing…" answer if the widget unmounts mid-delay.
  useEffect(() => () => clearTimeout(typingTimeoutRef.current), []);

  // When docked, BottomNav's "Chat" tab is the trigger instead of our own
  // FAB — it dispatches this event rather than us being handed a prop, so
  // both components stay independent (no lifted state to keep in sync).
  useEffect(() => {
    const handler = () => setOpen(o => !o);
    window.addEventListener(CHAT_TOGGLE_EVENT, handler);
    return () => window.removeEventListener(CHAT_TOGGLE_EVENT, handler);
  }, []);

  // Self-serve FAQ answers — rendered as chat bubbles for a familiar feel,
  // but purely client-side: never sent through sendMessage, so they never
  // touch the real supportChats/{uid} thread a CSR agent later sees. The
  // question appears instantly; the answer lands after a short "typing…"
  // beat so it doesn't feel like a canned instant dump.
  const askFaq = (faq) => {
    const questionId = `local-${++localMsgSeq}`;
    setLocalMsgs(prev => [
      ...prev,
      { id: questionId, senderRole: isAdmin ? 'businessAdmin' : 'customer', text: faq.question, createdAt: Date.now() },
    ]);
    setPendingScrollId(questionId);
    setTypingFaq(faq);

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setLocalMsgs(prev => [...prev, { id: `local-${++localMsgSeq}`, senderRole: 'system', text: faq.answer, createdAt: Date.now() }]);
      setTypingFaq(null);
    }, 2000 + Math.random() * 1000);
  };

  const visibleFaqs = faqs.filter(f => {
    if (f.active === false) return false;
    if (f.audience === 'all' || !f.audience) return true;
    if (isAdmin) return f.audience === 'businessAdmin';
    return f.audience === 'customer';
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !eligible) return;
    setSending(true);
    try {
      await sendMessage({
        chatId: user.uid,
        senderId: user.uid,
        senderRole: isAdmin ? 'businessAdmin' : 'customer',
        senderName: userProfile?.displayName || user.email,
        text,
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {open && (
        <div className={`chat-widget-panel${docked ? ' docked' : ''}`}>
          <div className="chat-widget-header">
            <span>{t('Chat with Support')}</span>
            <button className="chat-widget-close" onClick={() => setOpen(false)} aria-label={t('Close chat')}>
              <X size={18} />
            </button>
          </div>

          <div className="chat-widget-messages" ref={listRef}>
            {allMessages.length === 0 ? (
              /* <p className="chat-widget-empty">Send a message and Qunjee Support will reply here.</p> */
              <p className="chat-widget-empty">{t('Send a message and Naqatar Support will reply here.')}</p>
            ) : (
              allMessages.map(m => (
                <div key={m.id} data-msg-id={m.id} className={`chat-bubble ${m.senderRole === 'csr' || m.senderRole === 'system' ? 'from-support' : 'from-me'}`}>
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
              ))
            )}
            {typingFaq && (
              <div className="chat-bubble from-support chat-bubble-typing">
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
              </div>
            )}
          </div>

          {visibleFaqs.length > 0 && (
            <div className="chat-widget-faq-row">
              {visibleFaqs.map(f => (
                <button key={f.id} type="button" className="chat-widget-faq-pill" onClick={() => askFaq(f)}>
                  {f.question}
                </button>
              ))}
            </div>
          )}

          <form className="chat-widget-input-row" onSubmit={handleSend}>
            <input
              className="form-control"
              placeholder={t('Type a message…')}
              value={text}
              onChange={e => setText(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" type="submit" disabled={sending || !text.trim()} aria-label="Send">
              <Send size={15} />
            </button>
          </form>

          <p className="chat-widget-footer-note">{t('Note: Need to login for this assistance or chat.')}</p>
        </div>
      )}

      {!docked && (
        <button className="chat-widget-fab" onClick={() => setOpen(o => !o)} aria-label={open ? t('Close support chat') : t('Open support chat')}>
          {open ? <X size={22} /> : <MessageCircle size={22} />}
        </button>
      )}
    </>
  );
}

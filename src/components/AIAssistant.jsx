import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, LoaderCircle, MessageSquare, Send, X } from 'lucide-react';

const QUICK_PROMPTS = [
  'How should I improve my profile?',
  'Suggest skills I can add.',
  'Help me plan what to learn next.',
];

export default function AIAssistant({ user }) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'I can help with profile ideas, learning plans, and using SkillSync.',
    },
  ]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  async function sendMessage(text) {
    const trimmed = text.trim();

    if (!trimmed || isSending) {
      return;
    }

    const nextMessages = [
      ...messages,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
      },
    ];

    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      const response = await fetch('/api/assistant-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: location.pathname,
          userName: user?.displayName || user?.email || '',
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to reach the assistant.');
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
        },
      ]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {isOpen && (
        <div className="assistant-widget glass-panel">
          <div className="assistant-header">
            <div>
              <div className="assistant-eyebrow">AI Assistant</div>
              <h3 className="cinema-title assistant-title">SkillSync Copilot</h3>
            </div>
            <button
              type="button"
              className="assistant-icon-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI assistant"
            >
              <X size={18} />
            </button>
          </div>

          <div className="assistant-body">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`assistant-bubble assistant-bubble-${message.role}`}
              >
                {message.content}
              </div>
            ))}

            {isSending && (
              <div className="assistant-bubble assistant-bubble-assistant assistant-loading">
                <LoaderCircle size={14} className="assistant-spinner" />
                Thinking...
              </div>
            )}

            {error && <div className="assistant-error">{error}</div>}
            <div ref={scrollRef} />
          </div>

          <div className="assistant-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="assistant-prompt"
                onClick={() => sendMessage(prompt)}
                disabled={isSending}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            className="assistant-form"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about skills, matches, or planning..."
            />
            <button
              type="submit"
              className="liquid-glass assistant-send"
              disabled={isSending || !input.trim()}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="assistant-launcher"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? 'Hide AI assistant' : 'Show AI assistant'}
      >
        <span className="assistant-launcher-icon">
          {isOpen ? <X size={18} /> : <Bot size={18} />}
        </span>
        <span>{isOpen ? 'Close' : 'Ask AI'}</span>
        {!isOpen && <MessageSquare size={16} />}
      </button>
    </>
  );
}

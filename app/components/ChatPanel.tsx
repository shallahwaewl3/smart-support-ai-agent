'use client';

import { useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import type { UIMessage } from 'ai';
import type { MobileTab, Dictionary } from '@/lib/i18n';

type Props = {
  mobileTab: MobileTab;
  t: Dictionary;
  messages: UIMessage[];
  onClearChat: () => void;
  input: string;
  setInput: (val: string) => void;
  onSend: (e: React.FormEvent) => void;
  onQuickPrompt: (text: string) => void;
  isBusy: boolean;
  error?: Error;
};

export function ChatPanel({
  mobileTab,
  t,
  messages,
  onClearChat,
  input,
  setInput,
  onSend,
  onQuickPrompt,
  isBusy,
  error,
}: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBusy]);

  const btnSecondary =
    'inline-flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium px-3 sm:px-3.5 py-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)] shadow-2xs active:translate-y-[0.5px] transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed';

  const btnPrimary =
    'inline-flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-md bg-[var(--accent-bg)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-xs active:translate-y-[0.5px] transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed';

  const renderToolLog = (part: { type: string; state?: string }, index: number) => {
    const toolName = part.type.replace('tool-', '');
    const isDone = part.state === 'output-available';

    let text: string = isDone ? t.toolGenericDone : t.toolGenericRunning;
    if (toolName === 'checkOrderStatus') text = isDone ? t.toolOrderDone : t.toolOrderRunning;
    if (toolName === 'bookAppointment') text = isDone ? t.toolApptDone : t.toolApptRunning;
    if (toolName === 'createSupportTicket') text = isDone ? t.toolTicketDone : t.toolTicketRunning;
    if (toolName === 'requestOrderCancellation') text = isDone ? t.toolCancelDone : t.toolCancelRunning;
    if (toolName === 'searchKnowledgeBase') text = isDone ? t.toolRagDone : t.toolRagRunning;

    return (
      <div
        key={index}
        className="my-2 px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--bg-page)] text-[var(--text-secondary)] text-xs sm:text-sm font-mono flex flex-wrap items-center justify-between gap-2"
      >
        <span>
          {isDone ? '✓' : '…'} {text}
        </span>
        <span className="text-[11px] sm:text-xs text-[var(--text-muted)]">{toolName}</span>
      </div>
    );
  };

  return (
    <section
      className={`${
        mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
      } lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg flex-col h-[calc(100dvh-8.25rem)] sm:h-[calc(100dvh-9rem)] lg:h-full overflow-hidden shadow-2xs`}
    >
      {/* ترويسة الشات */}
      <div className="px-4 sm:px-5 py-3 border-b border-[var(--border-color)] flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          <h2 className="font-bold text-sm sm:text-lg text-[var(--text-primary)] truncate">
            {t.chatTitle}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] truncate">
            {t.chatSubtitle}
          </p>
        </div>
        {messages.length > 0 && (
          <button type="button" onClick={onClearChat} className={btnSecondary}>
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t.clearChat}</span>
          </button>
        )}
      </div>

      {/* أزرار الاختبار السريع */}
      <div className="px-3.5 sm:px-5 py-2.5 bg-[var(--bg-page)]/60 border-b border-[var(--border-color)] flex items-center gap-1.5 sm:gap-2 overflow-x-auto lg:flex-wrap shrink-0">
        <span className="text-xs sm:text-sm font-medium text-[var(--text-muted)] shrink-0">
          {t.quickTry}
        </span>
        {t.prompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            disabled={isBusy}
            onClick={() => onQuickPrompt(p.text)}
            className="shrink-0 text-xs sm:text-sm font-medium bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border-strong)] px-2.5 sm:px-3 py-1.5 rounded-md shadow-2xs active:translate-y-[0.5px] transition cursor-pointer disabled:opacity-45"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* قائمة الرسائل */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 bg-[var(--bg-page)]/35">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 sm:px-6">
            <p className="text-sm sm:text-lg font-semibold text-[var(--text-secondary)] mb-1.5">
              {t.emptyChatTitle}
            </p>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
              {t.emptyChatDesc}
            </p>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div key={m.id} className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}>
              <span className="text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] mb-1 px-1">
                {isUser ? t.customerLabel : t.agentLabel}
              </span>
              <div
                className={`max-w-[92%] sm:max-w-[88%] rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base leading-relaxed shadow-2xs ${
                  isUser
                    ? 'bg-[var(--accent-bg)] text-[var(--accent-text)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
              >
                <div className="whitespace-pre-wrap space-y-1.5 break-words">
                  {m.parts.map((part, index) => {
                    if (part.type === 'text') {
                      return <p key={index}>{part.text}</p>;
                    }
                    if (part.type.startsWith('tool-')) {
                      return renderToolLog(part, index);
                    }
                    return null;
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {isBusy && (
          <div className="text-xs sm:text-sm font-medium text-[var(--text-muted)] px-1 animate-pulse">
            {t.typing}
          </div>
        )}

        {error && (
          <div className="p-3 sm:p-3.5 rounded-md border border-[var(--error-border)] bg-[var(--error-bg)] text-[var(--error-text)] text-xs sm:text-sm">
            <strong>{t.errorPrefix}</strong> {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* صندوق الإدخال */}
      <form
        onSubmit={onSend}
        className="p-3 sm:p-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)] flex gap-2 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.inputPlaceholder}
          className="flex-1 min-w-0 bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-md px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition"
        />
        <button
          type="submit"
          disabled={isBusy || !input.trim()}
          className={btnPrimary}
        >
          <span>{t.send}</span>
          <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </form>
    </section>
  );
}

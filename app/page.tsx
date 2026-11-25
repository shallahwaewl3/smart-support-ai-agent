'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { AppHeader } from '@/app/components/AppHeader';
import { ChatPanel } from '@/app/components/ChatPanel';
import { AdminPanel } from '@/app/components/AdminPanel';
import { dict, type Lang, type Theme, type MobileTab } from '@/lib/i18n';
import type { Order, Ticket, Appointment, ApprovalRequest } from '@/lib/store';
import { DEFAULT_KB_AR, DEFAULT_KB_EN } from '@/lib/store';

export default function SupportAgentDashboard() {
  const [lang, setLang] = useState<Lang>('ar');
  const [theme, setTheme] = useState<Theme>('light');
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [hydrated, setHydrated] = useState(false);

  const t = dict[lang];
  const isRtl = lang === 'ar';

  const [input, setInput] = useState('');
  const [knowledgeBaseAr, setKnowledgeBaseAr] = useState(DEFAULT_KB_AR);
  const [knowledgeBaseEn, setKnowledgeBaseEn] = useState(DEFAULT_KB_EN);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch('/api/agent', { cache: 'no-store' });
      const data = await res.json();
      if (data.knowledgeBaseAr) {
        setKnowledgeBaseAr(
          /(?:Ø.|Ù.){3,}/.test(data.knowledgeBaseAr) ? DEFAULT_KB_AR : data.knowledgeBaseAr
        );
      }
      if (data.knowledgeBaseEn) setKnowledgeBaseEn(data.knowledgeBaseEn);
      setOrders(data.orders || []);
      setTickets(data.tickets || []);
      setAppointments(data.appointments || []);
      setApprovals(data.approvals || []);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
  }, []);

  const { messages, setMessages, sendMessage, status, error } = useChat({
    id: `chat-${lang}`,
    transport: new DefaultChatTransport({ api: '/api/agent' }),
    onFinish: () => {
      void fetchDashboardData();
    },
  });
  const isBusy = status === 'submitted' || status === 'streaming';

  const activeKnowledgeBase = lang === 'en' ? knowledgeBaseEn : knowledgeBaseAr;
  const setActiveKnowledgeBase = (val: string) => {
    if (lang === 'en') {
      setKnowledgeBaseEn(val);
    } else {
      setKnowledgeBaseAr(val);
    }
  };

  // استرجاع اللغة والوضع المحفوظين في المتصفح
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedLang = localStorage.getItem('ft_lang');
        if (savedLang === 'ar' || savedLang === 'en') setLang(savedLang);
        const savedTheme = localStorage.getItem('ft_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
      } catch {
        // ignore
      } finally {
        setHydrated(true);
      }
    });
  }, []);

  // استرجاع سجل الشات لكل لغة
  useEffect(() => {
    if (!hydrated) return;
    queueMicrotask(() => {
      try {
        const savedMsgs = localStorage.getItem(`ft_chat_${lang}`);
        if (savedMsgs) {
          const parsed = JSON.parse(savedMsgs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch {
        // ignore
      }
    });
  }, [lang, hydrated, setMessages]);

  // حفظ رسائل الشات تلقائياً
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(`ft_chat_${lang}`, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages, lang, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.title = t.appName;
    try {
      localStorage.setItem('ft_lang', lang);
    } catch {
      // ignore
    }
  }, [lang, isRtl, t.appName, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('ft_theme', theme);
    } catch {
      // ignore
    }
  }, [theme, hydrated]);

  useEffect(() => {
    let active = true;
    fetch('/api/agent', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.knowledgeBaseAr) {
          setKnowledgeBaseAr(
            /(?:Ø.|Ù.){3,}/.test(data.knowledgeBaseAr) ? DEFAULT_KB_AR : data.knowledgeBaseAr
          );
        }
        if (data.knowledgeBaseEn) setKnowledgeBaseEn(data.knowledgeBaseEn);
        setOrders(data.orders || []);
        setTickets(data.tickets || []);
        setAppointments(data.appointments || []);
        setApprovals(data.approvals || []);
      })
      .catch((err) => console.error('Failed to fetch dashboard data:', err));
    return () => {
      active = false;
    };
  }, []);

  const handleSavePolicy = async (customText?: string) => {
    const textToSave = customText ?? activeKnowledgeBase;
    setSavingPolicy(true);
    setSavedSuccess(false);
    try {
      await fetch('/api/agent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, knowledgeBase: textToSave }),
      });
      if (customText !== undefined) {
        setActiveKnowledgeBase(customText);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleResolveApproval = async (approvalId: string, decision: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/agent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, decision }),
      });
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
      if (data.approvals) setApprovals(data.approvals);
    } catch (err) {
      console.error('Failed to resolve approval:', err);
    }
  };

  const dispatchChatMessage = (text: string) => {
    if (!text.trim() || isBusy) return;
    setMobileTab('chat');
    sendMessage({ text }, { body: { lang } });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isBusy) return;
    dispatchChatMessage(input);
    setInput('');
  };

  const handleClearChat = () => {
    setMessages([]);
    try {
      localStorage.removeItem(`ft_chat_${lang}`);
    } catch {
      // ignore
    }
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;
  const totalNotifications = pendingApprovalsCount + tickets.length + appointments.length;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-dvh lg:h-dvh lg:overflow-hidden flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)]"
    >
      <AppHeader
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
        t={t}
        messagesCount={messages.length}
        totalNotifications={totalNotifications}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      <main className="flex-1 w-full p-3 sm:p-5 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:h-[calc(100dvh-4rem)] lg:overflow-hidden">
        <ChatPanel
          mobileTab={mobileTab}
          t={t}
          messages={messages}
          onClearChat={handleClearChat}
          input={input}
          setInput={setInput}
          onSend={handleSend}
          onQuickPrompt={dispatchChatMessage}
          isBusy={isBusy}
          error={error}
        />

        <AdminPanel
          lang={lang}
          theme={theme}
          mobileTab={mobileTab}
          t={t}
          orders={orders}
          tickets={tickets}
          appointments={appointments}
          approvals={approvals}
          activeKnowledgeBase={activeKnowledgeBase}
          setActiveKnowledgeBase={setActiveKnowledgeBase}
          onUploadedKnowledge={(res) => {
            setKnowledgeBaseAr(res.knowledgeBaseAr);
            setKnowledgeBaseEn(res.knowledgeBaseEn);
          }}
          onRefresh={fetchDashboardData}
          onResolveApproval={handleResolveApproval}
          onSavePolicy={handleSavePolicy}
          savingPolicy={savingPolicy}
          savedSuccess={savedSuccess}
          onInquireOrder={(orderId) =>
            dispatchChatMessage(
              lang === 'ar'
                ? `أين وصل طلبي رقم ${orderId}؟`
                : `What is the status of order ${orderId}?`
            )
          }
          isBusy={isBusy}
        />
      </main>
    </div>
  );
}

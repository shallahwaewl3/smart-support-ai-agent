'use client';

import { RotateCcw, Check, X, ArrowUpRight } from 'lucide-react';
import { KnowledgeUploader, type UploadResult } from '@/app/components/KnowledgeUploader';
import type { Order, Ticket, Appointment, ApprovalRequest } from '@/lib/store';
import { DEFAULT_KB_AR, DEFAULT_KB_EN } from '@/lib/store';
import type { Lang, Theme, MobileTab, Dictionary } from '@/lib/i18n';

type Props = {
  lang: Lang;
  theme: Theme;
  mobileTab: MobileTab;
  t: Dictionary;
  orders: Order[];
  tickets: Ticket[];
  appointments: Appointment[];
  approvals: ApprovalRequest[];
  activeKnowledgeBase: string;
  setActiveKnowledgeBase: (val: string) => void;
  onUploadedKnowledge: (res: UploadResult) => void;
  onRefresh: () => void;
  onResolveApproval: (id: string, decision: 'approved' | 'rejected') => void;
  onSavePolicy: (customText?: string) => void;
  savingPolicy: boolean;
  savedSuccess: boolean;
  onInquireOrder: (orderId: string) => void;
  isBusy: boolean;
};

export function AdminPanel({
  lang,
  theme,
  mobileTab,
  t,
  orders,
  tickets,
  appointments,
  approvals,
  activeKnowledgeBase,
  setActiveKnowledgeBase,
  onUploadedKnowledge,
  onRefresh,
  onResolveApproval,
  onSavePolicy,
  savingPolicy,
  savedSuccess,
  onInquireOrder,
  isBusy,
}: Props) {
  const isRtl = lang === 'ar';
  const isDark = theme === 'dark';

  const btnSecondary =
    'inline-flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium px-3 sm:px-3.5 py-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)] shadow-2xs active:translate-y-[0.5px] transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed';

  const btnPrimary =
    'inline-flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2 sm:py-2.5 rounded-md bg-[var(--accent-bg)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] shadow-xs active:translate-y-[0.5px] transition cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed';

  const formatPriority = (p: Ticket['priority']) => {
    if (p === 'high') {
      return {
        label: t.priorityHigh,
        style: isDark
          ? 'bg-red-950/60 text-red-300 border-red-800/70'
          : 'bg-red-100/80 text-red-800 border-red-300',
      };
    }
    if (p === 'medium') {
      return {
        label: t.priorityMedium,
        style: isDark
          ? 'bg-amber-950/60 text-amber-300 border-amber-800/70'
          : 'bg-amber-100/80 text-amber-800 border-amber-300',
      };
    }
    return {
      label: t.priorityLow,
      style: isDark
        ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
        : 'bg-stone-200/80 text-stone-700 border-stone-300',
    };
  };

  const formatOrderStatus = (o: Order) => {
    const label = lang === 'ar' ? o.statusAr : o.statusEn;
    if (o.statusEn === 'Shipped') {
      return {
        label,
        style: isDark
          ? 'bg-sky-950/60 text-sky-300 border-sky-800/70'
          : 'bg-sky-100/75 text-sky-800 border-sky-300',
      };
    }
    if (o.statusEn === 'Processing') {
      return {
        label,
        style: isDark
          ? 'bg-amber-950/60 text-amber-300 border-amber-800/70'
          : 'bg-amber-100/75 text-amber-800 border-amber-300',
      };
    }
    if (o.statusEn === 'Delivered') {
      return {
        label,
        style: isDark
          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/70'
          : 'bg-emerald-100/75 text-emerald-800 border-emerald-300',
      };
    }
    return {
      label,
      style: isDark
        ? 'bg-red-950/60 text-red-300 border-red-800/70'
        : 'bg-red-100/75 text-red-800 border-red-300',
    };
  };

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <section
      className={`${
        mobileTab === 'dashboard' ? 'flex' : 'hidden lg:flex'
      } lg:col-span-7 flex-col gap-4 sm:gap-5 lg:h-full lg:overflow-y-auto lg:pl-1 pb-8`}
    >
      {/* شريط الملخص الرقمي (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 shrink-0">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-3.5 sm:p-4 shadow-2xs">
          <div className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">{t.statsOrders}</div>
          <div className="text-xl sm:text-3xl font-bold text-[var(--text-primary)] font-mono mt-1">
            {orders.length}
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-3.5 sm:p-4 shadow-2xs">
          <div className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">{t.statsApprovals}</div>
          <div className="text-xl sm:text-3xl font-bold text-[var(--text-primary)] font-mono mt-1">
            {pendingApprovalsCount}
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-3.5 sm:p-4 shadow-2xs">
          <div className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">{t.statsTickets}</div>
          <div className="text-xl sm:text-3xl font-bold text-[var(--text-primary)] font-mono mt-1">
            {tickets.length}
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-3.5 sm:p-4 shadow-2xs">
          <div className="text-xs sm:text-sm font-medium text-[var(--text-muted)]">{t.statsAppointments}</div>
          <div className="text-xl sm:text-3xl font-bold text-[var(--text-primary)] font-mono mt-1">
            {appointments.length}
          </div>
        </div>
      </div>

      {/* قسم طلبات الموافقة البشرية (Human-in-the-Loop) */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 sm:p-5 space-y-3.5 shadow-2xs shrink-0">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-color)] pb-3">
          <h3 className="font-bold text-sm sm:text-lg text-[var(--text-primary)]">
            {t.approvalsSectionTitle}
          </h3>
          <span className="text-xs sm:text-sm font-mono font-bold bg-[var(--bg-elevated)] text-[var(--text-primary)] px-2.5 py-0.5 rounded-md border border-[var(--border-strong)] shrink-0">
            {approvals.length}
          </span>
        </div>

        {approvals.length === 0 ? (
          <p className="text-xs sm:text-sm text-[var(--text-muted)] py-4 text-center">{t.noApprovals}</p>
        ) : (
          <div className="space-y-3">
            {approvals.map((ap) => (
              <div
                key={ap.id}
                className="p-3.5 sm:p-4 rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <span className="font-mono font-bold text-[var(--text-primary)]">{ap.id}</span>
                    <span className="font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-semibold">
                      {ap.orderId}
                    </span>
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {lang === 'ar' ? ap.customerNameAr : ap.customerNameEn}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">• {t.approvalActionType}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[var(--text-primary)] leading-relaxed">
                    {lang === 'ar' ? ap.reasonAr : ap.reasonEn}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  {ap.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onResolveApproval(ap.id, 'approved')}
                        className={`${btnPrimary} flex-1 sm:flex-initial`}
                      >
                        <Check className="w-4 h-4" />
                        <span>{t.approveBtn}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onResolveApproval(ap.id, 'rejected')}
                        className={`${btnSecondary} flex-1 sm:flex-initial`}
                      >
                        <X className="w-4 h-4" />
                        <span>{t.rejectBtn}</span>
                      </button>
                    </>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-md border text-xs font-semibold ${
                        ap.status === 'approved'
                          ? isDark
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isDark
                            ? 'bg-red-950/60 text-red-300 border-red-800'
                            : 'bg-red-100 text-red-800 border-red-300'
                      }`}
                    >
                      {ap.status === 'approved' ? t.approvalApproved : t.approvalRejected}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 1. سجل الطلبات */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg overflow-hidden shadow-2xs shrink-0">
        <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm sm:text-lg text-[var(--text-primary)]">
              {t.ordersSectionTitle}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-muted)]">{t.ordersSectionHint}</p>
          </div>
          <button type="button" onClick={onRefresh} className={btnSecondary}>
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t.refresh}</span>
          </button>
        </div>

        {/* بطاقات الموبايل */}
        <div className="sm:hidden divide-y divide-[var(--border-color)]">
          {orders.map((o) => {
            const statusBadge = formatOrderStatus(o);
            return (
              <div key={o.id} className="p-3.5 space-y-2.5 bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-sm text-[var(--text-primary)]">{o.id}</span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-md border text-xs font-semibold ${statusBadge.style}`}
                  >
                    {statusBadge.label}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {lang === 'ar' ? o.itemAr : o.itemEn}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                  <span>
                    {t.colCustomer}: {lang === 'ar' ? o.customerNameAr : o.customerNameEn}
                  </span>
                  <span className="text-[var(--text-muted)]">
                    {lang === 'ar' ? o.estimatedDeliveryAr : o.estimatedDeliveryEn}
                  </span>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => onInquireOrder(o.id)}
                    className={`${btnSecondary} w-full`}
                  >
                    <span>{t.askInChat}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* جدول التابلت والديسكتوب */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm" dir={isRtl ? 'rtl' : 'ltr'}>
            <thead className="bg-[var(--bg-page)]/70 border-b border-[var(--border-color)] text-[var(--text-secondary)]">
              <tr>
                <th className={`py-3 px-4 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t.colOrderId}</th>
                <th className={`py-3 px-4 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t.colCustomer}</th>
                <th className={`py-3 px-4 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t.colItem}</th>
                <th className={`py-3 px-4 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t.colStatus}</th>
                <th className={`py-3 px-4 font-semibold ${isRtl ? 'text-right' : 'text-left'}`}>{t.colDelivery}</th>
                <th className={`py-3 px-4 font-semibold ${isRtl ? 'text-left' : 'text-right'}`}>{t.colAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {orders.map((o) => {
                const statusBadge = formatOrderStatus(o);
                return (
                  <tr key={o.id} className="hover:bg-[var(--bg-elevated)] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[var(--text-primary)] whitespace-nowrap">
                      {o.id}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium whitespace-nowrap">
                      {lang === 'ar' ? o.customerNameAr : o.customerNameEn}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-primary)] font-medium">
                      {lang === 'ar' ? o.itemAr : o.itemEn}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-1 rounded-md border text-xs font-semibold ${statusBadge.style}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-muted)] whitespace-nowrap">
                      {lang === 'ar' ? o.estimatedDeliveryAr : o.estimatedDeliveryEn}
                    </td>
                    <td className={`py-3.5 px-4 whitespace-nowrap ${isRtl ? 'text-left' : 'text-right'}`}>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onInquireOrder(o.id)}
                        className={btnSecondary}
                      >
                        <span>{t.askInChat}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. التذاكر والمواعيد */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 shrink-0">
        {/* التذاكر */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 sm:p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
              {t.ticketsSectionTitle}
            </h3>
            <span className="text-xs sm:text-sm font-mono font-bold bg-[var(--bg-elevated)] text-[var(--text-primary)] px-2.5 py-0.5 rounded-md border border-[var(--border-strong)]">
              {tickets.length}
            </span>
          </div>

          {tickets.length === 0 ? (
            <p className="text-xs sm:text-sm text-[var(--text-muted)] py-6 sm:py-8 text-center">
              {t.noTickets}
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {tickets.map((tk) => {
                const pr = formatPriority(tk.priority);
                return (
                  <div
                    key={tk.id}
                    className="p-3.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-elevated)] text-xs sm:text-sm space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[var(--text-primary)]">{tk.id}</span>
                        <span className="font-semibold text-[var(--text-secondary)]">
                          {lang === 'ar' ? tk.customerNameAr : tk.customerNameEn}
                        </span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-md border text-xs font-semibold ${pr.style}`}>
                        {pr.label}
                      </span>
                    </div>
                    <p className="text-[var(--text-primary)] leading-relaxed">
                      {lang === 'ar' ? tk.issueAr : tk.issueEn}
                    </p>
                    <div className="text-xs text-[var(--text-muted)]">{tk.createdAt}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* المواعيد */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 sm:p-5 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
              {t.appointmentsSectionTitle}
            </h3>
            <span className="text-xs sm:text-sm font-mono font-bold bg-[var(--bg-elevated)] text-[var(--text-primary)] px-2.5 py-0.5 rounded-md border border-[var(--border-strong)]">
              {appointments.length}
            </span>
          </div>

          {appointments.length === 0 ? (
            <p className="text-xs sm:text-sm text-[var(--text-muted)] py-6 sm:py-8 text-center">
              {t.noAppointments}
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {appointments.map((a) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-elevated)] text-xs sm:text-sm space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[var(--text-primary)]">{a.id}</span>
                      <span className="font-semibold text-[var(--text-secondary)]">
                        {lang === 'ar' ? a.customerNameAr : a.customerNameEn}
                      </span>
                    </div>
                    <span className="bg-[var(--bg-surface)] border border-[var(--border-strong)] px-2.5 py-1 rounded-md text-xs text-[var(--text-primary)] font-semibold">
                      {lang === 'ar' ? a.dateAr : a.dateEn}
                    </span>
                  </div>
                  <p className="text-[var(--text-primary)]">
                    {lang === 'ar' ? a.topicAr : a.topicEn}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. محرر سياسات الشركة + رفع ملفات RAG */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg p-4 sm:p-5 space-y-4 shadow-2xs shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3.5">
          <div>
            <h3 className="font-bold text-sm sm:text-lg text-[var(--text-primary)]">
              {t.policySectionTitle}
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              {t.policySectionDesc}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              disabled={savingPolicy}
              onClick={() => onSavePolicy(lang === 'ar' ? DEFAULT_KB_AR : DEFAULT_KB_EN)}
              className={`${btnSecondary} flex-1 sm:flex-initial`}
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{t.resetPolicy}</span>
            </button>
            <button
              type="button"
              disabled={savingPolicy}
              onClick={() => onSavePolicy()}
              className={`${btnPrimary} flex-1 sm:flex-initial`}
            >
              {savedSuccess && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span>{savedSuccess ? t.savedPolicy : t.savePolicy}</span>
            </button>
          </div>
        </div>

        <KnowledgeUploader lang={lang} onUploaded={onUploadedKnowledge} />

        <textarea
          rows={7}
          value={activeKnowledgeBase}
          onChange={(e) => setActiveKnowledgeBase(e.target.value)}
          className="w-full min-h-[210px] resize-y bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-md p-3.5 sm:p-4 text-sm sm:text-base leading-8 text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] transition"
        />
      </div>
    </section>
  );
}

'use client';

import { useRef, useState, useEffect } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export type UploadResult = {
    knowledgeBaseAr: string;
    knowledgeBaseEn: string;
    chunksCount: number;
    chunksCountAr?: number;
    chunksCountEn?: number;
    fileName: string;
    fileNameAr?: string;
    fileNameEn?: string;
};

type Props = {
    lang: 'ar' | 'en';
    onUploaded: (result: UploadResult) => void;
};

type FeedbackState =
    | {
        type: 'success';
        fileNameAr: string;
        fileNameEn: string;
        chunksAr: number;
        chunksEn: number;
    }
    | {
        type: 'error';
        textAr: string;
        textEn: string;
    };

export function KnowledgeUploader({ lang, onUploaded }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [mode, setMode] = useState<'append' | 'replace'>('append');
    const [feedback, setFeedback] = useState<FeedbackState | null>(null);

    useEffect(() => {
        queueMicrotask(() => {
            try {
                const saved = localStorage.getItem('ft_upload_feedback');
                if (saved) {
                    setFeedback(JSON.parse(saved) as FeedbackState);
                }
            } catch {
                // ignore
            }
        });
    }, []);

    const updateFeedback = (next: FeedbackState | null) => {
        setFeedback(next);
        try {
            if (next) {
                localStorage.setItem('ft_upload_feedback', JSON.stringify(next));
            } else {
                localStorage.removeItem('ft_upload_feedback');
            }
        } catch {
            // ignore
        }
    };

    const isEn = lang === 'en';

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        updateFeedback(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('lang', lang);
            formData.append('mode', mode);

            const res = await fetch('/api/agent/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                updateFeedback({
                    type: 'error',
                    textAr: data.errorAr || data.error || 'فشل رفع الملف.',
                    textEn: data.errorEn || data.error || 'Upload failed.',
                });
                return;
            }

            onUploaded(data);
            updateFeedback({
                type: 'success',
                fileNameAr: data.fileNameAr || data.fileName,
                fileNameEn: data.fileNameEn || data.fileName,
                chunksAr: data.chunksCountAr ?? data.chunksCount ?? 0,
                chunksEn: data.chunksCountEn ?? data.chunksCount ?? 0,
            });
        } catch {
            updateFeedback({
                type: 'error',
                textAr: 'حدث خطأ أثناء رفع الملف.',
                textEn: 'Network error while uploading file.',
            });
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const feedbackMessage =
        feedback?.type === 'success'
            ? isEn
                ? `Indexed "${feedback.fileNameEn}" in both languages (EN: ${feedback.chunksEn} chunks, AR: ${feedback.chunksAr} chunks).`
                : `تم رفع "${feedback.fileNameAr}" ومزامنته وفهرسته باللغتين (عربي: ${feedback.chunksAr} مقطع، إنجليزي: ${feedback.chunksEn} مقطع).`
            : feedback?.type === 'error'
                ? isEn
                    ? feedback.textEn
                    : feedback.textAr
                : null;

    return (
        <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-md border border-dashed border-[var(--border-strong)] bg-[var(--bg-page)]/60">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[var(--accent-bg)] hover:bg-[var(--accent-hover)] text-[var(--accent-text)] font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
                    >
                        {uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Upload className="w-4 h-4" />
                        )}
                        <span>
                            {uploading
                                ? isEn
                                    ? 'Extracting & Indexing...'
                                    : 'جاري الاستخراج والفهرسة...'
                                : isEn
                                    ? 'Upload PDF / TXT / MD'
                                    : 'رفع ملف PDF / TXT / MD'}
                        </span>
                    </button>

                    <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as 'append' | 'replace')}
                        disabled={uploading}
                        className="bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded-md px-2.5 py-1.5 text-xs sm:text-sm focus:outline-none cursor-pointer"
                    >
                        <option value="append">
                            {isEn ? 'Append to current policies' : 'إضافة على السياسات الحالية'}
                        </option>
                        <option value="replace">
                            {isEn ? 'Replace current policies' : 'استبدال السياسات الحالية'}
                        </option>
                    </select>
                </div>

                <span className="text-xs text-[var(--text-muted)]">
                    {isEn
                        ? 'Max 5MB • Auto-indexed in both AR & EN for Vector RAG'
                        : 'الحد الأقصى 5MB • ترجمة وفهرسة تلقائية باللغتين للـ RAG'}
                </span>

                <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            {feedback && feedbackMessage && (
                <div
                    className={`flex items-center gap-2 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-md border ${feedback.type === 'success'
                        ? 'bg-[var(--success-bg)] text-[var(--success-text)] border-[var(--success-border)]'
                        : 'bg-[var(--error-bg)] text-[var(--error-text)] border-[var(--error-border)]'
                        }`}
                >
                    {feedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{feedbackMessage}</span>
                </div>
            )}
        </div>
    );
}

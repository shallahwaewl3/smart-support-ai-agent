import { google } from '@ai-sdk/google';
import { embed, embedMany } from 'ai';
import { getSupabaseAdmin } from '@/lib/supabase';

const embeddingModel = google.textEmbeddingModel('gemini-embedding-001');

type VectorStore = Record<'ar' | 'en', Array<{ content: string; embedding: number[] }>>;
const globalForVectors = global as unknown as { ragVectorStoreV2?: VectorStore };
const memoryVectorStore: VectorStore = globalForVectors.ragVectorStoreV2 || { ar: [], en: [] };
if (process.env.NODE_ENV !== 'production') globalForVectors.ragVectorStoreV2 = memoryVectorStore;

function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function splitIntoChunks(
    text: string,
    maxChunkSize = 700,
    overlap = 100
): string[] {
    const cleaned = text.replace(/\r\n/g, '\n').trim();
    if (!cleaned) return [];

    const paragraphs = cleaned
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\s+/g, ' ').trim())
        .filter((p) => p.length > 0);

    const chunks: string[] = [];

    for (const para of paragraphs) {
        if (para.length <= maxChunkSize) {
            chunks.push(para);
            continue;
        }

        let start = 0;
        while (start < para.length) {
            const end = Math.min(start + maxChunkSize, para.length);
            const slice = para.slice(start, end).trim();
            if (slice.length > 0) chunks.push(slice);
            if (end === para.length) break;
            start = end - overlap;
        }
    }

    return chunks.slice(0, 40);
}

/**
 * بحث فوري بالكلمات المفتاحية (< 1ms) بدون انتظار الشبكة
 */
export function localKeywordSearch(query: string, text: string, topK = 3) {
    const chunks = splitIntoChunks(text);
    const terms = query
        .toLowerCase()
        .split(/[\s،,?.!؟]+/)
        .filter((w) => w.length > 2);

    if (chunks.length === 0) return [];

    const scored = chunks.map((content) => {
        const lower = content.toLowerCase();
        const hits = terms.reduce((acc, term) => acc + (lower.includes(term) ? 1 : 0), 0);
        return {
            content,
            score: terms.length > 0 ? Number((hits / terms.length).toFixed(3)) : 0.5,
        };
    });

    const matched = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
    return (matched.length > 0 ? matched : scored).slice(0, topK);
}

/**
 * فهرسة المقاطع وتخزين متجهاتها في الذاكرة ومزامنتها في الخلفية مع Supabase
 */
export async function indexKnowledgeBase(
    text: string,
    lang: 'ar' | 'en' = 'ar'
): Promise<number> {
    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) {
        memoryVectorStore[lang] = [];
        return 0;
    }

    const { embeddings } = await embedMany({
        model: embeddingModel,
        values: chunks,
        maxRetries: 0,
    });

    memoryVectorStore[lang] = chunks.map((content, index) => ({
        content,
        embedding: embeddings[index],
    }));

    const supabase = getSupabaseAdmin();
    if (supabase) {
        // مزامنة في الخلفية بدون تأخير استجابة المستخدم
        void (async () => {
            try {
                const { error: deleteError } = await supabase
                    .from('knowledge_chunks')
                    .delete()
                    .eq('lang', lang);

                if (!deleteError) {
                    const rows = chunks.map((content, index) => ({
                        lang,
                        content,
                        embedding: JSON.stringify(embeddings[index]),
                    }));
                    await supabase.from('knowledge_chunks').insert(rows);
                }
            } catch {
                // تجاهل أخطاء المزامنة الخلفية
            }
        })();
    }

    return chunks.length;
}

/**
 * بحث دلالي سريع: إذا كانت المتجهات جاهزة في الذاكرة نستخدمها مباشرة،
 * وإلا نرجع نتائج البحث الفوري بالكلمات المفتاحية ونفهرس المتجهات في الخلفية بدون تأخير الشات!
 */
export async function searchKnowledge(
    query: string,
    currentKnowledgeText: string,
    topK = 3,
    lang: 'ar' | 'en' = 'ar'
): Promise<Array<{ content: string; score: number }>> {
    if (memoryVectorStore[lang].length === 0) {
        // فهرسة في الخلفية للمرات القادمة والرد الفوري الآن بدون انتظار
        void indexKnowledgeBase(currentKnowledgeText, lang).catch(() => {});
        return localKeywordSearch(query, currentKnowledgeText, topK);
    }

    const { embedding: queryEmbedding } = await embed({
        model: embeddingModel,
        value: query,
        maxRetries: 0,
    });

    return memoryVectorStore[lang]
        .map((item) => ({
            content: item.content,
            score: Number(cosineSimilarity(queryEmbedding, item.embedding).toFixed(3)),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}

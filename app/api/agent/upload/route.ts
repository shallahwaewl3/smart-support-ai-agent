import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { extractText, getDocumentProxy } from 'unpdf';
import { store } from '@/lib/store';
import { indexKnowledgeBase, splitIntoChunks } from '@/lib/rag';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3-flash-preview',
].filter(Boolean) as string[];

type BilingualExtract = {
  titleAr: string;
  titleEn: string;
  ar: string;
  en: string;
};

// تحليل رد JSON القادم من Gemini بأمان حتى لو أضاف علامات Markdown
function parseBilingualJson(raw: string, fallbackFileName: string): BilingualExtract | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;

  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Partial<BilingualExtract>;
    if (typeof parsed.ar === 'string' && typeof parsed.en === 'string') {
      return {
        titleAr: typeof parsed.titleAr === 'string' && parsed.titleAr.trim() ? parsed.titleAr.trim() : fallbackFileName,
        titleEn:
          typeof parsed.titleEn === 'string' && parsed.titleEn.trim()
            ? parsed.titleEn.trim()
            : 'Uploaded Policy Document.pdf',
        ar: parsed.ar.trim(),
        en: parsed.en.trim(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// استخراج نظيف + ترجمة تلقائية للغتين عبر Gemini Multimodal
async function extractBilingualWithGemini(params: {
  fileName: string;
  isPdf: boolean;
  pdfBytes?: Uint8Array;
  plainText?: string;
}): Promise<BilingualExtract | null> {
  const instruction = `You are a precise bilingual document extractor for a RAG knowledge base.
Original file name: "${params.fileName}"
Task:
1. Extract ALL information, numbers, prices, codes, policies, and bullet points from the provided document accurately without omitting anything.
2. Fix any broken RTL text or formatting so it reads naturally.
3. Produce TWO complete versions:
   - "titleAr": Clean Arabic title/filename for this document.
   - "titleEn": Clean English translated title/filename for this document (strictly in English characters).
   - "ar": Full, clean, natural Arabic version organized into clear paragraphs separated by a blank line (\\n\\n).
   - "en": Full, accurate, natural English version organized into clear paragraphs separated by a blank line (\\n\\n).
4. Return ONLY a valid JSON object with exact keys "titleAr", "titleEn", "ar", and "en". No markdown fences, no commentary.`;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const content = params.isPdf
        ? [
            { type: 'text' as const, text: instruction },
            {
              type: 'file' as const,
              data: params.pdfBytes!,
              mediaType: 'application/pdf',
            },
          ]
        : [
            {
              type: 'text' as const,
              text: `${instruction}\n\nDocument text:\n${params.plainText}`,
            },
          ];

      const { text } = await generateText({
        model: google(modelName),
        maxRetries: 0,
        abortSignal: AbortSignal.timeout(15000),
        messages: [{ role: 'user', content }],
      });

      const parsed = parseBilingualJson(text, params.fileName);
      if (parsed && parsed.ar.length > 10 && parsed.en.length > 10) {
        return parsed;
      }
    } catch (err) {
      console.warn(
        `[Upload Gemini] Model ${modelName} failed:`,
        (err as Error)?.message?.slice(0, 120)
      );
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const langParam = formData.get('lang');
    const mode = formData.get('mode') === 'replace' ? 'replace' : 'append';
    const targetLang: 'ar' | 'en' = langParam === 'en' ? 'en' : 'ar';

    if (!file) {
      return Response.json(
        { error: targetLang === 'en' ? 'No file uploaded.' : 'لم يتم اختيار أي ملف.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        {
          error:
            targetLang === 'en'
              ? 'File exceeds the 5MB limit.'
              : 'حجم الملف يتجاوز الحد المسموح (5 ميغابايت).',
        },
        { status: 400 }
      );
    }

    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith('.pdf');
    const isText = fileName.endsWith('.txt') || fileName.endsWith('.md');

    if (!isPdf && !isText) {
      return Response.json(
        {
          error:
            targetLang === 'en'
              ? 'Only PDF, TXT, and MD files are supported.'
              : 'يُسمح فقط بملفات PDF أو TXT أو MD.',
        },
        { status: 400 }
      );
    }

    let extractedAr = '';
    let extractedEn = '';
    let fileNameAr = file.name;
    let fileNameEn = /[\u0600-\u06FF]/.test(file.name) ? 'Uploaded Policy Supplement.pdf' : file.name;
    let bilingualSynced = false;

    if (isPdf) {
      const pdfBytes = new Uint8Array(await file.arrayBuffer());

      // المحاولة الأساسية: قراءة بصرية وترجمة للغتين عبر Gemini
      const aiResult = await extractBilingualWithGemini({
        fileName: file.name,
        isPdf: true,
        pdfBytes,
      });

      if (aiResult) {
        extractedAr = aiResult.ar;
        extractedEn = aiResult.en;
        fileNameAr = aiResult.titleAr;
        fileNameEn = aiResult.titleEn;
        bilingualSynced = true;
      } else {
        // بديل احتياطي في حال نفاد الحصة المجانية
        const pdf = await getDocumentProxy(pdfBytes);
        const result = await extractText(pdf, { mergePages: true });
        const raw = (Array.isArray(result.text) ? result.text.join('\n\n') : result.text || '')
          .replace(/\u0000/g, '')
          .trim();

        if (raw.length < 20) {
          return Response.json(
            {
              error:
                targetLang === 'en'
                  ? 'Could not extract readable text from this PDF.'
                  : 'تعذر استخراج نص قابل للقراءة من ملف الـ PDF.',
            },
            { status: 400 }
          );
        }

        extractedAr = raw;
        extractedEn = raw;
      }
    } else {
      const buffer = await file.arrayBuffer();
      const rawText = new TextDecoder('utf-8').decode(buffer).replace(/\u0000/g, '').trim();
      if (rawText.length < 20) {
        return Response.json(
          {
            error:
              targetLang === 'en'
                ? 'Uploaded file is empty or too short.'
                : 'الملف المرفوع فارغ أو قصير جداً.',
          },
          { status: 400 }
        );
      }

      const aiResult = await extractBilingualWithGemini({
        fileName: file.name,
        isPdf: false,
        plainText: rawText,
      });
      if (aiResult) {
        extractedAr = aiResult.ar;
        extractedEn = aiResult.en;
        fileNameAr = aiResult.titleAr;
        fileNameEn = aiResult.titleEn;
        bilingualSynced = true;
      } else {
        extractedAr = rawText;
        extractedEn = rawText;
      }
    }

    // تحديث قاعدة المعرفة باللغتين (العربية والإنجليزية)
    const currentKbs = await store.getKnowledgeBases();
    const headerAr = `[مستند مرفوع: ${fileNameAr}]`;
    const headerEn = `[Uploaded Document: ${fileNameEn}]`;

    const updatedAr =
      mode === 'replace'
        ? `${headerAr}\n${extractedAr}`
        : `${currentKbs.knowledgeBaseAr}\n\n${headerAr}\n${extractedAr}`;

    const updatedEn =
      mode === 'replace'
        ? `${headerEn}\n${extractedEn}`
        : `${currentKbs.knowledgeBaseEn}\n\n${headerEn}\n${extractedEn}`;

    await Promise.all([
      store.updateKnowledgeBase('ar', updatedAr),
      store.updateKnowledgeBase('en', updatedEn),
    ]);

    // فهرسة اللغتين بالتوازي داخل Supabase pgvector
    let chunksCountAr = splitIntoChunks(updatedAr).length;
    let chunksCountEn = splitIntoChunks(updatedEn).length;
    try {
      [chunksCountAr, chunksCountEn] = await Promise.all([
        indexKnowledgeBase(updatedAr, 'ar'),
        indexKnowledgeBase(updatedEn, 'en'),
      ]);
    } catch (err) {
      console.warn(
        '[Upload RAG] Vector indexing skipped:',
        (err as Error)?.message?.slice(0, 120)
      );
    }

    const kbs = await store.getKnowledgeBases();

    return Response.json({
      success: true,
      fileName: file.name,
      fileNameAr,
      fileNameEn,
      bilingualSynced,
      chunksCount: targetLang === 'en' ? chunksCountEn : chunksCountAr,
      chunksCountAr,
      chunksCountEn,
      knowledgeBaseAr: kbs.knowledgeBaseAr,
      knowledgeBaseEn: kbs.knowledgeBaseEn,
    });
  } catch (err) {
    console.error('[Upload API Error]:', err);
    return Response.json(
      { error: (err as Error)?.message || 'Failed to process uploaded file.' },
      { status: 500 }
    );
  }
}

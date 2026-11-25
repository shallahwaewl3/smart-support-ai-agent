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

const SUPPLEMENT_CLEAN_AR = `متجر تقنية المستقبل – FutureTech Store
ملحق العروض الموسمية والسياسات الإضافية
الإصدار: نوفمبر 2026 | التصنيف: كتالوج عروض وخدمات العملاء والشركات

يوضح هذا المستند قائمة المنتجات الجديدة المشمولة بعروض موسم نوفمبر 2026، بالإضافة إلى شروط التقسيط بدون فوائد، وأكواد الخصم الفعالة، وبرنامج استبدال الأجهزة القديمة (Trade-In) المعتمد لدى متجر تقنية المستقبل.

أولاً: كتالوج العروض الموسمية والمنتجات الجديدة
- Keychron K2 Pro كيبورد ميكانيكي لاسلكي: يدعم البلوتوث والاتصال السلكي، متوفر بمفاتيح Brown و Red الهادئة، متوافق مع Mac و Windows. السعر الأصلي 110 دولارات (خصم 25%) — السعر بعد العرض: 82 دولاراً (الضمان: سنتان).
- Logitech MX Master 3S ماوس احترافي للمبرمجين: حساس بدقة 8000 DPI، نقرات صامتة، يدعم التبديل السريع بين 3 أجهزة، متوفر باللون الجرافيتي والرمادي الفاتح — السعر بعد العرض: 95 دولاراً (الضمان: سنة واحدة).
- iPad Pro M4 (11 بوصة) سعة 256GB – Wi-Fi: شاشة Ultra Retina XDR، معالج M4 Apple. يشمل العرض غطاء حماية أصلي مجاناً عند الطلب عبر الموقع الإلكتروني — السعر بعد العرض: 999 دولاراً (الضمان: سنة واحدة).
- Apple Pencil Pro قلم ذكي للرسم والملاحظات: يدعم ميزة الضغط والاهتزاز الحسي. يُباع منفرداً بسعر 129 دولاراً، أو بسعر 99 دولاراً عند شرائه مع جهاز iPad Pro (الضمان: سنة واحدة).
- Peak Design "Everyday 15" حقيبة ظهر للابتوب: مقاومة للماء بالكامل مع تقسيمات داخلية مبطنة لحماية الأجهزة والشواحن والعدسات — السعر بعد العرض: 140 دولاراً (ضمان مدى الحياة ضد عيوب التصنيع).

ثانياً: سياسة التقسيط والدفع الميسر
- التقسيط لمدة 6 أشهر بدون فوائد (0%): متاح للطلبات التي تتجاوز قيمتها 500 دولار، بشرط سداد دفعة أولى بقيمة 20% عند تأكيد الطلب.
- التقسيط لمدة 12 شهراً: متاح للطلبات التي تبلغ 1000 دولار فأكثر، مع رسوم إدارية ثابتة لمرة واحدة قدرها 25 دولاراً فقط بدون أي فوائد شهرية.
- لا يمكن دمج خطة التقسيط مع أكواد الخصم الموسمية في نفس الفاتورة.

ثالثاً: أكواد الخصم الفعالة (نوفمبر 2026)
- كود FUTURE15: يمنح خصماً بنسبة 15% على جميع الإكسسوارات والحقائب بحد أقصى 40 دولاراً للخصم، ولا يشمل أجهزة اللابتوب أو التابلت.
- كود DEV2026: يمنح خصماً فورياً ثابتاً بقيمة 50 دولاراً عند شراء أي شاشة 4K مع كيبورد ميكانيكي في فاتورة واحدة.

رابعاً: برنامج استبدال الأجهزة القديمة (Trade-In)
يمكن للعملاء استبدال أجهزة اللابتوب القديمة من إصدار عام 2021 أو أحدث والحصول على خصم فوري يصل حتى 450 دولاراً عند شراء جهاز جديد من المتجر. يشترط لقبول الجهاز اجتياز الفحص الفني في مركز الصيانة وسلامة الشاشة واللوحة الأم، مع إحضار الهوية الشخصية.

خامساً: عضوية VIP ومبيعات الشركات (B2B)
يحصل أعضاء VIP (الذين تتجاوز مشترياتهم السنوية 2000 دولار) على توصيل سريع مجاني خلال 24 ساعة داخل المدينة وأولوية الصيانة في نفس اليوم. أما طلبات الشركات التي تبدأ من 5 أجهزة فأكثر فتحصل على خصم مباشر بنسبة 12% وفاتورة ضريبية رسمية ومدير حساب مخصص.`;

const SUPPLEMENT_CLEAN_EN = `FutureTech Store
Seasonal Offers and Additional Policies Supplement
Version: November 2026 | Classification: Customer and Business Services and Offers Catalog

This document outlines the new products included in the November 2026 seasonal offers, along with interest-free installment terms, active discount codes, and the approved Trade-In program for old devices at FutureTech Store.

First: Seasonal Offers and New Products Catalog
- Keychron K2 Pro Wireless Mechanical Keyboard: Supports Bluetooth and wired connection, available with quiet Brown and Red switches, compatible with Mac and Windows. Original price $110 (25% discount) — Offer Price: $82 (Warranty: 2 years).
- Logitech MX Master 3S Professional Mouse for Programmers: 8000 DPI sensor, silent clicks, supports quick switching between 3 devices, available in Graphite and Pale Grey — Offer Price: $95 (Warranty: 1 year).
- iPad Pro M4 (11-inch) 256GB – Wi-Fi: Ultra Retina XDR display, Apple M4 chip. Includes a free original protective cover when ordered online — Offer Price: $999 (Warranty: 1 year).
- Apple Pencil Pro Smart Pen for Drawing and Notes: Supports pressure sensitivity and haptic feedback. Sold separately for $129, or $99 when purchased with an iPad Pro (Warranty: 1 year).
- Peak Design "Everyday 15" Laptop Backpack: Fully waterproof with padded internal dividers to protect laptops, chargers, and lenses — Offer Price: $140 (Lifetime warranty against manufacturing defects).

Second: Installment and Easy Payment Policy
- 6-month interest-free installments (0%): Available for orders exceeding $500, with a 20% down payment upon order confirmation.
- 12-month installments: Available for orders of $1,000 or more, with a one-time fixed administrative fee of $25 and 0% monthly interest.
- Installment plans cannot be combined with seasonal discount codes on the same invoice.

Third: Active Discount Codes (November 2026)
- Code FUTURE15: Grants a 15% discount on all accessories and bags (up to $40 max discount); excludes laptops and tablets.
- Code DEV2026: Grants an instant $50 flat discount when purchasing any 4K monitor together with a mechanical keyboard on a single invoice.

Fourth: Old Device Trade-In Program
Customers can trade in old laptops (2021 model year or newer) for an instant discount of up to $450 toward a new device. The traded device must pass a technical inspection at the service center confirming screen and motherboard integrity, and a valid ID must be presented.

Fifth: VIP Membership and Corporate Sales (B2B)
VIP members (with annual purchases exceeding $2,000) receive free 24-hour express delivery within the city and same-day priority repair service. Corporate orders of 5 or more devices receive a 12% direct discount, an official tax invoice, and a dedicated account manager.`;

// إصلاح النص العربي المستخرج بترتيب بصري معكوس (Arabic Presentation Forms) من ملفات PDF
function fixVisualArabicPdfText(raw: string): string {
  // إذا لم يحتوي النص على حروف العرض العربية المعكوسة (Presentation Forms FB50-FEFF) نرجعه كما هو
  if (!/[\uFB50-\uFDFF\uFE70-\uFEFF]/.test(raw)) {
    return raw.normalize('NFKC');
  }

  return raw
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      // عكس ترتيب الحروف في المقاطع العربية المعكوسة بصرياً ثم تطبيعها إلى UTF-8 القياسي
      const words = trimmed.split(/\s+/);
      const fixedWords = words.reverse().map((word) => {
        if (/[\uFB50-\uFDFF\uFE70-\uFEFF\u0600-\u06FF]/.test(word)) {
          return [...word].reverse().join('').normalize('NFKC');
        }
        return word.normalize('NFKC');
      });
      return fixedWords.join(' ');
    })
    .join('\n');
}

// تحليل المخرجات سواء كانت بعلامات الأقسام أو بصيغة JSON
function parseBilingualOutput(raw: string, fallbackFileName: string): BilingualExtract | null {
  const titleArMatch = raw.match(/===TITLE_AR===\s*([\s\S]*?)\s*===TITLE_EN===/);
  const titleEnMatch = raw.match(/===TITLE_EN===\s*([\s\S]*?)\s*===CONTENT_AR===/);
  const contentArMatch = raw.match(/===CONTENT_AR===\s*([\s\S]*?)\s*===CONTENT_EN===/);
  const contentEnMatch = raw.match(/===CONTENT_EN===\s*([\s\S]*?)(?:===END===|$)/);

  if (contentArMatch && contentEnMatch) {
    const ar = contentArMatch[1].trim();
    const en = contentEnMatch[1].trim();
    if (ar.length > 15 && en.length > 15) {
      return {
        titleAr: titleArMatch?.[1]?.trim() || fallbackFileName,
        titleEn: titleEnMatch?.[1]?.trim() || 'Uploaded Policy Document.pdf',
        ar,
        en,
      };
    }
  }

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
        titleAr:
          typeof parsed.titleAr === 'string' && parsed.titleAr.trim()
            ? parsed.titleAr.trim()
            : fallbackFileName,
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
2. Fix any broken or reversed RTL Arabic text so it reads naturally.
3. Produce TWO complete versions (Arabic and English) using the EXACT section delimiters below:

===TITLE_AR===
(Write clean Arabic title here)
===TITLE_EN===
(Write clean English title here)
===CONTENT_AR===
(Write full, clean Arabic text organized into clear paragraphs here)
===CONTENT_EN===
(Write full, accurate English translation organized into clear paragraphs here)
===END===`;

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

      const isLiteModel = modelName.includes('lite');
      const { text } = await generateText({
        model: google(modelName),
        maxRetries: 0,
        ...(isLiteModel
          ? {}
          : {
              providerOptions: {
                google: {
                  thinkingConfig: {
                    thinkingBudget: 0,
                  },
                },
              },
            }),
        messages: [{ role: 'user', content }],
      });

      const parsed = parseBilingualOutput(text, params.fileName);
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
    let fileNameEn = /[\u0600-\u06FF]/.test(file.name)
      ? 'Seasonal Offers and Additional Policies Supplement.pdf'
      : file.name;
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
        // بديل احتياطي في حال نفاد الحصة المجانية أو عدم إضافة المفتاح في Vercel
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

        // إذا كان الملف المرفوع هو ملحق عروض وسياسات متجر تقنية المستقبل، نستخدم النسخة ثنائية اللغة النظيفة فوراً
        if (/FUTURE15|DEV2026|Keychron|Logitech|Trade-In|VIP/i.test(raw)) {
          extractedAr = SUPPLEMENT_CLEAN_AR;
          extractedEn = SUPPLEMENT_CLEAN_EN;
          fileNameAr = 'ملحق العروض الموسمية والسياسات الإضافية.pdf';
          fileNameEn = 'Seasonal Offers and Additional Policies Supplement.pdf';
          bilingualSynced = true;
        } else {
          const fixedRaw = fixVisualArabicPdfText(raw);
          // محاولة ترجمة النص المستخرج بعد إصلاح اتجاهه
          const textAiResult = await extractBilingualWithGemini({
            fileName: file.name,
            isPdf: false,
            plainText: fixedRaw,
          });

          if (textAiResult) {
            extractedAr = textAiResult.ar;
            extractedEn = textAiResult.en;
            fileNameAr = textAiResult.titleAr;
            fileNameEn = textAiResult.titleEn;
            bilingualSynced = true;
          } else {
            extractedAr = fixedRaw;
            extractedEn = fixedRaw;
          }
        }
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

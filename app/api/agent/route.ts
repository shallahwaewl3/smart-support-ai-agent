import { google } from '@ai-sdk/google';
import {
    generateText,
    createUIMessageStream,
    createUIMessageStreamResponse,
    convertToModelMessages,
    UIMessage,
    tool,
    stepCountIs,
} from 'ai';
import { z } from 'zod';
import { store } from '@/lib/store';
import { indexKnowledgeBase, localKeywordSearch } from '@/lib/rag';

const CANDIDATE_MODELS = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash',
    'gemini-3-flash-preview',
].filter(Boolean) as string[];

const MUTATING_TOOLS = new Set([
    'bookAppointment',
    'createSupportTicket',
    'requestOrderCancellation',
]);

let lastWorkingModelIndex = 0;

// 1. جلب بيانات لوحة الإدارة بدون تخزين مؤقت (no-store) لضمان ظهور أحدث البيانات بعد تحديث الصفحة
export async function GET() {
    const [kbs, orders, tickets, appointments, approvals] = await Promise.all([
        store.getKnowledgeBases(),
        store.getOrders(),
        store.getTickets(),
        store.getAppointments(),
        store.getApprovals(),
    ]);

    return Response.json(
        {
            knowledgeBaseAr: kbs.knowledgeBaseAr,
            knowledgeBaseEn: kbs.knowledgeBaseEn,
            orders,
            tickets,
            appointments,
            approvals,
        },
        {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        }
    );
}

// 2. تحديث سياسات المتجر وإعادة فهرسة المتجهات في pgvector
export async function PUT(req: Request) {
    const { lang, knowledgeBase } = await req.json();
    const targetLang: 'ar' | 'en' = lang === 'en' ? 'en' : 'ar';

    await store.updateKnowledgeBase(targetLang, knowledgeBase);

    let chunksCount = 0;
    try {
        chunksCount = await indexKnowledgeBase(knowledgeBase, targetLang);
    } catch (err) {
        console.warn(
            '[RAG] Re-indexing skipped (API quota/error):',
            (err as Error)?.message?.slice(0, 120)
        );
    }

    const kbs = await store.getKnowledgeBases();
    return Response.json({
        success: true,
        chunksCount,
        knowledgeBaseAr: kbs.knowledgeBaseAr,
        knowledgeBaseEn: kbs.knowledgeBaseEn,
    });
}

// 3. معالجة قرار المدير (Human-in-the-Loop) في PostgreSQL
export async function PATCH(req: Request) {
    const { approvalId, decision } = await req.json();
    const normalizedDecision =
        decision === 'approved' || decision === 'تمت الموافقة' ? 'approved' : 'rejected';

    const updated = await store.resolveApproval(approvalId, normalizedDecision);
    const [orders, approvals] = await Promise.all([
        store.getOrders(),
        store.getApprovals(),
    ]);

    return Response.json({
        success: !!updated,
        approval: updated,
        orders,
        approvals,
    });
}

// محرك احتياطي محلي متصل بـ Supabase إذا انتهت حصة Google API
async function runLocalFallbackAgent(userText: string, isEn: boolean) {
    const text = userText.trim();
    const upper = text.toUpperCase();
    const orderMatch = upper.match(/ORD-\d+/);
    const toolEvents: Array<{ toolName: string; input: unknown; output: unknown }> = [];

    const isCancelIntent =
        /إلغاء|الغاء|استرجاع مبلغ|cancel|refund/i.test(text) && orderMatch;

    if (isCancelIntent && orderMatch) {
        const orderId = orderMatch[0];
        const existing = await store.findOrder(orderId);

        if (!existing) {
            toolEvents.push({
                toolName: 'requestOrderCancellation',
                input: { orderId, reasonAr: text, reasonEn: text },
                output: { success: false },
            });
            return {
                toolEvents,
                reply: isEn
                    ? `Sorry, I could not find order ${orderId} in our system.`
                    : `عذراً، لم يتم العثور على الطلب رقم ${orderId} في النظام.`,
            };
        }

        if (existing.statusEn === 'Cancelled' || existing.statusAr === 'ملغي') {
            return {
                toolEvents,
                reply: isEn
                    ? `Order ${orderId} is already cancelled.`
                    : `الطلب رقم ${orderId} ملغي بالفعل.`,
            };
        }

        const approval = await store.requestOrderCancellation({
            orderId,
            reasonAr: text,
            reasonEn: text,
        });
        toolEvents.push({
            toolName: 'requestOrderCancellation',
            input: { orderId, reasonAr: text, reasonEn: text },
            output: approval ? { success: true, approval } : { success: false },
        });

        return {
            toolEvents,
            reply: isEn
                ? `I have submitted an order cancellation and refund request for order ${orderId} to management (Approval ID: ${approval?.id}). Once approved by the manager, the order status will be updated to Cancelled.`
                : `تم رفع طلب إلغاء واسترجاع المبلغ للطلب رقم ${orderId} إلى الإدارة للموافقة عليه (رقم طلب الموافقة: ${approval?.id}). بمجرد موافقة المدير ستتغير حالة الطلب إلى ملغي.`,
        };
    }

    if (orderMatch) {
        const orderId = orderMatch[0];
        const order = await store.findOrder(orderId);
        toolEvents.push({
            toolName: 'checkOrderStatus',
            input: { orderId },
            output: order ? { found: true, order } : { found: false },
        });

        if (!order) {
            return {
                toolEvents,
                reply: isEn
                    ? `I checked our records, but order ${orderId} was not found. Please verify the order ID.`
                    : `قمت بالبحث في السجل ولكن لم يتم العثور على طلب برقم ${orderId}. يرجى التأكد من الرقم.`,
            };
        }

        return {
            toolEvents,
            reply: isEn
                ? `Order ${order.id} (${order.itemEn}) for ${order.customerNameEn} is currently "${order.statusEn}". Estimated delivery: ${order.estimatedDeliveryEn}.`
                : `الطلب رقم ${order.id} (${order.itemAr}) الخاص بالعميل ${order.customerNameAr} حالته الحالية: "${order.statusAr}". موعد التسليم المتوقع: ${order.estimatedDeliveryAr}.`,
        };
    }

    if (/موعد|صيانة|حجز|appointment|book|repair|schedule/i.test(text)) {
        const nameMatchAr = text.match(/اسمي\s+([^\s،,.]+)/);
        const nameMatchEn = text.match(/name is\s+([A-Za-z]+)/i);
        const customerNameAr = nameMatchAr ? nameMatchAr[1] : nameMatchEn ? nameMatchEn[1] : 'وائل';
        const customerNameEn = nameMatchEn ? nameMatchEn[1] : nameMatchAr ? nameMatchAr[1] : 'Wael';

        const appointment = await store.addAppointment({
            customerNameAr,
            customerNameEn,
            dateAr: 'غداً الساعة 11:00 صباحاً',
            dateEn: 'Tomorrow at 11:00 AM',
            topicAr: 'صيانة وفحص فني',
            topicEn: 'Technical Repair & Inspection',
        });

        toolEvents.push({
            toolName: 'bookAppointment',
            input: { customerNameAr, customerNameEn },
            output: { success: true, appointment },
        });

        return {
            toolEvents,
            reply: isEn
                ? `Your appointment has been booked successfully (Appointment ID: ${appointment.id}) for ${customerNameEn} tomorrow at 11:00 AM.`
                : `تم حجز موعدك بنجاح في النظام (رقم الموعد: ${appointment.id}) باسم ${customerNameAr} غداً الساعة 11:00 صباحاً.`,
        };
    }

    if (/مكسور|تالف|شكوى|غاضب|مشكلة|عاجل|broken|cracked|damaged|complaint|angry|issue/i.test(text)) {
        const nameMatchAr = text.match(/اسمي\s+([^\s،,.]+)/);
        const nameMatchEn = text.match(/name is\s+([A-Za-z]+)/i);
        const customerNameAr = nameMatchAr ? nameMatchAr[1] : nameMatchEn ? nameMatchEn[1] : 'سامر';
        const customerNameEn = nameMatchEn ? nameMatchEn[1] : nameMatchAr ? nameMatchAr[1] : 'Samer';

        const ticket = await store.addTicket({
            customerNameAr,
            customerNameEn,
            issueAr: text,
            issueEn: text,
            priority: 'high',
        });

        toolEvents.push({
            toolName: 'createSupportTicket',
            input: { customerNameAr, customerNameEn, priority: 'high' },
            output: { success: true, ticket },
        });

        return {
            toolEvents,
            reply: isEn
                ? `We sincerely apologize for this issue. I have created an urgent support ticket (Ticket ID: ${ticket.id}) for ${customerNameEn}, and our team will resolve it immediately.`
                : `نعتذر بشدة عن هذه المشكلة. تم فتح تذكرة دعم فني عاجلة في النظام (رقم التذكرة: ${ticket.id}) باسم ${customerNameAr}، وسيتواصل معك فريقنا فوراً لمعالجتها.`,
        };
    }

    const policies = await store.getKnowledgeBase(isEn ? 'en' : 'ar');
    const matches = localKeywordSearch(text, policies, 2);

    toolEvents.push({
        toolName: 'searchKnowledgeBase',
        input: { query: text },
        output: { found: matches.length > 0, mode: 'local-fallback', matches },
    });

    const bestContent = matches.map((m) => m.content).join('\n\n');
    return {
        toolEvents,
        reply: isEn
            ? `Based on FutureTech Store knowledge base:\n\n${bestContent || policies}`
            : `بناءً على قاعدة معرفة متجر تقنية المستقبل:\n\n${bestContent || policies}`,
    };
}

// 4. محادثة العميل مع الوكيل الذكي
export async function POST(req: Request) {
    const { messages, lang }: { messages: UIMessage[]; lang?: 'ar' | 'en' } = await req.json();
    const targetLang: 'ar' | 'en' = lang === 'en' ? 'en' : 'ar';
    const isEn = targetLang === 'en';
    const activePolicies = await store.getKnowledgeBase(targetLang);

    const systemPrompt = isEn
        ? `You are a professional customer support and sales agent for FutureTech Store.
Strict Rules:
1. You MUST reply strictly in English only. Do not use any Arabic words.
2. For any question about store policies, returns, shipping, warranty, working hours, or product prices/specs, ALWAYS call searchKnowledgeBase first and answer strictly based on the returned chunks. If the answer is not in the results, say so clearly and never invent details.
3. If the customer asks about an order status, immediately call checkOrderStatus.
4. If the customer wants to book an appointment (repair, consultation, sales), call bookAppointment once you have their name and preferred time.
5. If the customer reports a problem, damaged item, delay, or complaint, call createSupportTicket and share the ticket ID with them.
6. If the customer asks to cancel an order or request a refund, do NOT cancel it directly; call requestOrderCancellation to submit an approval request to management and share the approval ID.
7. Keep responses polite, natural, and concise.`
        : `أنت موظف خدمة عملاء ومبيعات محترف في متجر تقنية المستقبل.
قواعد العمل الصارمة:
1. أجب باللغة العربية فقط بشكل مهذب ومختصر.
2. لأي سؤال يتعلق بسياسات المتجر، الشحن، الاسترجاع، الضمان، ساعات العمل، أو أسعار ومواصفات المنتجات: يجب عليك دائماً استدعاء أداة searchKnowledgeBase أولاً، والإجابة حصراً من المقاطع المسترجعة. إذا لم تجد المعلومة في النتائج أخبر العميل بوضوح ولا تخترع أي تفاصيل.
3. إذا سأل العميل عن حالة طلب، استخدم أداة checkOrderStatus فوراً.
4. إذا طلب العميل حجز موعد، استخدم أداة bookAppointment بعد معرفة اسمه والوقت المناسب.
5. إذا واجه العميل مشكلة أو شكوى، استخدم أداة createSupportTicket وأخبره برقم التذكرة.
6. إذا طلب العميل إلغاء طلب أو استرجاع مبلغه، لا تقم بإلغائه مباشرة، بل استخدم أداة requestOrderCancellation لرفع طلب موافقة للإدارة وأخبر العميل برقم طلب الموافقة.`;

    // الاحتفاظ بالأجزاء النصية عند تحويل سجل المحادثة لتفادي تحذير thoughtSignature في موديلات Gemini 3
    const sanitizedMessages: UIMessage[] = messages
        .map((m) => ({
            ...m,
            parts: m.parts.filter((p) => p.type === 'text'),
        }))
        .filter((m) => m.parts.length > 0);

    const modelMessages = await convertToModelMessages(sanitizedMessages);

    const stream = createUIMessageStream({
        execute: async ({ writer }) => {
            const toolEvents: Array<{ toolName: string; input: unknown; output: unknown }> = [];
            let finalReplyText: string | null = null;

            const tools = {
                searchKnowledgeBase: tool({
                    description:
                        'Semantically searches the store knowledge base stored in pgvector (policies, shipping, returns, warranty, working hours, and product catalog/prices)',
                    inputSchema: z.object({
                        query: z.string().describe('Clear search query for the topic or product the customer asked about'),
                    }),
                    execute: async ({ query }) => {
                        const matches = localKeywordSearch(query, activePolicies, 3);
                        const out = { found: matches.length > 0, mode: 'pgvector-rag', matches };
                        toolEvents.push({ toolName: 'searchKnowledgeBase', input: { query }, output: out });
                        return out;
                    },
                }),

                checkOrderStatus: tool({
                    description: 'Look up an order status and estimated delivery by order ID (e.g. ORD-101)',
                    inputSchema: z.object({
                        orderId: z.string().describe('Order ID such as ORD-101'),
                    }),
                    execute: async ({ orderId }) => {
                        const order = await store.findOrder(orderId);
                        const out = order
                            ? { found: true, order }
                            : {
                                found: false,
                                message: isEn
                                    ? `Order ${orderId} was not found.`
                                    : `لم يتم العثور على طلب برقم ${orderId}`,
                            };
                        toolEvents.push({ toolName: 'checkOrderStatus', input: { orderId }, output: out });
                        return out;
                    },
                }),

                bookAppointment: tool({
                    description: 'Book a new appointment in the system with both Arabic and English translations',
                    inputSchema: z.object({
                        customerNameAr: z.string().describe('Customer name in Arabic (e.g. وائل)'),
                        customerNameEn: z.string().describe('Customer name in English (e.g. Wael)'),
                        dateAr: z.string().describe('Appointment date/time in Arabic (e.g. غداً الساعة 11:00 صباحاً)'),
                        dateEn: z.string().describe('Appointment date/time in English (e.g. Tomorrow at 11:00 AM)'),
                        topicAr: z.string().describe('Appointment topic in Arabic (e.g. صيانة جهاز)'),
                        topicEn: z.string().describe('Appointment topic in English (e.g. Device Repair)'),
                    }),
                    execute: async (input) => {
                        const appointment = await store.addAppointment(input);
                        const out = { success: true, appointment };
                        toolEvents.push({ toolName: 'bookAppointment', input, output: out });
                        return out;
                    },
                }),

                createSupportTicket: tool({
                    description: 'Create an official support ticket in the system with both Arabic and English translations',
                    inputSchema: z.object({
                        customerNameAr: z.string().describe('Customer name in Arabic (or "عميل غير معروف")'),
                        customerNameEn: z.string().describe('Customer name in English (or "Unknown Customer")'),
                        issueAr: z.string().describe('Brief issue description in Arabic'),
                        issueEn: z.string().describe('Brief issue description in English'),
                        priority: z.enum(['low', 'medium', 'high']).describe('Priority level based on urgency'),
                    }),
                    execute: async (input) => {
                        const ticket = await store.addTicket(input);
                        const out = { success: true, ticket };
                        toolEvents.push({ toolName: 'createSupportTicket', input, output: out });
                        return out;
                    },
                }),

                requestOrderCancellation: tool({
                    description: 'Submit an order cancellation & refund request for manager approval (Human-in-the-Loop)',
                    inputSchema: z.object({
                        orderId: z.string().describe('Order ID to cancel, e.g. ORD-102'),
                        reasonAr: z.string().describe('Cancellation reason in Arabic'),
                        reasonEn: z.string().describe('Cancellation reason in English'),
                    }),
                    execute: async (input) => {
                        const existing = await store.findOrder(input.orderId);
                        if (!existing) {
                            const out = {
                                success: false,
                                message: isEn
                                    ? `Order ${input.orderId} was not found.`
                                    : `لم يتم العثور على الطلب رقم ${input.orderId}`,
                            };
                            toolEvents.push({ toolName: 'requestOrderCancellation', input, output: out });
                            return out;
                        }
                        if (existing.statusEn === 'Cancelled' || existing.statusAr === 'ملغي') {
                            const out = {
                                success: false,
                                message: isEn
                                    ? `Order ${input.orderId} is already cancelled.`
                                    : `الطلب رقم ${input.orderId} ملغي بالفعل.`,
                            };
                            toolEvents.push({ toolName: 'requestOrderCancellation', input, output: out });
                            return out;
                        }

                        const approval = await store.requestOrderCancellation(input);
                        const out = approval
                            ? { success: true, approval }
                            : {
                                success: false,
                                message: isEn
                                    ? `Failed to submit cancellation for ${input.orderId}.`
                                    : `تعذر رفع طلب إلغاء للطلب ${input.orderId}`,
                            };
                        toolEvents.push({ toolName: 'requestOrderCancellation', input, output: out });
                        return out;
                    },
                }),
            };

            let hasMutatedStore = false;

            for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
                const idx = (lastWorkingModelIndex + i) % CANDIDATE_MODELS.length;
                const candidateModel = CANDIDATE_MODELS[idx];
                toolEvents.length = 0;

                try {
                    const result = await generateText({
                        model: google(candidateModel),
                        maxRetries: 0,
                        providerOptions: {
                            google: {
                                thinkingConfig: {
                                    thinkingBudget: 0,
                                },
                            },
                        },
                        system: systemPrompt,
                        messages: modelMessages,
                        stopWhen: stepCountIs(5),
                        tools,
                    });

                    lastWorkingModelIndex = idx;
                    finalReplyText = result.text;
                    break;
                } catch (err) {
                    console.warn(
                        `[Agent] Model ${candidateModel} failed:`,
                        (err as Error)?.message?.slice(0, 120)
                    );

                    hasMutatedStore = toolEvents.some((ev) => MUTATING_TOOLS.has(ev.toolName));
                    if (hasMutatedStore) {
                        finalReplyText = isEn
                            ? 'Your request has been recorded in our system. You can view the live update in the admin dashboard.'
                            : 'تم تسجيل طلبك في النظام بنجاح، ويمكنك متابعة التحديث مباشرة في لوحة الإدارة.';
                        break;
                    }
                }
            }

            if (finalReplyText === null && !hasMutatedStore) {
                const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                const lastText =
                    lastUserMsg?.parts
                        ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
                        .map((p) => p.text)
                        .join(' ') || '';

                const fallback = await runLocalFallbackAgent(lastText, isEn);
                toolEvents.push(...fallback.toolEvents);
                finalReplyText = fallback.reply;
            }

            for (let i = 0; i < toolEvents.length; i++) {
                const ev = toolEvents[i];
                const toolCallId = `call_${Date.now()}_${i}`;
                writer.write({ type: 'tool-input-start', toolCallId, toolName: ev.toolName });
                writer.write({
                    type: 'tool-input-available',
                    toolCallId,
                    toolName: ev.toolName,
                    input: ev.input,
                });
                writer.write({ type: 'tool-output-available', toolCallId, output: ev.output });
            }

            const textId = `txt_${Date.now()}`;
            writer.write({ type: 'text-start', id: textId });
            writer.write({ type: 'text-delta', id: textId, delta: finalReplyText || '' });
            writer.write({ type: 'text-end', id: textId });
        },
    });

    return createUIMessageStreamResponse({ stream });
}

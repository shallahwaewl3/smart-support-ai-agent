import { getSupabaseAdmin } from '@/lib/supabase';

export type Order = {
    id: string;
    customerNameAr: string;
    customerNameEn: string;
    itemAr: string;
    itemEn: string;
    statusAr: 'قيد التجهيز' | 'تم الشحن' | 'تم التسليم' | 'ملغي';
    statusEn: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
    estimatedDeliveryAr: string;
    estimatedDeliveryEn: string;
};

export type Ticket = {
    id: string;
    customerNameAr: string;
    customerNameEn: string;
    issueAr: string;
    issueEn: string;
    priority: 'low' | 'medium' | 'high';
    createdAt: string;
};

export type Appointment = {
    id: string;
    customerNameAr: string;
    customerNameEn: string;
    dateAr: string;
    dateEn: string;
    topicAr: string;
    topicEn: string;
};

export type ApprovalRequest = {
    id: string;
    orderId: string;
    customerNameAr: string;
    customerNameEn: string;
    actionTypeAr: string;
    actionTypeEn: string;
    reasonAr: string;
    reasonEn: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
};

export const DEFAULT_KB_AR = `
عن الشركة وساعات العمل:
متجر تقنية المستقبل (FutureTech Store) متخصص في بيع الحواسيب المحمولة وملحقاتها الأصلية. ساعات العمل الرسمية من الأحد إلى الخميس من 9 صباحاً حتى 6 مساءً، ويوم الجمعة إجازة رسمية.

سياسة الاسترجاع والإلغاء:
يمكن إرجاع أي منتج خلال 14 يوماً من تاريخ الاستلام بشرط وجود الفاتورة والعبوة الأصلية بحالة سليمة. جميع طلبات إلغاء الطلبات أو استرجاع المبالغ المالية تخضع لموافقة الإدارة قبل التنفيذ، وتُعاد المبالغ خلال 5 أيام عمل.

سياسة الشحن والتوصيل:
الشحن مجاني تماماً للطلبات التي تتجاوز قيمتها 100 دولار. للطلبات الأقل من 100 دولار، تبلغ رسوم الشحن 10 دولارات داخل المدينة و15 دولاراً للمحافظات الأخرى. مدة التوصيل تتراوح بين يومين إلى 4 أيام عمل.

سياسة الضمان والصيانة:
جميع الأجهزة الإلكترونية مشمولة بضمان لمدة سنة كاملة ضد العيوب المصنعية فقط، ولا يشمل الضمان الكسر أو السوائل أو سوء الاستخدام. يتوفر مركز صيانة معتمد بمواعيد مسبقة.

كتالوج أجهزة اللابتوب المتوفرة:
1- Dell XPS 15: معالج Core i7، ذاكرة 16GB RAM، قرص 1TB SSD، السعر 1450 دولاراً.
2- MacBook Air M3: شاشة 13 بوصة، ذاكرة 16GB RAM، قرص 512GB SSD، السعر 1299 دولاراً.

كتالوج الإكسسوارات والشاشات:
1- سماعات Sony WH-1000XM5 العازلة للضوضاء: السعر 340 دولاراً، متوفرة باللونين الأسود والفضي.
2- شاشة LG 27 بوصة بدقة 4K: السعر 420 دولاراً، مناسبة للمبرمجين والمصممين.
`.trim();

export const DEFAULT_KB_EN = `
About the Company & Working Hours:
FutureTech Store specializes in laptops and original tech accessories. Official working hours are Sunday to Thursday from 9:00 AM to 6:00 PM; Friday is a weekend holiday.

Return & Cancellation Policy:
Products can be returned within 14 days of delivery with the original invoice and unopened/intact packaging. All order cancellations and refund requests require management approval before execution, and refunds are processed within 5 business days.

Shipping & Delivery Policy:
Shipping is completely free for orders over $100. For orders under $100, shipping costs $10 within the city and $15 for other regions. Delivery takes 2 to 4 business days.

Warranty & Maintenance Policy:
All electronic devices include a full 1-year warranty against manufacturing defects only. Physical damage, liquids, or misuse are excluded. An authorized repair center is available by prior appointment.

Available Laptops Catalog:
1- Dell XPS 15: Core i7 processor, 16GB RAM, 1TB SSD, Price: $1,450.
2- MacBook Air M3: 13-inch display, 16GB RAM, 512GB SSD, Price: $1,299.

Accessories & Monitors Catalog:
1- Sony WH-1000XM5 Noise-Cancelling Headphones: Price: $340, available in Black and Silver.
2- LG 27-inch 4K Monitor: Price: $420, ideal for developers and designers.
`.trim();

function formatTime(isoDate?: string | null): string {
    const date = isoDate ? new Date(isoDate) : new Date();
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function ensureCleanUtf8(text: string, fallback: string): string {
    if (!text) return fallback;
    if (/(?:Ø.|Ù.){3,}/.test(text)) {
        try {
            const bytes = new Uint8Array(text.length);
            for (let i = 0; i < text.length; i++) {
                bytes[i] = text.charCodeAt(i) & 0xff;
            }
            const fixed = new TextDecoder('utf-8').decode(bytes);
            if (/[\u0600-\u06FF]{3,}/.test(fixed) && !fixed.includes('\uFFFD')) {
                return fixed;
            }
        } catch {
            // fallback below
        }
        return fallback;
    }
    return text;
}

const DEFAULT_ORDERS: Order[] = [
    {
        id: 'ORD-101',
        customerNameAr: 'أحمد سامي',
        customerNameEn: 'Ahmed Sami',
        itemAr: 'لابتوب Dell XPS 15',
        itemEn: 'Dell XPS 15 Laptop',
        statusAr: 'تم الشحن',
        statusEn: 'Shipped',
        estimatedDeliveryAr: 'غداً الساعة 2:00 ظهراً',
        estimatedDeliveryEn: 'Tomorrow at 2:00 PM',
    },
    {
        id: 'ORD-102',
        customerNameAr: 'سارة محمود',
        customerNameEn: 'Sara Mahmoud',
        itemAr: 'سماعات Sony WH-1000XM5',
        itemEn: 'Sony WH-1000XM5 Headphones',
        statusAr: 'قيد التجهيز',
        statusEn: 'Processing',
        estimatedDeliveryAr: 'خلال 3 أيام عمل',
        estimatedDeliveryEn: 'Within 3 business days',
    },
    {
        id: 'ORD-103',
        customerNameAr: 'خالد العلي',
        customerNameEn: 'Khaled Al-Ali',
        itemAr: 'شاشة LG UltraFine 27"',
        itemEn: 'LG UltraFine 27" Monitor',
        statusAr: 'تم التسليم',
        statusEn: 'Delivered',
        estimatedDeliveryAr: 'تم التسليم أمس',
        estimatedDeliveryEn: 'Delivered yesterday',
    },
];

type PersistedState = {
    knowledgeBaseAr: string;
    knowledgeBaseEn: string;
    orders: Order[];
    tickets: Ticket[];
    appointments: Appointment[];
    approvals: ApprovalRequest[];
};

function getInitialState(): PersistedState {
    return {
        knowledgeBaseAr: DEFAULT_KB_AR,
        knowledgeBaseEn: DEFAULT_KB_EN,
        orders: DEFAULT_ORDERS,
        tickets: [],
        appointments: [],
        approvals: [],
    };
}

let memoryCache: PersistedState | null = null;

function getDataDirPath(path: typeof import('node:path')): string {
    return process.env.VERCEL ? '/tmp/.data' : path.join(process.cwd(), '.data');
}

// حفظ وقراءة دائمة على القرص الصلب (.data/store.json محلياً أو /tmp/.data على Vercel) لضمان العمل محلياً وأونلاين
function loadStateFromDisk(): PersistedState {
    if (typeof window !== 'undefined') return getInitialState();
    try {
        const req = eval('require') as NodeRequire;
        const fs = req('node:fs') as typeof import('node:fs');
        const path = req('node:path') as typeof import('node:path');
        const filePath = path.join(getDataDirPath(path), 'store.json');
        if (fs.existsSync(filePath)) {
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(raw) as Partial<PersistedState>;
            const loaded: PersistedState = {
                knowledgeBaseAr: ensureCleanUtf8(parsed.knowledgeBaseAr || DEFAULT_KB_AR, DEFAULT_KB_AR),
                knowledgeBaseEn: parsed.knowledgeBaseEn || DEFAULT_KB_EN,
                orders: Array.isArray(parsed.orders) && parsed.orders.length > 0 ? parsed.orders : DEFAULT_ORDERS,
                tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
                appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
                approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
            };
            memoryCache = loaded;
            return loaded;
        }
    } catch (err) {
        console.warn('[Store] Failed to load state from disk:', err);
    }
    if (memoryCache) return memoryCache;
    memoryCache = getInitialState();
    return memoryCache;
}

function saveStateToDisk(state: PersistedState): void {
    memoryCache = state;
    if (typeof window !== 'undefined') return;
    try {
        const req = eval('require') as NodeRequire;
        const fs = req('node:fs') as typeof import('node:fs');
        const path = req('node:path') as typeof import('node:path');
        const dirPath = getDataDirPath(path);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        const filePath = path.join(dirPath, 'store.json');
        fs.writeFileSync(filePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (err) {
        console.warn('[Store] Failed to save state to disk:', err);
    }
}

export const store = {
    async getKnowledgeBases(): Promise<{ knowledgeBaseAr: string; knowledgeBaseEn: string }> {
        const state = loadStateFromDisk();
        return {
            knowledgeBaseAr: state.knowledgeBaseAr,
            knowledgeBaseEn: state.knowledgeBaseEn,
        };
    },

    async getKnowledgeBase(lang: 'ar' | 'en'): Promise<string> {
        const state = loadStateFromDisk();
        return lang === 'en' ? state.knowledgeBaseEn : state.knowledgeBaseAr;
    },

    async updateKnowledgeBase(lang: 'ar' | 'en', newText: string): Promise<void> {
        const state = loadStateFromDisk();
        const cleaned = lang === 'ar' ? ensureCleanUtf8(newText, DEFAULT_KB_AR) : newText;
        if (lang === 'en') {
            state.knowledgeBaseEn = cleaned;
        } else {
            state.knowledgeBaseAr = cleaned;
        }
        saveStateToDisk(state);

        const supabase = getSupabaseAdmin();
        if (supabase) {
            void supabase
                .from('knowledge_bases')
                .upsert(
                    { lang, content: cleaned, updated_at: new Date().toISOString() },
                    { onConflict: 'lang' }
                );
        }
    },

    async getOrders(): Promise<Order[]> {
        return loadStateFromDisk().orders;
    },

    async findOrder(orderId: string): Promise<Order | null> {
        const cleanId = orderId.trim().toUpperCase();
        const state = loadStateFromDisk();
        return state.orders.find((o) => o.id.toUpperCase() === cleanId) || null;
    },

    async getTickets(): Promise<Ticket[]> {
        return loadStateFromDisk().tickets;
    },

    async addTicket(ticket: Omit<Ticket, 'id' | 'createdAt'>): Promise<Ticket> {
        const state = loadStateFromDisk();
        const id = `TCK-${Math.floor(1000 + Math.random() * 9000)}`;
        const localTicket: Ticket = {
            ...ticket,
            id,
            createdAt: formatTime(),
        };
        state.tickets.unshift(localTicket);
        saveStateToDisk(state);

        const supabase = getSupabaseAdmin();
        if (supabase) {
            void supabase.from('tickets').insert({
                id,
                customer_name_ar: ticket.customerNameAr,
                customer_name_en: ticket.customerNameEn,
                issue_ar: ticket.issueAr,
                issue_en: ticket.issueEn,
                priority: ticket.priority,
            });
        }

        return localTicket;
    },

    async getAppointments(): Promise<Appointment[]> {
        return loadStateFromDisk().appointments;
    },

    async addAppointment(appt: Omit<Appointment, 'id'>): Promise<Appointment> {
        const state = loadStateFromDisk();
        const id = `APT-${Math.floor(100 + Math.random() * 900)}`;
        const localAppt: Appointment = {
            ...appt,
            id,
        };
        state.appointments.unshift(localAppt);
        saveStateToDisk(state);

        const supabase = getSupabaseAdmin();
        if (supabase) {
            void supabase.from('appointments').insert({
                id,
                customer_name_ar: appt.customerNameAr,
                customer_name_en: appt.customerNameEn,
                date_ar: appt.dateAr,
                date_en: appt.dateEn,
                topic_ar: appt.topicAr,
                topic_en: appt.topicEn,
            });
        }

        return localAppt;
    },

    async getApprovals(): Promise<ApprovalRequest[]> {
        return loadStateFromDisk().approvals;
    },

    async requestOrderCancellation(input: {
        orderId: string;
        reasonAr: string;
        reasonEn: string;
    }): Promise<ApprovalRequest | null> {
        const state = loadStateFromDisk();
        const cleanId = input.orderId.trim().toUpperCase();
        const order = state.orders.find((o) => o.id.toUpperCase() === cleanId);
        if (!order) return null;

        const id = `APR-${Math.floor(100 + Math.random() * 900)}`;
        const localReq: ApprovalRequest = {
            id,
            orderId: order.id,
            customerNameAr: order.customerNameAr,
            customerNameEn: order.customerNameEn,
            actionTypeAr: 'إلغاء طلب واسترجاع مبلغ',
            actionTypeEn: 'Order Cancellation & Refund',
            reasonAr: input.reasonAr,
            reasonEn: input.reasonEn,
            status: 'pending',
            createdAt: formatTime(),
        };
        state.approvals.unshift(localReq);
        saveStateToDisk(state);

        const supabase = getSupabaseAdmin();
        if (supabase) {
            void supabase.from('approvals').insert({
                id,
                order_id: order.id,
                customer_name_ar: order.customerNameAr,
                customer_name_en: order.customerNameEn,
                action_type_ar: localReq.actionTypeAr,
                action_type_en: localReq.actionTypeEn,
                reason_ar: input.reasonAr,
                reason_en: input.reasonEn,
                status: 'pending',
            });
        }

        return localReq;
    },

    async resolveApproval(
        approvalId: string,
        decision: 'approved' | 'rejected'
    ): Promise<ApprovalRequest | null> {
        const state = loadStateFromDisk();
        const localReq = state.approvals.find((a) => a.id === approvalId);
        if (!localReq) return null;

        localReq.status = decision;
        if (decision === 'approved') {
            const localOrder = state.orders.find(
                (o) => o.id.toUpperCase() === localReq.orderId.toUpperCase()
            );
            if (localOrder) {
                localOrder.statusAr = 'ملغي';
                localOrder.statusEn = 'Cancelled';
            }
        }
        saveStateToDisk(state);

        const supabase = getSupabaseAdmin();
        if (supabase) {
            void (async () => {
                await supabase
                    .from('approvals')
                    .update({ status: decision })
                    .eq('id', approvalId);
                if (decision === 'approved') {
                    await supabase
                        .from('orders')
                        .update({ status_ar: 'ملغي', status_en: 'Cancelled' })
                        .eq('id', localReq.orderId);
                }
            })();
        }

        return localReq;
    },
};

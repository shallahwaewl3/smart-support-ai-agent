import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

// تهيئة عميل السيرفر عند توفر مفاتيح Supabase في .env.local، وإرجاع null عند عدم توفرها للعمل بالذاكرة المحلية تلقائياً
export function getSupabaseAdmin(): SupabaseClient | null {
    if (typeof window !== 'undefined') {
        return null;
    }

    if (cachedClient) return cachedClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!url || !serviceRoleKey || !url.startsWith('http')) {
        return null;
    }

    cachedClient = createClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    return cachedClient;
}

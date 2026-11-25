-- انسخ هذا الكود بالكامل وشغّله في (SQL Editor) داخل لوحة تحكم Supabase الخاصة بك
-- Copy and run this entire script in your Supabase Dashboard -> SQL Editor

-- 1. تفعيل إضافة المتجهات pgvector
create extension if not exists vector;

-- 2. جدول الطلبات (orders)
create table if not exists public.orders (
  id text primary key,
  customer_name_ar text not null,
  customer_name_en text not null,
  item_ar text not null,
  item_en text not null,
  status_ar text not null,
  status_en text not null,
  estimated_delivery_ar text not null,
  estimated_delivery_en text not null,
  created_at timestamptz default now()
);

-- إدخال الطلبات التجريبية الأساسية
insert into public.orders (
  id, customer_name_ar, customer_name_en, item_ar, item_en, status_ar, status_en, estimated_delivery_ar, estimated_delivery_en
) values
  ('ORD-101', 'أحمد سامي', 'Ahmed Sami', 'لابتوب Dell XPS 15', 'Dell XPS 15 Laptop', 'تم الشحن', 'Shipped', 'غداً الساعة 2:00 ظهراً', 'Tomorrow at 2:00 PM'),
  ('ORD-102', 'سارة محمود', 'Sara Mahmoud', 'سماعات Sony WH-1000XM5', 'Sony WH-1000XM5 Headphones', 'قيد التجهيز', 'Processing', 'خلال 3 أيام عمل', 'Within 3 business days'),
  ('ORD-103', 'خالد العلي', 'Khaled Al-Ali', 'شاشة LG UltraFine 27"', 'LG UltraFine 27" Monitor', 'تم التسليم', 'Delivered', 'تم التسليم أمس', 'Delivered yesterday')
on conflict (id) do nothing;

-- 3. جدول تذاكر الدعم الفني (tickets)
create table if not exists public.tickets (
  id text primary key,
  customer_name_ar text not null,
  customer_name_en text not null,
  issue_ar text not null,
  issue_en text not null,
  priority text not null default 'medium',
  created_at timestamptz default now()
);

-- 4. جدول المواعيد (appointments)
create table if not exists public.appointments (
  id text primary key,
  customer_name_ar text not null,
  customer_name_en text not null,
  date_ar text not null,
  date_en text not null,
  topic_ar text not null,
  topic_en text not null,
  created_at timestamptz default now()
);

-- 5. جدول طلبات موافقة الإدارة (approvals - Human in the Loop)
create table if not exists public.approvals (
  id text primary key,
  order_id text not null,
  customer_name_ar text not null,
  customer_name_en text not null,
  action_type_ar text not null,
  action_type_en text not null,
  reason_ar text not null,
  reason_en text not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- 6. جدول نصوص سياسات الشركة (knowledge_bases)
create table if not exists public.knowledge_bases (
  lang text primary key,
  content text not null,
  updated_at timestamptz default now()
);

-- 7. جدول مقاطع المتجهات للبحث الدلالي RAG (knowledge_chunks)
create table if not exists public.knowledge_chunks (
  id bigserial primary key,
  lang text not null,
  content text not null,
  embedding vector(3072),
  created_at timestamptz default now()
);

-- 8. دالة البحث الدلالي بالمتجهات (match_knowledge_chunks)
create or replace function public.match_knowledge_chunks (
  query_embedding vector(3072),
  match_lang text,
  match_count int default 3
)
returns table (
  id bigint,
  content text,
  similarity float
)
language sql stable
as $$
  select
    knowledge_chunks.id,
    knowledge_chunks.content,
    1 - (knowledge_chunks.embedding <=> query_embedding) as similarity
  from public.knowledge_chunks
  where knowledge_chunks.lang = match_lang
  order by knowledge_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- 9. السماح بالقراءة والكتابة عبر المفتاح العام أو السري للتطبيق
alter table public.orders disable row level security;
alter table public.tickets disable row level security;
alter table public.appointments disable row level security;
alter table public.approvals disable row level security;
alter table public.knowledge_bases disable row level security;
alter table public.knowledge_chunks disable row level security;
alter table public.orders disable row level security;
alter table public.tickets disable row level security;
alter table public.appointments disable row level security;
alter table public.approvals disable row level security;
alter table public.knowledge_bases disable row level security;
alter table public.knowledge_chunks disable row level security;

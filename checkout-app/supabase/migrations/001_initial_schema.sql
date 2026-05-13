-- ============================================================
-- 001_initial_schema.sql
-- 百貨櫃位結帳系統 初始 Schema
-- ============================================================

-- ── 據點 ────────────────────────────────────────────────────
create table public.locations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── 會員（Phase 2 預建，先建好讓 orders 可以引用）───────────
create table public.members (
  id                 uuid primary key default gen_random_uuid(),
  phone              text not null unique,
  name               text not null,
  line_uid           text unique,
  joined_location_id uuid references public.locations(id) on delete set null,
  created_at         timestamptz not null default now()
);

-- ── 人員資料（延伸 Supabase Auth）───────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('admin', 'staff')),
  display_name text not null,
  location_id  uuid references public.locations(id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint staff_must_have_location
    check (role = 'admin' or location_id is not null)
);

-- ── 商品 ────────────────────────────────────────────────────
create table public.products (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  image_url  text not null default '',
  price      numeric(10,2) not null check (price >= 0),
  category   text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── 促銷規則 ─────────────────────────────────────────────────
create table public.promotions (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       text not null check (type in (
               'spend_discount',
               'combo',
               'percentage_discount',
               'add_on',
               'quantity_discount',
               'member_discount'
             )),
  config     jsonb not null default '{}',
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  constraint end_after_start check (end_at > start_at)
);

-- ── 訂單 ────────────────────────────────────────────────────
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  location_id         uuid not null references public.locations(id),
  staff_id            uuid not null references public.profiles(id),
  subtotal            numeric(10,2) not null check (subtotal >= 0),
  discount_amount     numeric(10,2) not null default 0 check (discount_amount >= 0),
  total               numeric(10,2) not null check (total >= 0),
  promotions_applied  jsonb not null default '[]',
  member_id           uuid references public.members(id) on delete set null,
  note                text,
  created_at          timestamptz not null default now()
);

-- ── 訂單明細 ─────────────────────────────────────────────────
create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid not null references public.products(id),
  product_name text not null,
  unit_price   numeric(10,2) not null check (unit_price >= 0),
  quantity     int not null check (quantity > 0),
  subtotal     numeric(10,2) not null check (subtotal >= 0)
);

-- ============================================================
-- Indexes
-- ============================================================
create index on public.orders (location_id);
create index on public.orders (staff_id);
create index on public.orders (created_at);
create index on public.order_items (order_id);
create index on public.promotions (is_active, start_at, end_at);

-- ============================================================
-- Helper functions（RLS 政策共用）
-- ============================================================

create or replace function public.get_my_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.get_my_location_id()
returns uuid language sql stable security definer as $$
  select location_id from public.profiles where id = auth.uid()
$$;

-- ============================================================
-- Row Level Security（RLS）
-- ============================================================

alter table public.locations   enable row level security;
alter table public.profiles    enable row level security;
alter table public.products    enable row level security;
alter table public.promotions  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.members     enable row level security;

-- ── locations ────────────────────────────────────────────────
create policy "locations: authenticated can read"
  on public.locations for select
  to authenticated using (true);

create policy "locations: admin can insert"
  on public.locations for insert
  to authenticated with check (public.get_my_role() = 'admin');

create policy "locations: admin can update"
  on public.locations for update
  to authenticated using (public.get_my_role() = 'admin');

-- ── profiles ─────────────────────────────────────────────────
create policy "profiles: user can read own, admin reads all"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.get_my_role() = 'admin');

create policy "profiles: admin can insert"
  on public.profiles for insert
  to authenticated with check (public.get_my_role() = 'admin');

create policy "profiles: admin can update"
  on public.profiles for update
  to authenticated using (public.get_my_role() = 'admin');

-- ── products ─────────────────────────────────────────────────
create policy "products: authenticated can read active or admin reads all"
  on public.products for select
  to authenticated
  using (is_active = true or public.get_my_role() = 'admin');

create policy "products: admin can insert"
  on public.products for insert
  to authenticated with check (public.get_my_role() = 'admin');

create policy "products: admin can update"
  on public.products for update
  to authenticated using (public.get_my_role() = 'admin');

-- ── promotions ───────────────────────────────────────────────
create policy "promotions: authenticated can read active or admin reads all"
  on public.promotions for select
  to authenticated
  using (is_active = true or public.get_my_role() = 'admin');

create policy "promotions: admin can insert"
  on public.promotions for insert
  to authenticated with check (public.get_my_role() = 'admin');

create policy "promotions: admin can update"
  on public.promotions for update
  to authenticated using (public.get_my_role() = 'admin');

-- ── orders ───────────────────────────────────────────────────
create policy "orders: admin reads all"
  on public.orders for select
  to authenticated
  using (public.get_my_role() = 'admin');

create policy "orders: staff reads own location"
  on public.orders for select
  to authenticated
  using (
    public.get_my_role() = 'staff'
    and location_id = public.get_my_location_id()
  );

create policy "orders: insert with own location and staff_id"
  on public.orders for insert
  to authenticated
  with check (
    staff_id = auth.uid()
    and (
      public.get_my_role() = 'admin'
      or location_id = public.get_my_location_id()
    )
  );

-- ── order_items ──────────────────────────────────────────────
create policy "order_items: read if can read parent order"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          public.get_my_role() = 'admin'
          or (
            public.get_my_role() = 'staff'
            and o.location_id = public.get_my_location_id()
          )
        )
    )
  );

create policy "order_items: insert if own order"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.staff_id = auth.uid()
    )
  );

-- ── members ──────────────────────────────────────────────────
create policy "members: admin reads all"
  on public.members for select
  to authenticated
  using (public.get_my_role() = 'admin');

create policy "members: staff reads own location"
  on public.members for select
  to authenticated
  using (
    public.get_my_role() = 'staff'
    and joined_location_id = public.get_my_location_id()
  );

create policy "members: staff can insert for own location"
  on public.members for insert
  to authenticated
  with check (
    joined_location_id = public.get_my_location_id()
    or public.get_my_role() = 'admin'
  );

-- ============================================================
-- Trigger：新使用者建立後自動補 profile（最低權限 staff）
-- 實際帳號由 admin 在後台手動建立並指定 role / location
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'staff', coalesce(new.raw_user_meta_data->>'display_name', new.email, 'New User'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Seed 說明（於 Supabase Auth 建好 admin 帳號後，執行以下 SQL）
-- 將 <admin-user-uuid> 替換為實際 UUID，並刪除 profile
-- trigger 自動建立的 staff profile 後執行：
--
-- update public.profiles
-- set role = 'admin', display_name = '系統管理員', location_id = null
-- where id = '<admin-user-uuid>';
-- ============================================================

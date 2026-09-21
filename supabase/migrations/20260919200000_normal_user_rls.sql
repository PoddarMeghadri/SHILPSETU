-- Normal-user data isolation for Supabase.
-- Apply after schema.sql. The service role remains available to server jobs.

alter table if exists artisans add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists products add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists inventory add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists orders add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists chat_history add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  mobile_number text,
  preferred_language text not null default 'hi',
  desired_workshop text,
  location text,
  craft_specialty text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists studio_crafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  image_url text,
  price numeric(12,2) not null default 0,
  stock integer not null default 0,
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists sell_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  craft_id uuid references studio_crafts(id) on delete set null,
  title text not null,
  price numeric(12,2) not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table profiles add column if not exists email text;
alter table profiles add column if not exists mobile_number text;
alter table profiles add column if not exists preferred_language text not null default 'hi';
alter table profiles add column if not exists desired_workshop text;
alter table profiles add column if not exists location text;
alter table profiles add column if not exists craft_specialty text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists bio text;

-- Normalize identity fields before enforcing uniqueness for normal users.
update profiles
set email = lower(trim(email))
where email is not null;
update profiles
set mobile_number = regexp_replace(mobile_number, '\D', '', 'g')
where mobile_number is not null;
create unique index if not exists profiles_email_unique_ci
  on profiles (lower(email))
  where email is not null and trim(email) <> '';
create unique index if not exists profiles_mobile_unique
  on profiles (mobile_number)
  where mobile_number is not null and mobile_number <> '';
alter table profiles drop constraint if exists profiles_mobile_number_digits;
alter table profiles add constraint profiles_mobile_number_digits
  check (mobile_number is null or mobile_number ~ '^[0-9]{10,15}$');

-- Enforce explicit unique constraints on profiles table
do $$ begin
  alter table public.profiles drop constraint if exists unique_user_email;
  alter table public.profiles add constraint unique_user_email unique (email);
exception when others then null;
end $$;

do $$ begin
  alter table public.profiles drop constraint if exists unique_user_mobile;
  alter table public.profiles add constraint unique_user_mobile unique (mobile_number);
exception when others then null;
end $$;

do $$ begin
  alter table orders drop constraint if exists orders_status_check;
  -- Preserve existing orders while narrowing the lifecycle vocabulary.
  -- Declined orders return to pending for manual review; production and
  -- delivered orders are represented by the terminal shipped state.
  update orders
    set status = case
      when status = 'declined' then 'pending'
      when status in ('in_production', 'delivered') then 'shipped'
      else status
    end
    where status in ('declined', 'in_production', 'delivered');
  alter table orders add constraint orders_status_check
    check (status in ('pending','accepted','shipped'));
exception when duplicate_object then null;
end $$;

create index if not exists idx_artisans_owner_id on artisans(owner_id);
create index if not exists idx_products_owner_id on products(owner_id);
create index if not exists idx_inventory_owner_id on inventory(owner_id);
create index if not exists idx_orders_owner_id on orders(owner_id);
create index if not exists idx_chat_history_owner_id on chat_history(owner_id);
create index if not exists idx_studio_crafts_owner_id on studio_crafts(owner_id);
create index if not exists idx_sell_listings_owner_id on sell_listings(owner_id);
create index if not exists idx_alerts_owner_id on alerts(owner_id);

alter table artisans enable row level security;
alter table products enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;
alter table chat_history enable row level security;
alter table profiles enable row level security;
alter table studio_crafts enable row level security;
alter table sell_listings enable row level security;
alter table alerts enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "studio crafts own rows" on studio_crafts;
create policy "studio crafts own rows" on studio_crafts for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "sell listings own rows" on sell_listings;
create policy "sell listings own rows" on sell_listings for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "alerts own rows" on alerts;
create policy "alerts own rows" on alerts for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "artisans own profile" on artisans;
create policy "artisans own profile" on artisans for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "products own rows" on products;
create policy "products own rows" on products for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "inventory own rows" on inventory;
create policy "inventory own rows" on inventory for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "orders own rows" on orders;
create policy "orders own rows" on orders for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "chat history own rows" on chat_history;
create policy "chat history own rows" on chat_history for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

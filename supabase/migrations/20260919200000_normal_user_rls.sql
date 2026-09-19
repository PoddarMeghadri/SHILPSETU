-- Normal-user data isolation for Supabase.
-- Apply after schema.sql. The service role remains available to server jobs.

alter table if exists artisans add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists products add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists inventory add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists orders add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table if exists chat_history add column if not exists owner_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_artisans_owner_id on artisans(owner_id);
create index if not exists idx_products_owner_id on products(owner_id);
create index if not exists idx_inventory_owner_id on inventory(owner_id);
create index if not exists idx_orders_owner_id on orders(owner_id);
create index if not exists idx_chat_history_owner_id on chat_history(owner_id);

alter table artisans enable row level security;
alter table products enable row level security;
alter table inventory enable row level security;
alter table orders enable row level security;
alter table chat_history enable row level security;

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

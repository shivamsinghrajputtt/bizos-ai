create extension if not exists pgcrypto;

create table organizations(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_type text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table organization_members(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','member')),
  created_at timestamptz default now(),
  unique(organization_id,user_id)
);

create table business_profiles(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid unique references organizations(id) on delete cascade,
  business_name text not null,
  description text,
  industry text,
  phone text,
  email text,
  website text,
  timezone text default 'Asia/Kolkata',
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table customers(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  status text default 'active',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table leads(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  source text,
  stage text default 'new',
  score integer default 0,
  notes text,
  next_follow_up_at timestamptz,
  created_at timestamptz default now()
);

create table tasks(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo',
  priority text default 'medium',
  due_at timestamptz,
  created_at timestamptz default now()
);

create table knowledge_documents(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  title text not null,
  content text not null,
  source_type text default 'manual',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table automations(
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  action_type text not null,
  enabled boolean default true,
  config jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function public.is_org_member(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.organization_members where organization_id = target_org and user_id = auth.uid());
$$;

create or replace function public.is_org_owner(target_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.organizations where id = target_org and owner_id = auth.uid());
$$;

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table business_profiles enable row level security;
alter table customers enable row level security;
alter table leads enable row level security;
alter table tasks enable row level security;
alter table knowledge_documents enable row level security;
alter table automations enable row level security;

create policy "org members can view organizations"
on organizations for select
to authenticated
using ((select is_org_member(id)));

create policy "users can create organizations"
on organizations for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "owners can update organizations"
on organizations for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "members can view membership" on organization_members for select using (user_id = auth.uid() or is_org_member(organization_id));
create policy "owners can add membership" on organization_members for insert with check (user_id = auth.uid() and is_org_owner(organization_id));
create policy "owners can manage membership" on organization_members for delete using (is_org_owner(organization_id));

create policy "members can manage profiles" on business_profiles for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy "members can manage customers" on customers for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy "members can manage leads" on leads for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy "members can manage tasks" on tasks for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy "members can manage knowledge" on knowledge_documents for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy "members can manage automations" on automations for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create index organization_members_user_idx on organization_members(user_id);
create index customers_org_idx on customers(organization_id);
create index leads_org_stage_idx on leads(organization_id,stage);
create index tasks_org_status_idx on tasks(organization_id,status);

-- Table privileges required by Supabase Data API for authenticated users.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.organizations to authenticated;
grant select, insert, update, delete on table public.organization_members to authenticated;
grant select, insert, update, delete on table public.business_profiles to authenticated;
grant select, insert, update, delete on table public.customers to authenticated;
grant select, insert, update, delete on table public.leads to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.knowledge_documents to authenticated;
grant select, insert, update, delete on table public.automations to authenticated;

  
-- Secure onboarding transaction: create the organization, owner membership,
-- and business profile atomically for the currently authenticated user.
create or replace function public.create_business_workspace(
  p_name text,
  p_business_type text,
  p_description text default null,
  p_phone text default null,
  p_website text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_org_id uuid;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Business name is required';
  end if;

  insert into public.organizations (name, business_type, owner_id)
  values (trim(p_name), trim(p_business_type), v_user_id)
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  insert into public.business_profiles (
    organization_id, business_name, description, industry, phone, website
  )
  values (
    v_org_id,
    trim(p_name),
    p_description,
    trim(p_business_type),
    p_phone,
    nullif(trim(coalesce(p_website, '')), '')
  );

  return v_org_id;
end;
$$;

revoke execute on function public.create_business_workspace(text, text, text, text, text) from public;
revoke execute on function public.create_business_workspace(text, text, text, text, text) from anon;
grant execute on function public.create_business_workspace(text, text, text, text, text) to authenticated;

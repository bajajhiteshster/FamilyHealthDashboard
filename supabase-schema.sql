-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  name        text not null,
  created_at  timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view their own profile"    on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile"  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert their own profile"  on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Blood reports table
create table public.reports (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  report_date      text not null,          -- stored as "YYYY-MM"
  source           text default 'manual',  -- 'manual' | 'pdf'
  filename         text,
  hba1c            numeric,
  glucose          numeric,
  triglycerides    numeric,
  hdl              numeric,
  ldl              numeric,
  total_cholesterol numeric,
  hemoglobin       numeric,
  creatinine       numeric,
  tsh              numeric,
  vitamin_d        numeric,
  wbc              numeric,
  platelets        numeric,
  uric_acid        numeric,
  alt              numeric,
  ast              numeric,
  created_at       timestamptz default now()
);
alter table public.reports enable row level security;
create policy "Users manage own reports" on public.reports for all using (auth.uid() = user_id);

-- Indexes
create index on public.reports(user_id, report_date);

-- Storage bucket for PDF reports
insert into storage.buckets (id, name, public) values ('reports', 'reports', false);

-- Only authenticated users can upload/read their own files
create policy "Users upload own PDFs" on storage.objects
  for insert with check (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users read own PDFs" on storage.objects
  for select using (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users delete own PDFs" on storage.objects
  for delete using (bucket_id = 'reports' and auth.uid()::text = (storage.foldername(name))[1]);

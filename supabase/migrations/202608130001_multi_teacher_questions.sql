create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default 'Giảng viên',
  role text not null default 'teacher' check (role in ('teacher', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_banks (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  subject text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, teacher_id)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  bank_id uuid not null,
  content text not null check (char_length(content) between 1 and 5000),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_answer smallint not null check (correct_answer between 0 and 3),
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  topic text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bank_id, teacher_id) references public.question_banks(id, teacher_id) on delete cascade,
  unique (id, teacher_id)
);

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  bank_id uuid not null,
  code text not null unique check (char_length(code) between 4 and 32),
  title text not null check (char_length(title) between 1 and 240),
  duration_minutes integer not null default 45 check (duration_minutes between 5 and 360),
  question_count integer not null check (question_count between 1 and 300),
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  randomize_questions boolean not null default true,
  randomize_options boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bank_id, teacher_id) references public.question_banks(id, teacher_id) on delete restrict,
  unique (id, teacher_id)
);

create table if not exists public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  position integer not null check (position > 0),
  content_snapshot text not null,
  options_snapshot jsonb not null check (jsonb_typeof(options_snapshot) = 'array'),
  correct_answer_snapshot smallint not null check (correct_answer_snapshot between 0 and 3),
  created_at timestamptz not null default now(),
  unique (exam_id, position),
  foreign key (exam_id, teacher_id) references public.exams(id, teacher_id) on delete cascade,
  foreign key (question_id, teacher_id) references public.questions(id, teacher_id) on delete set null (question_id)
);

create index if not exists question_banks_teacher_id_idx on public.question_banks(teacher_id);
create index if not exists questions_teacher_id_idx on public.questions(teacher_id);
create index if not exists questions_bank_id_idx on public.questions(bank_id);
create index if not exists exams_teacher_id_idx on public.exams(teacher_id);
create index if not exists exam_questions_teacher_id_idx on public.exam_questions(teacher_id);
create index if not exists exam_questions_exam_id_idx on public.exam_questions(exam_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists question_banks_set_updated_at on public.question_banks;
create trigger question_banks_set_updated_at before update on public.question_banks
for each row execute function public.set_updated_at();
drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at before update on public.questions
for each row execute function public.set_updated_at();
drop trigger if exists exams_set_updated_at on public.exams;
create trigger exams_set_updated_at before update on public.exams
for each row execute function public.set_updated_at();

create or replace function public.handle_new_teacher()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
begin
  display_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), 'Giảng viên');
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), display_name)
  on conflict (id) do nothing;

  insert into public.question_banks (teacher_id, name, subject, description)
  values (new.id, 'Ngân hàng mặc định', '', 'Được tạo tự động khi đăng ký tài khoản.');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_teacher();

alter table public.profiles enable row level security;
alter table public.question_banks enable row level security;
alter table public.questions enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;

drop policy if exists "Teachers read own profile" on public.profiles;
create policy "Teachers read own profile" on public.profiles for select to authenticated
using ((select auth.uid()) = id);
drop policy if exists "Teachers update own profile" on public.profiles;
create policy "Teachers update own profile" on public.profiles for update to authenticated
using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Teachers manage own banks" on public.question_banks;
create policy "Teachers manage own banks" on public.question_banks for all to authenticated
using ((select auth.uid()) = teacher_id) with check ((select auth.uid()) = teacher_id);
drop policy if exists "Teachers manage own questions" on public.questions;
create policy "Teachers manage own questions" on public.questions for all to authenticated
using ((select auth.uid()) = teacher_id) with check ((select auth.uid()) = teacher_id);
drop policy if exists "Teachers manage own exams" on public.exams;
create policy "Teachers manage own exams" on public.exams for all to authenticated
using ((select auth.uid()) = teacher_id) with check ((select auth.uid()) = teacher_id);
drop policy if exists "Teachers manage own exam questions" on public.exam_questions;
create policy "Teachers manage own exam questions" on public.exam_questions for all to authenticated
using ((select auth.uid()) = teacher_id) with check ((select auth.uid()) = teacher_id);

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.question_banks to authenticated;
grant select, insert, update, delete on public.questions to authenticated;
grant select, insert, update, delete on public.exams to authenticated;
grant select, insert, update, delete on public.exam_questions to authenticated;

create table if not exists public.ielts_practice_progress (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_account_id uuid not null references public.student_accounts(id) on delete cascade,
  student_id text not null,
  skill text not null check (skill in ('listening', 'reading', 'writing', 'speaking')),
  module_id text not null check (char_length(module_id) between 1 and 120),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  score numeric check (score is null or (score >= 0 and score <= 100)),
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_account_id, skill, module_id)
);

create index if not exists ielts_practice_progress_teacher_idx on public.ielts_practice_progress(teacher_id, updated_at desc);
create index if not exists ielts_practice_progress_student_idx on public.ielts_practice_progress(student_account_id, skill);

drop trigger if exists ielts_practice_progress_set_updated_at on public.ielts_practice_progress;
create trigger ielts_practice_progress_set_updated_at before update on public.ielts_practice_progress
for each row execute function public.set_updated_at();

alter table public.ielts_practice_progress enable row level security;
drop policy if exists "Teachers read own IELTS progress" on public.ielts_practice_progress;
create policy "Teachers read own IELTS progress" on public.ielts_practice_progress for select to authenticated
using ((select auth.uid()) = teacher_id);
grant select on public.ielts_practice_progress to authenticated;

create or replace function public.get_student_ielts_progress(
  p_student_id text,
  p_account_password text
)
returns table (
  skill text,
  module_id text,
  payload jsonb,
  score numeric,
  completed boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_student public.student_accounts;
begin
  select * into selected_student
  from public.student_accounts student
  where upper(student.student_id) = upper(trim(p_student_id))
    and student.password_hash = crypt(p_account_password, student.password_hash)
  order by student.created_at
  limit 1;
  if selected_student.id is null then raise exception 'Tài khoản sinh viên không hợp lệ.'; end if;

  return query
  select progress.skill, progress.module_id, progress.payload, progress.score, progress.completed, progress.updated_at
  from public.ielts_practice_progress progress
  where progress.student_account_id = selected_student.id
  order by progress.updated_at desc;
end;
$$;

revoke all on function public.get_student_ielts_progress(text, text) from public;
grant execute on function public.get_student_ielts_progress(text, text) to anon, authenticated;

create or replace function public.save_student_ielts_progress(
  p_student_id text,
  p_account_password text,
  p_skill text,
  p_module_id text,
  p_payload jsonb,
  p_score numeric,
  p_completed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_student public.student_accounts;
  saved_progress public.ielts_practice_progress;
begin
  if p_skill not in ('listening', 'reading', 'writing', 'speaking') then raise exception 'Kỹ năng IELTS không hợp lệ.'; end if;
  if char_length(trim(p_module_id)) < 1 or char_length(trim(p_module_id)) > 120 then raise exception 'Mã bài luyện không hợp lệ.'; end if;
  if jsonb_typeof(p_payload) <> 'object' or pg_column_size(p_payload) > 200000 then raise exception 'Dữ liệu bài luyện không hợp lệ hoặc quá lớn.'; end if;
  if p_score is not null and (p_score < 0 or p_score > 100) then raise exception 'Điểm bài luyện không hợp lệ.'; end if;

  select * into selected_student
  from public.student_accounts student
  where upper(student.student_id) = upper(trim(p_student_id))
    and student.password_hash = crypt(p_account_password, student.password_hash)
  order by student.created_at
  limit 1;
  if selected_student.id is null then raise exception 'Tài khoản sinh viên không hợp lệ.'; end if;

  insert into public.ielts_practice_progress (
    teacher_id, student_account_id, student_id, skill, module_id, payload, score, completed
  ) values (
    selected_student.teacher_id, selected_student.id, selected_student.student_id,
    p_skill, trim(p_module_id), p_payload, p_score, coalesce(p_completed, false)
  )
  on conflict (student_account_id, skill, module_id) do update
  set payload = excluded.payload,
      score = excluded.score,
      completed = excluded.completed,
      updated_at = now()
  returning * into saved_progress;

  return jsonb_build_object(
    'skill', saved_progress.skill,
    'moduleId', saved_progress.module_id,
    'payload', saved_progress.payload,
    'score', saved_progress.score,
    'completed', saved_progress.completed,
    'updatedAt', saved_progress.updated_at
  );
end;
$$;

revoke all on function public.save_student_ielts_progress(text, text, text, text, jsonb, numeric, boolean) from public;
grant execute on function public.save_student_ielts_progress(text, text, text, text, jsonb, numeric, boolean) to anon, authenticated;

create or replace function public.list_teacher_ielts_progress()
returns table (
  student_id text,
  student_name text,
  listening_completed integer,
  reading_completed integer,
  writing_completed integer,
  speaking_completed integer,
  listening_best_score numeric,
  reading_best_score numeric,
  last_practiced_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    student.student_id,
    student.full_name,
    count(progress.id) filter (where progress.skill = 'listening' and progress.completed)::integer,
    count(progress.id) filter (where progress.skill = 'reading' and progress.completed)::integer,
    count(progress.id) filter (where progress.skill = 'writing' and progress.completed)::integer,
    count(progress.id) filter (where progress.skill = 'speaking' and progress.completed)::integer,
    max(progress.score) filter (where progress.skill = 'listening'),
    max(progress.score) filter (where progress.skill = 'reading'),
    max(progress.updated_at)
  from public.student_accounts student
  left join public.ielts_practice_progress progress on progress.student_account_id = student.id
  where student.teacher_id = auth.uid()
  group by student.id, student.student_id, student.full_name
  order by max(progress.updated_at) desc nulls last, student.created_at desc;
$$;

revoke all on function public.list_teacher_ielts_progress() from public;
grant execute on function public.list_teacher_ielts_progress() to authenticated;

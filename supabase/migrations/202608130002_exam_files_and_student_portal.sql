alter table public.exams add column if not exists access_password_hash text;

update public.exams
set access_password_hash = extensions.crypt('246810', extensions.gen_salt('bf'))
where access_password_hash is null;

alter table public.exams alter column access_password_hash set not null;
alter table public.exams drop constraint if exists exams_status_check;
alter table public.exams add constraint exams_status_check
check (status in ('draft', 'open', 'closed', 'archived'));

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id text not null,
  student_name text not null default '',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  foreign key (exam_id, teacher_id) references public.exams(id, teacher_id) on delete restrict
);

create index if not exists exam_attempts_exam_id_idx on public.exam_attempts(exam_id);
create index if not exists exam_attempts_teacher_id_idx on public.exam_attempts(teacher_id);
alter table public.exam_attempts enable row level security;

drop policy if exists "Teachers read own attempts" on public.exam_attempts;
create policy "Teachers read own attempts" on public.exam_attempts for select to authenticated
using ((select auth.uid()) = teacher_id);

grant select on public.exam_attempts to authenticated;

create table if not exists public.examguard_settings (
  singleton boolean primary key default true check (singleton),
  database_limit_bytes bigint not null default (500 * 1024 * 1024)
);

insert into public.examguard_settings (singleton, database_limit_bytes)
values (true, 500 * 1024 * 1024)
on conflict (singleton) do nothing;

create or replace function public.examguard_storage_status()
returns table (used_bytes bigint, limit_bytes bigint, percent numeric, full boolean)
language sql
security definer
set search_path = ''
as $$
  select
    pg_catalog.pg_database_size(pg_catalog.current_database())::bigint,
    settings.database_limit_bytes,
    round((pg_catalog.pg_database_size(pg_catalog.current_database())::numeric / settings.database_limit_bytes::numeric) * 100, 1),
    pg_catalog.pg_database_size(pg_catalog.current_database()) >= settings.database_limit_bytes - (5 * 1024 * 1024)::bigint
  from public.examguard_settings settings
  where settings.singleton = true;
$$;

revoke all on function public.examguard_storage_status() from public;
grant execute on function public.examguard_storage_status() to authenticated;

create or replace function public.create_exam_file(
  p_bank_id uuid,
  p_code text,
  p_title text,
  p_duration_minutes integer,
  p_question_count integer,
  p_password text
)
returns public.exams
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  owner_id uuid := auth.uid();
  created_exam public.exams;
  estimated_bytes bigint;
  current_bytes bigint;
  storage_limit_bytes bigint;
begin
  if owner_id is null then raise exception 'Bạn cần đăng nhập lại.'; end if;
  if char_length(trim(p_password)) < 4 then raise exception 'Mật khẩu đề cần ít nhất 4 ký tự.'; end if;
  if p_question_count < 1 then raise exception 'Số câu hỏi không hợp lệ.'; end if;
  if not exists (select 1 from public.question_banks where id = p_bank_id and teacher_id = owner_id) then
    raise exception 'Không tìm thấy ngân hàng câu hỏi.';
  end if;
  if (select count(*) from public.questions where bank_id = p_bank_id and teacher_id = owner_id) < p_question_count then
    raise exception 'Ngân hàng chưa đủ số câu để tạo đề.';
  end if;

  select coalesce(sum(pg_column_size(q)), 0) * 2 + 65536
  into estimated_bytes
  from (
    select content, options, correct_answer
    from public.questions
    where bank_id = p_bank_id and teacher_id = owner_id
    order by random()
    limit p_question_count
  ) q;
  current_bytes := pg_catalog.pg_database_size(pg_catalog.current_database());
  select database_limit_bytes into storage_limit_bytes from public.examguard_settings where singleton = true;
  if current_bytes + estimated_bytes >= storage_limit_bytes then
    raise exception 'STORAGE_FULL: Dữ liệu đã đầy, không thể tạo thêm file đề.';
  end if;

  insert into public.exams (
    teacher_id, bank_id, code, title, duration_minutes, question_count, status, access_password_hash
  ) values (
    owner_id, p_bank_id, upper(trim(p_code)), trim(p_title), p_duration_minutes,
    p_question_count, 'draft', crypt(p_password, gen_salt('bf'))
  ) returning * into created_exam;

  insert into public.exam_questions (
    exam_id, teacher_id, question_id, position, content_snapshot, options_snapshot, correct_answer_snapshot
  )
  select created_exam.id, owner_id, selected.id, row_number() over (), selected.content, selected.options, selected.correct_answer
  from (
    select id, content, options, correct_answer
    from public.questions
    where bank_id = p_bank_id and teacher_id = owner_id
    order by random()
    limit p_question_count
  ) selected;

  return created_exam;
end;
$$;

revoke all on function public.create_exam_file(uuid, text, text, integer, integer, text) from public;
grant execute on function public.create_exam_file(uuid, text, text, integer, integer, text) to authenticated;

create or replace function public.set_exam_file_status(p_exam_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare current_status text;
begin
  if p_status not in ('open', 'closed', 'archived') then raise exception 'Trạng thái không hợp lệ.'; end if;
  select status into current_status from public.exams where id = p_exam_id and teacher_id = auth.uid();
  if current_status is null then raise exception 'Không tìm thấy file đề.'; end if;
  if current_status = 'archived' then raise exception 'File đã lưu trữ không thể mở lại.'; end if;
  if p_status = 'archived' and current_status <> 'closed' then raise exception 'Cần khóa đề trước khi lưu trữ.'; end if;
  update public.exams set status = p_status where id = p_exam_id and teacher_id = auth.uid();
end;
$$;

revoke all on function public.set_exam_file_status(uuid, text) from public;
grant execute on function public.set_exam_file_status(uuid, text) to authenticated;

create or replace function public.delete_draft_exam_file(p_exam_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare current_status text;
begin
  select status into current_status from public.exams where id = p_exam_id and teacher_id = auth.uid();
  if current_status is null then raise exception 'Không tìm thấy file đề.'; end if;
  if current_status <> 'draft' then raise exception 'Chỉ được xóa file đề nháp chưa sử dụng.'; end if;
  if exists (select 1 from public.exam_attempts where exam_id = p_exam_id) then
    raise exception 'File đề đã có bài làm và không thể xóa.';
  end if;
  delete from public.exams where id = p_exam_id and teacher_id = auth.uid();
end;
$$;

revoke all on function public.delete_draft_exam_file(uuid) from public;
grant execute on function public.delete_draft_exam_file(uuid) to authenticated;

create or replace function public.list_student_exam_files()
returns table (
  id uuid, code text, title text, teacher_name text,
  duration_minutes integer, question_count integer, status text
)
language sql
security definer
set search_path = ''
as $$
  select e.id, e.code, e.title, p.full_name, e.duration_minutes, e.question_count, e.status
  from public.exams e
  join public.profiles p on p.id = e.teacher_id
  where e.status in ('open', 'closed')
  order by case when e.status = 'open' then 0 else 1 end, e.created_at desc;
$$;

revoke all on function public.list_student_exam_files() from public;
grant execute on function public.list_student_exam_files() to anon, authenticated;

create or replace function public.unlock_exam_file(
  p_exam_id uuid,
  p_student_id text,
  p_student_name text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare selected_exam public.exams;
declare payload jsonb;
begin
  select * into selected_exam from public.exams where id = p_exam_id;
  if selected_exam.id is null then raise exception 'Không tìm thấy file đề.'; end if;
  if selected_exam.status <> 'open' then raise exception 'File đề đang bị khóa.'; end if;
  if selected_exam.access_password_hash <> crypt(p_password, selected_exam.access_password_hash) then
    raise exception 'Mật khẩu file đề chưa đúng.';
  end if;

  insert into public.exam_attempts (exam_id, teacher_id, student_id, student_name)
  values (selected_exam.id, selected_exam.teacher_id, upper(trim(p_student_id)), trim(p_student_name));

  select jsonb_build_object(
    'id', selected_exam.id,
    'code', selected_exam.code,
    'title', selected_exam.title,
    'teacherName', coalesce((select full_name from public.profiles where id = selected_exam.teacher_id), 'Giảng viên'),
    'durationMinutes', selected_exam.duration_minutes,
    'questionCount', selected_exam.question_count,
    'status', selected_exam.status,
    'questions', coalesce(jsonb_agg(jsonb_build_object(
      'id', eq.position,
      'text', eq.content_snapshot,
      'options', eq.options_snapshot
    ) order by eq.position), '[]'::jsonb)
  ) into payload
  from public.exam_questions eq
  where eq.exam_id = selected_exam.id;

  return payload;
end;
$$;

revoke all on function public.unlock_exam_file(uuid, text, text, text) from public;
grant execute on function public.unlock_exam_file(uuid, text, text, text) to anon, authenticated;

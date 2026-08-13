create table if not exists public.student_accounts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id text not null check (char_length(student_id) between 2 and 64),
  full_name text not null check (char_length(full_name) between 2 and 160),
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (teacher_id, student_id)
);

create index if not exists student_accounts_teacher_id_idx on public.student_accounts(teacher_id);
create index if not exists student_accounts_student_id_idx on public.student_accounts(upper(student_id));

drop trigger if exists student_accounts_set_updated_at on public.student_accounts;
create trigger student_accounts_set_updated_at before update on public.student_accounts
for each row execute function public.set_updated_at();

alter table public.student_accounts enable row level security;

drop policy if exists "Teachers manage own student accounts" on public.student_accounts;
create policy "Teachers manage own student accounts" on public.student_accounts for all to authenticated
using ((select auth.uid()) = teacher_id) with check ((select auth.uid()) = teacher_id);

create or replace function public.list_teacher_student_accounts()
returns table (
  id uuid,
  student_id text,
  full_name text,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    student.id,
    student.student_id,
    student.full_name,
    case
      when exists (
        select 1 from public.exam_attempts attempt
        where attempt.teacher_id = student.teacher_id
          and upper(attempt.student_id) = upper(student.student_id)
          and attempt.submitted_at is not null
      ) then 'Đã nộp'
      when exists (
        select 1 from public.exam_attempts attempt
        where attempt.teacher_id = student.teacher_id
          and upper(attempt.student_id) = upper(student.student_id)
      ) then 'Đang thi'
      else 'Chưa thi'
    end,
    student.created_at
  from public.student_accounts student
  where student.teacher_id = auth.uid()
  order by student.created_at desc;
$$;

revoke all on function public.list_teacher_student_accounts() from public;
grant execute on function public.list_teacher_student_accounts() to authenticated;

create or replace function public.create_student_account(
  p_student_id text,
  p_full_name text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  owner_id uuid := auth.uid();
  created_student public.student_accounts;
begin
  if owner_id is null then raise exception 'Bạn cần đăng nhập lại.'; end if;
  if char_length(trim(p_student_id)) < 2 then raise exception 'Mã sinh viên cần ít nhất 2 ký tự.'; end if;
  if char_length(trim(p_full_name)) < 2 then raise exception 'Họ tên sinh viên chưa hợp lệ.'; end if;
  if char_length(p_password) < 6 then raise exception 'Mật khẩu sinh viên cần ít nhất 6 ký tự.'; end if;

  insert into public.student_accounts (teacher_id, student_id, full_name, password_hash)
  values (owner_id, upper(trim(p_student_id)), trim(p_full_name), crypt(p_password, gen_salt('bf')))
  returning * into created_student;

  return jsonb_build_object(
    'id', created_student.id,
    'studentId', created_student.student_id,
    'fullName', created_student.full_name,
    'status', 'Chưa thi',
    'createdAt', created_student.created_at
  );
exception
  when unique_violation then
    raise exception 'Mã sinh viên đã tồn tại trong danh sách của bạn.';
end;
$$;

revoke all on function public.create_student_account(text, text, text) from public;
grant execute on function public.create_student_account(text, text, text) to authenticated;

create or replace function public.reset_student_account_password(
  p_account_id uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if char_length(p_password) < 6 then raise exception 'Mật khẩu sinh viên cần ít nhất 6 ký tự.'; end if;
  update public.student_accounts
  set password_hash = crypt(p_password, gen_salt('bf'))
  where id = p_account_id and teacher_id = auth.uid();
  if not found then raise exception 'Không tìm thấy tài khoản sinh viên.'; end if;
end;
$$;

revoke all on function public.reset_student_account_password(uuid, text) from public;
grant execute on function public.reset_student_account_password(uuid, text) to authenticated;

create or replace function public.delete_student_account(p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.student_accounts where id = p_account_id and teacher_id = auth.uid();
  if not found then raise exception 'Không tìm thấy tài khoản sinh viên.'; end if;
end;
$$;

revoke all on function public.delete_student_account(uuid) from public;
grant execute on function public.delete_student_account(uuid) to authenticated;

create or replace function public.login_student_account(
  p_student_id text,
  p_password text
)
returns jsonb
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
    and student.password_hash = crypt(p_password, student.password_hash)
  order by student.created_at
  limit 1;

  if selected_student.id is null then raise exception 'Mã sinh viên hoặc mật khẩu chưa đúng.'; end if;
  return jsonb_build_object('id', selected_student.student_id, 'name', selected_student.full_name);
end;
$$;

revoke all on function public.login_student_account(text, text) from public;
grant execute on function public.login_student_account(text, text) to anon, authenticated;

drop function if exists public.list_student_exam_files();
create or replace function public.list_student_exam_files(
  p_student_id text,
  p_account_password text
)
returns table (
  id uuid, code text, title text, teacher_name text,
  duration_minutes integer, question_count integer, status text
)
language sql
security definer
set search_path = public, extensions
as $$
  select e.id, e.code, e.title, p.full_name, e.duration_minutes, e.question_count, e.status
  from public.exams e
  join public.profiles p on p.id = e.teacher_id
  where e.status in ('open', 'closed')
    and exists (
      select 1
      from public.student_accounts student
      where student.teacher_id = e.teacher_id
        and upper(student.student_id) = upper(trim(p_student_id))
        and student.password_hash = crypt(p_account_password, student.password_hash)
    )
  order by case when e.status = 'open' then 0 else 1 end, e.created_at desc;
$$;

revoke all on function public.list_student_exam_files(text, text) from public;
grant execute on function public.list_student_exam_files(text, text) to anon, authenticated;

drop function if exists public.unlock_exam_file(uuid, text, text, text);
create or replace function public.unlock_exam_file(
  p_exam_id uuid,
  p_student_id text,
  p_account_password text,
  p_exam_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_exam public.exams;
  selected_student public.student_accounts;
  payload jsonb;
begin
  select * into selected_exam from public.exams where id = p_exam_id;
  if selected_exam.id is null then raise exception 'Không tìm thấy file đề.'; end if;
  if selected_exam.status <> 'open' then raise exception 'File đề đang bị khóa.'; end if;

  select * into selected_student
  from public.student_accounts student
  where student.teacher_id = selected_exam.teacher_id
    and upper(student.student_id) = upper(trim(p_student_id))
    and student.password_hash = crypt(p_account_password, student.password_hash)
  limit 1;
  if selected_student.id is null then raise exception 'Tài khoản sinh viên không được cấp quyền với đề này.'; end if;

  if selected_exam.access_password_hash <> crypt(p_exam_password, selected_exam.access_password_hash) then
    raise exception 'Mật khẩu file đề chưa đúng.';
  end if;

  insert into public.exam_attempts (exam_id, teacher_id, student_id, student_name)
  values (selected_exam.id, selected_exam.teacher_id, selected_student.student_id, selected_student.full_name);

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

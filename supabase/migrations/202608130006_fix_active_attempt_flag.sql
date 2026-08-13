create or replace function public.list_student_exam_files(
  p_student_id text,
  p_account_password text
)
returns table (
  id uuid,
  code text,
  title text,
  teacher_name text,
  duration_minutes integer,
  question_count integer,
  status text,
  assigned_at timestamptz,
  max_attempts integer,
  attempt_count integer,
  has_active_attempt boolean
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    exam.id,
    exam.code,
    exam.title,
    profile.full_name,
    exam.duration_minutes,
    exam.question_count,
    exam.status,
    exam.assigned_at,
    exam.max_attempts,
    count(attempt.id)::integer,
    coalesce(bool_or(attempt.id is not null and attempt.submitted_at is null), false)
  from public.exams exam
  join public.profiles profile on profile.id = exam.teacher_id
  join public.student_accounts student
    on student.teacher_id = exam.teacher_id
   and upper(student.student_id) = upper(trim(p_student_id))
   and student.password_hash = crypt(p_account_password, student.password_hash)
  left join public.exam_attempts attempt
    on attempt.exam_id = exam.id
   and upper(attempt.student_id) = upper(student.student_id)
  where exam.status in ('open', 'closed')
  group by exam.id, profile.full_name
  order by case when exam.status = 'open' then 0 else 1 end, exam.assigned_at desc, exam.created_at desc;
$$;

revoke all on function public.list_student_exam_files(text, text) from public;
grant execute on function public.list_student_exam_files(text, text) to anon, authenticated;

create table if not exists public.proctor_events (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id text not null check (char_length(student_id) between 2 and 64),
  student_name text not null check (char_length(student_name) between 2 and 160),
  event_type text not null check (event_type in (
    'TAB_HIDDEN', 'WINDOW_BLUR', 'EXIT_FULLSCREEN',
    'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT',
    'NO_FACE', 'MULTIPLE_FACES', 'LOOK_AWAY',
    'PHONE_DETECTED', 'CAMERA_OFF', 'SCREEN_SHARE_STOPPED'
  )),
  severity text not null check (severity in ('low', 'medium', 'high')),
  detail text not null check (char_length(detail) between 1 and 500),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  occurred_at timestamptz not null default now(),
  foreign key (exam_id, teacher_id) references public.exams(id, teacher_id) on delete cascade
);

create index if not exists proctor_events_teacher_time_idx
on public.proctor_events(teacher_id, occurred_at desc);
create index if not exists proctor_events_exam_idx on public.proctor_events(exam_id);

alter table public.proctor_events enable row level security;

drop policy if exists "Teachers read own proctor events" on public.proctor_events;
create policy "Teachers read own proctor events" on public.proctor_events for select to authenticated
using ((select auth.uid()) = teacher_id);

grant select on public.proctor_events to authenticated;

create or replace function public.record_proctor_event(
  p_exam_id uuid,
  p_student_id text,
  p_account_password text,
  p_event_type text,
  p_severity text,
  p_detail text,
  p_duration_ms integer default null,
  p_confidence numeric default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_exam public.exams;
  selected_student public.student_accounts;
  created_event_id uuid;
begin
  if p_event_type not in (
    'TAB_HIDDEN', 'WINDOW_BLUR', 'EXIT_FULLSCREEN',
    'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CUT_ATTEMPT',
    'NO_FACE', 'MULTIPLE_FACES', 'LOOK_AWAY',
    'PHONE_DETECTED', 'CAMERA_OFF', 'SCREEN_SHARE_STOPPED'
  ) then raise exception 'Loại sự kiện không hợp lệ.'; end if;
  if p_severity not in ('low', 'medium', 'high') then raise exception 'Mức độ sự kiện không hợp lệ.'; end if;
  if char_length(trim(p_detail)) < 1 then raise exception 'Chi tiết sự kiện không hợp lệ.'; end if;
  if p_duration_ms is not null and p_duration_ms < 0 then raise exception 'Thời lượng sự kiện không hợp lệ.'; end if;
  if p_confidence is not null and (p_confidence < 0 or p_confidence > 1) then raise exception 'Độ tin cậy không hợp lệ.'; end if;

  select * into selected_exam from public.exams where id = p_exam_id;
  if selected_exam.id is null then raise exception 'Không tìm thấy file đề.'; end if;

  select * into selected_student
  from public.student_accounts student
  where student.teacher_id = selected_exam.teacher_id
    and upper(student.student_id) = upper(trim(p_student_id))
    and student.password_hash = crypt(p_account_password, student.password_hash)
  limit 1;
  if selected_student.id is null then raise exception 'Tài khoản sinh viên không có quyền ghi sự kiện cho đề này.'; end if;

  insert into public.proctor_events (
    exam_id, teacher_id, student_id, student_name, event_type,
    severity, detail, duration_ms, confidence
  ) values (
    selected_exam.id, selected_exam.teacher_id, selected_student.student_id,
    selected_student.full_name, p_event_type, p_severity,
    left(trim(p_detail), 500), p_duration_ms, p_confidence
  ) returning id into created_event_id;

  return created_event_id;
end;
$$;

revoke all on function public.record_proctor_event(uuid, text, text, text, text, text, integer, numeric) from public;
grant execute on function public.record_proctor_event(uuid, text, text, text, text, text, integer, numeric) to anon, authenticated;

create or replace function public.list_teacher_proctor_events(p_limit integer default 300)
returns table (
  id uuid,
  exam_id uuid,
  exam_code text,
  student_id text,
  student_name text,
  event_type text,
  severity text,
  detail text,
  duration_ms integer,
  confidence numeric,
  occurred_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    event.id, event.exam_id, exam.code, event.student_id, event.student_name,
    event.event_type, event.severity, event.detail, event.duration_ms,
    event.confidence, event.occurred_at
  from public.proctor_events event
  join public.exams exam on exam.id = event.exam_id and exam.teacher_id = event.teacher_id
  where event.teacher_id = auth.uid()
  order by event.occurred_at desc
  limit greatest(1, least(coalesce(p_limit, 300), 1000));
$$;

revoke all on function public.list_teacher_proctor_events(integer) from public;
grant execute on function public.list_teacher_proctor_events(integer) to authenticated;

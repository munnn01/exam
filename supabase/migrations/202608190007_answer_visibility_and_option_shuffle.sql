alter table public.exams add column if not exists show_answers boolean not null default false;

create table if not exists public.exam_attempt_questions (
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  exam_id uuid not null,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  position integer not null check (position > 0),
  content_snapshot text not null,
  options_snapshot jsonb not null check (jsonb_typeof(options_snapshot) = 'array' and jsonb_array_length(options_snapshot) = 4),
  correct_answer_snapshot smallint not null check (correct_answer_snapshot between 0 and 3),
  primary key (attempt_id, position),
  foreign key (exam_id, teacher_id) references public.exams(id, teacher_id) on delete cascade
);

create index if not exists exam_attempt_questions_exam_idx on public.exam_attempt_questions(exam_id);
create index if not exists exam_attempt_questions_teacher_idx on public.exam_attempt_questions(teacher_id);
alter table public.exam_attempt_questions enable row level security;
drop policy if exists "Teachers read own attempt questions" on public.exam_attempt_questions;
create policy "Teachers read own attempt questions" on public.exam_attempt_questions for select to authenticated
using ((select auth.uid()) = teacher_id);
grant select on public.exam_attempt_questions to authenticated;

insert into public.exam_attempt_questions (
  attempt_id, exam_id, teacher_id, position, content_snapshot, options_snapshot, correct_answer_snapshot
)
select
  attempt.id, question.exam_id, question.teacher_id, question.position,
  question.content_snapshot, question.options_snapshot, question.correct_answer_snapshot
from public.exam_attempts attempt
join public.exam_questions question on question.exam_id = attempt.exam_id and question.teacher_id = attempt.teacher_id
on conflict (attempt_id, position) do nothing;

drop function if exists public.create_exam_file(uuid, text, text, integer, integer, text, timestamptz, integer);
create or replace function public.create_exam_file(
  p_bank_id uuid,
  p_code text,
  p_title text,
  p_duration_minutes integer,
  p_question_count integer,
  p_password text,
  p_assigned_at timestamptz,
  p_max_attempts integer,
  p_show_answers boolean
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
  if p_max_attempts < 1 or p_max_attempts > 20 then raise exception 'Số lượt làm phải từ 1 đến 20.'; end if;
  if p_assigned_at is null then raise exception 'Ngày giao đề chưa hợp lệ.'; end if;
  if p_show_answers is null then raise exception 'Chế độ hiển thị đáp án chưa hợp lệ.'; end if;
  if not exists (select 1 from public.question_banks where id = p_bank_id and teacher_id = owner_id) then
    raise exception 'Không tìm thấy ngân hàng câu hỏi.';
  end if;
  if (select count(*) from public.questions where bank_id = p_bank_id and teacher_id = owner_id) < p_question_count then
    raise exception 'Ngân hàng chưa đủ số câu để tạo đề.';
  end if;

  select coalesce(sum(pg_column_size(question)), 0) * 2 + 65536
  into estimated_bytes
  from (
    select content, options, correct_answer
    from public.questions
    where bank_id = p_bank_id and teacher_id = owner_id
    order by random()
    limit p_question_count
  ) question;
  current_bytes := pg_catalog.pg_database_size(pg_catalog.current_database());
  select database_limit_bytes into storage_limit_bytes from public.examguard_settings where singleton = true;
  if current_bytes + estimated_bytes >= storage_limit_bytes then
    raise exception 'STORAGE_FULL: Dữ liệu đã đầy, không thể tạo thêm file đề.';
  end if;

  insert into public.exams (
    teacher_id, bank_id, code, title, duration_minutes, question_count, status,
    access_password_hash, assigned_at, max_attempts, show_answers
  ) values (
    owner_id, p_bank_id, upper(trim(p_code)), trim(p_title), p_duration_minutes,
    p_question_count, 'draft', crypt(p_password, gen_salt('bf')), p_assigned_at,
    p_max_attempts, p_show_answers
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

revoke all on function public.create_exam_file(uuid, text, text, integer, integer, text, timestamptz, integer, boolean) from public;
grant execute on function public.create_exam_file(uuid, text, text, integer, integer, text, timestamptz, integer, boolean) to authenticated;

drop function if exists public.update_exam_delivery_settings(uuid, timestamptz, integer);
create or replace function public.update_exam_delivery_settings(
  p_exam_id uuid,
  p_assigned_at timestamptz,
  p_max_attempts integer,
  p_show_answers boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  largest_attempt_count integer;
begin
  if p_assigned_at is null then raise exception 'Ngày giao đề chưa hợp lệ.'; end if;
  if p_max_attempts < 1 or p_max_attempts > 20 then raise exception 'Số lượt làm phải từ 1 đến 20.'; end if;
  if p_show_answers is null then raise exception 'Chế độ hiển thị đáp án chưa hợp lệ.'; end if;
  if not exists (select 1 from public.exams where id = p_exam_id and teacher_id = auth.uid()) then
    raise exception 'Không tìm thấy file đề.';
  end if;

  select coalesce(max(grouped.attempt_count), 0) into largest_attempt_count
  from (
    select count(*)::integer as attempt_count
    from public.exam_attempts
    where exam_id = p_exam_id and teacher_id = auth.uid()
    group by upper(student_id)
  ) grouped;
  if p_max_attempts < largest_attempt_count then
    raise exception 'Không thể đặt ít hơn số lượt một sinh viên đã bắt đầu (%).', largest_attempt_count;
  end if;

  update public.exams
  set assigned_at = p_assigned_at, max_attempts = p_max_attempts, show_answers = p_show_answers
  where id = p_exam_id and teacher_id = auth.uid();
end;
$$;

revoke all on function public.update_exam_delivery_settings(uuid, timestamptz, integer, boolean) from public;
grant execute on function public.update_exam_delivery_settings(uuid, timestamptz, integer, boolean) to authenticated;

drop function if exists public.list_student_exam_files(text, text);
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
  has_active_attempt boolean,
  show_answers boolean
)
language sql
security definer
set search_path = public, extensions
as $$
  select
    exam.id, exam.code, exam.title, profile.full_name, exam.duration_minutes,
    exam.question_count, exam.status, exam.assigned_at, exam.max_attempts,
    count(attempt.id)::integer,
    coalesce(bool_or(attempt.id is not null and attempt.submitted_at is null), false),
    exam.show_answers
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
  selected_attempt public.exam_attempts;
  source_question record;
  option_order integer[];
  attempts_used integer;
  remaining_seconds integer;
  payload jsonb;
begin
  select * into selected_exam from public.exams where id = p_exam_id;
  if selected_exam.id is null then raise exception 'Không tìm thấy file đề.'; end if;
  if selected_exam.status <> 'open' then raise exception 'File đề đang bị khóa.'; end if;
  if selected_exam.assigned_at > now() then
    raise exception 'Đề chưa đến ngày giao (%).', to_char(selected_exam.assigned_at at time zone 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI');
  end if;

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

  select * into selected_attempt
  from public.exam_attempts attempt
  where attempt.exam_id = selected_exam.id
    and upper(attempt.student_id) = upper(selected_student.student_id)
    and attempt.submitted_at is null
  order by attempt.started_at desc
  limit 1;

  if selected_attempt.id is not null
    and selected_attempt.started_at + make_interval(mins => selected_exam.duration_minutes) <= now() then
    update public.exam_attempts attempt
    set submitted_at = now(),
        score = (
          select count(*)::numeric
          from public.exam_attempt_questions question
          where question.attempt_id = selected_attempt.id
            and (attempt.answers ->> question.position::text)::integer = question.correct_answer_snapshot
        )
    where attempt.id = selected_attempt.id;
    selected_attempt := null;
  end if;

  if selected_attempt.id is null then
    select count(*)::integer into attempts_used
    from public.exam_attempts attempt
    where attempt.exam_id = selected_exam.id
      and upper(attempt.student_id) = upper(selected_student.student_id);
    if attempts_used >= selected_exam.max_attempts then
      raise exception 'Bạn đã sử dụng hết % lượt làm bài.', selected_exam.max_attempts;
    end if;

    insert into public.exam_attempts (
      exam_id, teacher_id, student_id, student_name, attempt_number, answers, last_saved_at
    ) values (
      selected_exam.id, selected_exam.teacher_id, selected_student.student_id,
      selected_student.full_name, attempts_used + 1, '{}'::jsonb, now()
    ) returning * into selected_attempt;

    for source_question in
      select * from public.exam_questions
      where exam_id = selected_exam.id
      order by position
    loop
      select array_agg(option_index order by random())
      into option_order
      from generate_series(0, 3) option_index;

      insert into public.exam_attempt_questions (
        attempt_id, exam_id, teacher_id, position, content_snapshot,
        options_snapshot, correct_answer_snapshot
      ) values (
        selected_attempt.id, selected_exam.id, selected_exam.teacher_id,
        source_question.position, source_question.content_snapshot,
        jsonb_build_array(
          source_question.options_snapshot -> option_order[1],
          source_question.options_snapshot -> option_order[2],
          source_question.options_snapshot -> option_order[3],
          source_question.options_snapshot -> option_order[4]
        ),
        (array_position(option_order, source_question.correct_answer_snapshot::integer) - 1)::smallint
      );
    end loop;
  end if;

  if not exists (select 1 from public.exam_attempt_questions where attempt_id = selected_attempt.id) then
    insert into public.exam_attempt_questions (
      attempt_id, exam_id, teacher_id, position, content_snapshot, options_snapshot, correct_answer_snapshot
    )
    select selected_attempt.id, question.exam_id, question.teacher_id, question.position,
      question.content_snapshot, question.options_snapshot, question.correct_answer_snapshot
    from public.exam_questions question
    where question.exam_id = selected_exam.id;
  end if;

  remaining_seconds := greatest(
    0,
    selected_exam.duration_minutes * 60 - floor(extract(epoch from (now() - selected_attempt.started_at)))::integer
  );

  select jsonb_build_object(
    'id', selected_exam.id,
    'code', selected_exam.code,
    'title', selected_exam.title,
    'teacherName', coalesce((select full_name from public.profiles where id = selected_exam.teacher_id), 'Giảng viên'),
    'durationMinutes', selected_exam.duration_minutes,
    'questionCount', selected_exam.question_count,
    'status', selected_exam.status,
    'assignedAt', selected_exam.assigned_at,
    'maxAttempts', selected_exam.max_attempts,
    'attemptCount', selected_attempt.attempt_number,
    'hasActiveAttempt', true,
    'showAnswers', selected_exam.show_answers,
    'attemptId', selected_attempt.id,
    'attemptNumber', selected_attempt.attempt_number,
    'startedAt', selected_attempt.started_at,
    'remainingSeconds', remaining_seconds,
    'savedAnswers', selected_attempt.answers,
    'questions', coalesce(jsonb_agg(jsonb_build_object(
      'id', question.position,
      'text', question.content_snapshot,
      'options', question.options_snapshot
    ) order by question.position), '[]'::jsonb)
  ) into payload
  from public.exam_attempt_questions question
  where question.attempt_id = selected_attempt.id;

  return payload;
end;
$$;

revoke all on function public.unlock_exam_file(uuid, text, text, text) from public;
grant execute on function public.unlock_exam_file(uuid, text, text, text) to anon, authenticated;

create or replace function public.save_exam_answers(
  p_attempt_id uuid,
  p_student_id text,
  p_account_password text,
  p_answers jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_attempt public.exam_attempts;
  selected_exam public.exams;
  answer_entry record;
  answer_position integer;
  answer_value integer;
  saved_at timestamptz := now();
begin
  if jsonb_typeof(p_answers) <> 'object' then raise exception 'Dữ liệu đáp án không hợp lệ.'; end if;
  select * into selected_attempt from public.exam_attempts where id = p_attempt_id;
  if selected_attempt.id is null then raise exception 'Không tìm thấy lượt làm bài.'; end if;
  select * into selected_exam from public.exams where id = selected_attempt.exam_id and teacher_id = selected_attempt.teacher_id;
  if selected_attempt.submitted_at is not null then raise exception 'Bài làm đã được nộp.'; end if;
  if selected_attempt.started_at + make_interval(mins => selected_exam.duration_minutes) + interval '90 seconds' < now() then
    raise exception 'Lượt làm bài đã hết thời gian.';
  end if;
  if not exists (
    select 1 from public.student_accounts student
    where student.teacher_id = selected_attempt.teacher_id
      and upper(student.student_id) = upper(trim(p_student_id))
      and upper(selected_attempt.student_id) = upper(student.student_id)
      and student.password_hash = crypt(p_account_password, student.password_hash)
  ) then raise exception 'Tài khoản sinh viên không có quyền lưu bài này.'; end if;

  for answer_entry in select key, value from jsonb_each_text(p_answers)
  loop
    if answer_entry.key !~ '^[0-9]+$' then raise exception 'Vị trí câu hỏi không hợp lệ.'; end if;
    answer_position := answer_entry.key::integer;
    answer_value := answer_entry.value::integer;
    if answer_value < 0 or answer_value > 3 then raise exception 'Đáp án lựa chọn không hợp lệ.'; end if;
    if not exists (
      select 1 from public.exam_attempt_questions question
      where question.attempt_id = selected_attempt.id and question.position = answer_position
    ) then raise exception 'Không tìm thấy câu hỏi trong lượt làm.'; end if;

    if (selected_attempt.answers ->> answer_entry.key) is distinct from answer_entry.value then
      insert into public.exam_answer_history (
        attempt_id, exam_id, teacher_id, student_id, question_position, selected_answer, changed_at
      ) values (
        selected_attempt.id, selected_attempt.exam_id, selected_attempt.teacher_id,
        selected_attempt.student_id, answer_position, answer_value, saved_at
      );
    end if;
  end loop;

  update public.exam_attempts set answers = answers || p_answers, last_saved_at = saved_at
  where id = selected_attempt.id;
  return saved_at;
exception
  when invalid_text_representation then raise exception 'Dữ liệu đáp án không hợp lệ.';
end;
$$;

revoke all on function public.save_exam_answers(uuid, text, text, jsonb) from public;
grant execute on function public.save_exam_answers(uuid, text, text, jsonb) to anon, authenticated;

create or replace function public.submit_exam_attempt(
  p_attempt_id uuid,
  p_student_id text,
  p_account_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_attempt public.exam_attempts;
  selected_exam public.exams;
  final_score numeric;
  total_questions integer;
  submitted_time timestamptz;
  correct_answers jsonb;
begin
  select * into selected_attempt from public.exam_attempts where id = p_attempt_id;
  if selected_attempt.id is null then raise exception 'Không tìm thấy lượt làm bài.'; end if;
  select * into selected_exam from public.exams where id = selected_attempt.exam_id and teacher_id = selected_attempt.teacher_id;
  if not exists (
    select 1 from public.student_accounts student
    where student.teacher_id = selected_attempt.teacher_id
      and upper(student.student_id) = upper(trim(p_student_id))
      and upper(selected_attempt.student_id) = upper(student.student_id)
      and student.password_hash = crypt(p_account_password, student.password_hash)
  ) then raise exception 'Tài khoản sinh viên không có quyền nộp bài này.'; end if;

  if selected_attempt.submitted_at is null then
    select
      count(*) filter (
        where (selected_attempt.answers ->> question.position::text)::integer = question.correct_answer_snapshot
      )::numeric,
      count(*)::integer
    into final_score, total_questions
    from public.exam_attempt_questions question
    where question.attempt_id = selected_attempt.id;
    submitted_time := now();
    update public.exam_attempts
    set submitted_at = submitted_time, score = final_score, last_saved_at = coalesce(last_saved_at, submitted_time)
    where id = selected_attempt.id;
  else
    final_score := selected_attempt.score;
    submitted_time := selected_attempt.submitted_at;
    select count(*)::integer into total_questions
    from public.exam_attempt_questions where attempt_id = selected_attempt.id;
  end if;

  if selected_exam.show_answers then
    select coalesce(jsonb_object_agg(position::text, correct_answer_snapshot), '{}'::jsonb)
    into correct_answers
    from public.exam_attempt_questions
    where attempt_id = selected_attempt.id;
  end if;

  return jsonb_build_object(
    'score', case when selected_exam.show_answers then final_score else null end,
    'total', total_questions,
    'submittedAt', submitted_time,
    'attemptNumber', selected_attempt.attempt_number,
    'showAnswers', selected_exam.show_answers,
    'correctAnswers', case when selected_exam.show_answers then correct_answers else null end
  );
end;
$$;

revoke all on function public.submit_exam_attempt(uuid, text, text) from public;
grant execute on function public.submit_exam_attempt(uuid, text, text) to anon, authenticated;

create or replace function public.get_teacher_attempt_history(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payload jsonb;
begin
  if not exists (
    select 1 from public.exam_attempts where id = p_attempt_id and teacher_id = auth.uid()
  ) then raise exception 'Không tìm thấy bài làm.'; end if;

  select jsonb_build_object(
    'id', attempt.id,
    'examCode', exam.code,
    'examTitle', exam.title,
    'studentId', attempt.student_id,
    'studentName', attempt.student_name,
    'attemptNumber', attempt.attempt_number,
    'startedAt', attempt.started_at,
    'lastSavedAt', attempt.last_saved_at,
    'submittedAt', attempt.submitted_at,
    'score', attempt.score,
    'questionCount', exam.question_count,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'position', question.position,
        'content', question.content_snapshot,
        'options', question.options_snapshot,
        'correctAnswer', question.correct_answer_snapshot,
        'selectedAnswer', case
          when attempt.answers ? question.position::text then (attempt.answers ->> question.position::text)::integer
          else null
        end
      ) order by question.position)
      from public.exam_attempt_questions question
      where question.attempt_id = attempt.id
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'questionPosition', history.question_position,
        'selectedAnswer', history.selected_answer,
        'changedAt', history.changed_at
      ) order by history.changed_at)
      from public.exam_answer_history history
      where history.attempt_id = attempt.id
    ), '[]'::jsonb)
  ) into payload
  from public.exam_attempts attempt
  join public.exams exam on exam.id = attempt.exam_id and exam.teacher_id = attempt.teacher_id
  where attempt.id = p_attempt_id and attempt.teacher_id = auth.uid();

  return payload;
end;
$$;

revoke all on function public.get_teacher_attempt_history(uuid) from public;
grant execute on function public.get_teacher_attempt_history(uuid) to authenticated;

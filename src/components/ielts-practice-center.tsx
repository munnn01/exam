"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  Headphones,
  Lightbulb,
  LoaderCircle,
  Mic2,
  Pause,
  PenLine,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Square,
  Target,
  Volume2,
  X,
} from "lucide-react";
import { IELTS_SKILLS, LISTENING_PRACTICE, READING_PRACTICE, SPEAKING_PRACTICE, WRITING_TASKS, type IeltsChoiceQuestion } from "@/lib/ielts-data";
import { listIeltsProgress, saveIeltsProgress } from "@/lib/ielts-progress-store";
import type { IeltsProgressRecord, IeltsSkill, StudentCredential } from "@/lib/types";

const icons = { listening: Headphones, reading: BookOpen, writing: PenLine, speaking: Mic2 };
const moduleTotals: Record<IeltsSkill, number> = { listening: 1, reading: 1, writing: 2, speaking: 3 };

export function IeltsPracticeCenter({ student }: { student: StudentCredential }) {
  const [activeSkill, setActiveSkill] = useState<IeltsSkill | null>(null);
  const [progress, setProgress] = useState<IeltsProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void listIeltsProgress(student)
      .then((records) => { if (!cancelled) setProgress(records); })
      .catch((cause) => { if (!cancelled) setMessage(cause instanceof Error ? cause.message : "Không tải được tiến độ IELTS."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [student]);

  const persist = useCallback(async (input: Omit<IeltsProgressRecord, "updatedAt">) => {
    const saved = await saveIeltsProgress(student, input);
    setProgress((current) => [saved, ...current.filter((item) => !(item.skill === saved.skill && item.moduleId === saved.moduleId))]);
  }, [student]);

  const skill = useMemo(() => IELTS_SKILLS.find((item) => item.id === activeSkill), [activeSkill]);
  const completedSkillCount = IELTS_SKILLS.filter((item) => progress.some((record) => record.skill === item.id && record.completed)).length;

  if (skill) {
    return <section className="mx-auto max-w-[1240px] px-5 py-7 lg:px-8 lg:py-9">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button className="secondary-button" onClick={() => setActiveSkill(null)}><ArrowLeft className="h-4 w-4" /> Tổng quan IELTS</button>
        <div className="text-xs font-semibold text-slate-500">Tiến độ được lưu cho <strong className="text-slate-800">{student.id}</strong></div>
      </div>
      {message && <Notice text={message} onClose={() => setMessage("")} />}
      {skill.id === "listening" && <ListeningPractice records={progress} onSave={persist} />}
      {skill.id === "reading" && <ReadingPractice records={progress} onSave={persist} />}
      {skill.id === "writing" && <WritingPractice records={progress} onSave={persist} />}
      {skill.id === "speaking" && <SpeakingPractice records={progress} onSave={persist} />}
    </section>;
  }

  return <section className="mx-auto max-w-[1180px] px-5 py-9 lg:px-8 lg:py-12">
    <div className="rounded-[26px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-7 text-white md:p-10">
      <div className="text-[10px] font-bold uppercase tracking-[.2em] text-teal-200">IELTS Academic Practice</div>
      <div className="mt-4 grid gap-7 lg:grid-cols-[1fr_300px] lg:items-end">
        <div><h1 className="max-w-3xl text-4xl font-bold tracking-[-.055em] md:text-5xl">Luyện đủ 4 kỹ năng trên một lộ trình</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-teal-50/75">Xin chào {student.name}. Chọn một kỹ năng để luyện theo cấu trúc IELTS Academic và lưu tiến độ của riêng bạn.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur"><div className="flex items-center justify-between text-xs font-bold text-teal-100"><span>Mục tiêu 4 kỹ năng</span>{loading && <LoaderCircle className="h-4 w-4 animate-spin" />}</div><div className="mt-3 flex items-end gap-2"><span className="text-4xl font-bold">{completedSkillCount}</span><span className="pb-1 text-xs text-teal-100/70">/ 4 kỹ năng</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-teal-300 transition-all" style={{ width: `${completedSkillCount * 25}%` }} /></div></div>
      </div>
    </div>
    {message && <div className="mt-5"><Notice text={message} onClose={() => setMessage("")} /></div>}
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{IELTS_SKILLS.map((item) => {
      const Icon = icons[item.id];
      const completed = progress.filter((record) => record.skill === item.id && record.completed).length;
      const percent = Math.min(100, Math.round(completed / moduleTotals[item.id] * 100));
      const best = progress.filter((record) => record.skill === item.id && record.score !== null).reduce<number | null>((value, record) => value === null ? record.score : Math.max(value, record.score ?? 0), null);
      return <button key={item.id} className="panel group p-5 text-left transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl" onClick={() => setActiveSkill(item.id)}><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon className="h-5 w-5" /></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">{percent}% hoàn thành</span></div><h2 className="mt-5 text-xl font-bold tracking-[-.035em] text-slate-950">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.vietnamese}</p><div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${percent}%` }} /></div><div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-[11px] text-slate-600"><div className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5 text-slate-400" /> {item.time}</div><div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-slate-400" /> {best === null ? item.format : `Điểm tốt nhất: ${Math.round(best)}%`}</div></div><div className="mt-5 text-xs font-bold text-teal-700">Mở bài luyện →</div></button>;
    })}</div>
    <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-xs leading-5 text-sky-900"><strong>Lộ trình gợi ý:</strong> luyện Listening và Reading để nhận điểm tự động; Writing lưu bài theo Task 1/2; Speaking cho phép ghi âm, nghe lại và tự đánh giá theo 4 tiêu chí IELTS.</div>
  </section>;
}

function ListeningPractice({ records, onSave }: PracticeProps) {
  const record = findRecord(records, "listening", LISTENING_PRACTICE.id);
  const [answers, setAnswers] = useState<Record<string, number>>(() => savedAnswers(record));
  const [submitted, setSubmitted] = useState(Boolean(record?.completed));
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const score = countCorrect(LISTENING_PRACTICE.questions, answers);

  useEffect(() => () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);

  const play = () => {
    if (!("speechSynthesis" in window)) { setError("Trình duyệt này chưa hỗ trợ phát bài nghe. Hãy dùng Chrome hoặc Edge bản mới."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(LISTENING_PRACTICE.transcript);
    utterance.lang = "en-GB";
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en-gb")) ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ?? null;
    utterance.onend = () => { setPlaying(false); setPaused(false); };
    utterance.onerror = () => { setPlaying(false); setPaused(false); setError("Không thể phát giọng đọc trên thiết bị này."); };
    setPlaying(true); setPaused(false); setError(""); window.speechSynthesis.speak(utterance);
  };

  const togglePause = () => {
    if (paused) { window.speechSynthesis.resume(); setPaused(false); }
    else { window.speechSynthesis.pause(); setPaused(true); }
  };

  const submit = async () => {
    if (Object.keys(answers).length < LISTENING_PRACTICE.questions.length) { setError("Hãy trả lời đủ 5 câu trước khi chấm bài."); return; }
    setBusy(true); setError("");
    try {
      await onSave({ skill: "listening", moduleId: LISTENING_PRACTICE.id, payload: { answers, correct: score, total: LISTENING_PRACTICE.questions.length }, score: score / LISTENING_PRACTICE.questions.length * 100, completed: true });
      setSubmitted(true); window.speechSynthesis?.cancel(); setPlaying(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được kết quả."); }
    finally { setBusy(false); }
  };

  return <div><PracticeTitle icon={Headphones} eyebrow={LISTENING_PRACTICE.part} title="Listening practice" copy="Nghe đoạn hướng dẫn và chọn đáp án. Transcript chỉ mở sau khi chấm bài." />
    <div className="mt-6 grid gap-6 xl:grid-cols-[340px_1fr]">
      <aside className="space-y-5"><div className="panel overflow-hidden"><div className="bg-gradient-to-br from-sky-900 to-teal-800 p-6 text-white"><Volume2 className="h-7 w-7 text-sky-200" /><div className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-sky-200">Part 2 audio</div><h2 className="mt-2 text-xl font-bold">{LISTENING_PRACTICE.title}</h2><div className="mt-4 flex items-center gap-2 text-xs text-sky-100"><Clock3 className="h-4 w-4" /> Khoảng 1 phút</div></div><div className="p-5"><label className="form-label">Tốc độ luyện nghe</label><select className="form-input" value={rate} onChange={(event) => setRate(Number(event.target.value))} disabled={playing}><option value={0.85}>0.85× Chậm</option><option value={1}>1.0× Chuẩn</option><option value={1.1}>1.1× Nhanh</option></select><div className="mt-4 flex gap-2"><button className="primary-button flex-1" onClick={play}>{playing ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />} {playing ? "Phát lại" : "Phát bài nghe"}</button>{playing && <button className="secondary-button !px-4" onClick={togglePause} aria-label={paused ? "Tiếp tục" : "Tạm dừng"}>{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>}</div><p className="mt-3 text-[10px] leading-4 text-slate-500">Giọng đọc do trình duyệt tạo; bạn có thể nghe lại khi luyện tập.</p></div></div>
        {submitted && <div className="panel p-5"><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><BookOpen className="h-4 w-4 text-teal-700" /> Transcript</div><p className="mt-3 text-xs leading-6 text-slate-600">{LISTENING_PRACTICE.transcript}</p></div>}
      </aside>
      <div className="panel p-5 md:p-7"><QuestionSet questions={LISTENING_PRACTICE.questions} answers={answers} submitted={submitted} onAnswer={(id, value) => { if (!submitted) setAnswers((current) => ({ ...current, [id]: value })); }} />{error && <ErrorBox text={error} />}{submitted ? <ScoreBox score={score} total={LISTENING_PRACTICE.questions.length} onRetry={() => { setAnswers({}); setSubmitted(false); setError(""); }} /> : <div className="mt-6 flex justify-end"><button className="primary-button" disabled={busy} onClick={() => void submit()}><CheckCircle2 className="h-4 w-4" /> {busy ? "Đang lưu..." : "Chấm bài Listening"}</button></div>}</div>
    </div>
  </div>;
}

function ReadingPractice({ records, onSave }: PracticeProps) {
  const record = findRecord(records, "reading", READING_PRACTICE.id);
  const [answers, setAnswers] = useState<Record<string, number>>(() => savedAnswers(record));
  const [submitted, setSubmitted] = useState(Boolean(record?.completed));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const clock = usePracticeClock(20 * 60);
  const score = countCorrect(READING_PRACTICE.questions, answers);

  const submit = async () => {
    if (Object.keys(answers).length < READING_PRACTICE.questions.length) { setError("Hãy trả lời đủ 5 câu trước khi chấm bài."); return; }
    setBusy(true); setError("");
    try {
      await onSave({ skill: "reading", moduleId: READING_PRACTICE.id, payload: { answers, correct: score, total: READING_PRACTICE.questions.length, elapsedSeconds: clock.elapsed }, score: score / READING_PRACTICE.questions.length * 100, completed: true });
      setSubmitted(true); clock.pause();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được kết quả."); }
    finally { setBusy(false); }
  };

  return <div><div className="flex flex-wrap items-end justify-between gap-4"><PracticeTitle icon={BookOpen} eyebrow="Academic Reading · Passage 1" title="Reading practice" copy="Đọc bài, xác định từ khóa và trả lời câu hỏi trong 20 phút." /><PracticeClock clock={clock} /></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_.95fr]"><article className="panel p-6 md:p-8"><div className="text-[10px] font-bold uppercase tracking-[.16em] text-emerald-700">Academic passage</div><h2 className="mt-2 text-2xl font-bold tracking-[-.035em] text-slate-950">{READING_PRACTICE.title}</h2><div className="mt-6 space-y-5 text-sm leading-7 text-slate-700">{READING_PRACTICE.passage.map((paragraph, index) => <p key={paragraph}><span className="mr-2 font-bold text-emerald-700">{index + 1}</span>{paragraph}</p>)}</div></article><div className="panel p-5 md:p-7"><QuestionSet questions={READING_PRACTICE.questions} answers={answers} submitted={submitted} onAnswer={(id, value) => { if (!submitted) { setAnswers((current) => ({ ...current, [id]: value })); if (!clock.running) clock.start(); } }} />{error && <ErrorBox text={error} />}{submitted ? <ScoreBox score={score} total={READING_PRACTICE.questions.length} onRetry={() => { setAnswers({}); setSubmitted(false); clock.reset(); }} /> : <div className="mt-6 flex justify-end"><button className="primary-button" disabled={busy} onClick={() => void submit()}><CheckCircle2 className="h-4 w-4" /> {busy ? "Đang lưu..." : "Chấm bài Reading"}</button></div>}</div></div>
  </div>;
}

function WritingPractice({ records, onSave }: PracticeProps) {
  const [taskIndex, setTaskIndex] = useState(0);
  const task = WRITING_TASKS[taskIndex];
  const record = findRecord(records, "writing", task.id);
  return <div><PracticeTitle icon={PenLine} eyebrow="IELTS Academic Writing" title="Writing studio" copy="Viết theo thời gian thật, đếm từ và tự lưu bản nháp cho từng task." />
    <div className="mt-6 flex gap-2">{WRITING_TASKS.map((item, index) => <button key={item.id} className={`secondary-button ${taskIndex === index ? "!border-teal-500 !bg-teal-50 !text-teal-800" : ""}`} onClick={() => setTaskIndex(index)}>{item.label}{findRecord(records, "writing", item.id)?.completed && <Check className="h-4 w-4" />}</button>)}</div>
    <WritingTaskEditor key={task.id} task={task} taskIndex={taskIndex} record={record} onSave={onSave} />
  </div>;
}

function WritingTaskEditor({ task, taskIndex, record, onSave }: { task: (typeof WRITING_TASKS)[number]; taskIndex: number; record?: IeltsProgressRecord; onSave: PracticeProps["onSave"] }) {
  const initialDraft = typeof record?.payload.draft === "string" ? record.payload.draft : "";
  const [draft, setDraft] = useState(initialDraft);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const lastSaved = useRef(initialDraft);
  const clock = usePracticeClock(task.time * 60);
  const words = countWords(draft);

  useEffect(() => {
    if (draft === lastSaved.current) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      void onSave({ skill: "writing", moduleId: task.id, payload: { draft, wordCount: countWords(draft) }, score: null, completed: record?.completed ?? false })
        .then(() => { lastSaved.current = draft; setSaveState("saved"); })
        .catch(() => setSaveState("error"));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [draft, onSave, record?.completed, task.id]);

  const finish = async () => {
    setSaveState("saving");
    try { await onSave({ skill: "writing", moduleId: task.id, payload: { draft, wordCount: words, elapsedSeconds: clock.elapsed }, score: null, completed: true }); lastSaved.current = draft; setSaveState("saved"); clock.pause(); }
    catch { setSaveState("error"); }
  };

  return <><div className="mt-5 flex justify-end"><PracticeClock clock={clock} /></div>
    <div className="mt-5 grid gap-6 xl:grid-cols-[.8fr_1.2fr]"><aside className="space-y-5"><div className="panel p-6"><div className="flex items-center justify-between"><span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-800">{task.label}</span><span className="text-xs font-bold text-slate-500">{task.time} phút · ≥ {task.minimumWords} từ</span></div><p className="mt-5 text-sm font-semibold leading-7 text-slate-800">{task.prompt}</p>{task.data && <div className="mt-5 overflow-hidden rounded-xl border border-slate-200"><table className="w-full text-left text-xs"><tbody>{task.data.map((row, rowIndex) => <tr key={row[0]} className={rowIndex === 0 ? "bg-slate-100 font-bold" : "border-t border-slate-100"}>{row.map((cell) => <td className="px-3 py-2.5" key={cell}>{cell}</td>)}</tr>)}</tbody></table></div>}</div><WritingChecklist taskIndex={taskIndex} /></aside>
      <div className="panel overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Save className="h-4 w-4" /> {saveState === "saving" ? "Đang tự lưu..." : saveState === "error" ? "Chưa lưu được — hãy thử lại" : "Đã tự lưu"}</div><div className={`rounded-full px-3 py-1 text-[10px] font-bold ${words >= task.minimumWords ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{words} / {task.minimumWords} từ</div></div><textarea className="min-h-[520px] w-full resize-y border-0 bg-white p-6 text-sm leading-7 text-slate-800 outline-none" value={draft} onFocus={() => { if (!clock.running) clock.start(); }} onChange={(event) => setDraft(event.target.value)} placeholder="Write your response here..." /><div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4"><p className="text-[10px] text-slate-500">Bài được lưu sau khoảng 1 giây khi bạn ngừng gõ.</p><button className="primary-button" disabled={!draft.trim() || saveState === "saving"} onClick={() => void finish()}><CheckCircle2 className="h-4 w-4" /> Hoàn thành {task.label}</button></div></div>
    </div>
  </>;
}

function SpeakingPractice({ records, onSave }: PracticeProps) {
  const [partIndex, setPartIndex] = useState(0);
  const part = SPEAKING_PRACTICE.parts[partIndex];
  const moduleId = `${SPEAKING_PRACTICE.id}-${part.id}`;
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [prepLeft, setPrepLeft] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setDuration((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (prepLeft <= 0) return;
    const timer = window.setTimeout(() => setPrepLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [prepLeft]);

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const startRecording = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Trình duyệt chưa hỗ trợ ghi âm. Hãy dùng Chrome hoặc Edge bản mới."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream; recorderRef.current = recorder;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(blob); });
        stream.getTracks().forEach((track) => track.stop()); streamRef.current = null;
      };
      setDuration(0); setRecording(true); recorder.start(250);
    } catch { setError("Không mở được micro. Hãy cho phép quyền micro rồi thử lại."); }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  };

  const complete = async () => {
    if (recording) stopRecording();
    setBusy(true);
    try { await onSave({ skill: "speaking", moduleId, payload: { part: part.id, durationSeconds: duration, recorded: Boolean(audioUrl || duration) }, score: null, completed: true }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Không lưu được tiến độ Speaking."); }
    finally { setBusy(false); }
  };

  return <div><PracticeTitle icon={Mic2} eyebrow="IELTS Speaking · 3 parts" title="Speaking recorder" copy="Luyện theo cue card, ghi âm trên thiết bị và nghe lại trước khi tự đánh giá." />
    <div className="mt-6 grid gap-6 xl:grid-cols-[320px_1fr]"><aside className="space-y-4"><div className="panel p-4"><div className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-400">Chọn phần thi</div><div className="mt-3 space-y-2">{SPEAKING_PRACTICE.parts.map((item, index) => { const done = Boolean(findRecord(records, "speaking", `${SPEAKING_PRACTICE.id}-${item.id}`)?.completed); return <button key={item.id} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs font-bold ${partIndex === index ? "border-violet-300 bg-violet-50 text-violet-900" : "border-slate-200 text-slate-600"}`} onClick={() => { if (recording) stopRecording(); setPartIndex(index); setAudioUrl(""); setDuration(0); setPrepLeft(0); }}><span>{item.label}</span>{done && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}</button>; })}</div></div><SpeakingRubric /></aside>
      <div className="panel overflow-hidden"><div className="bg-gradient-to-br from-violet-950 to-slate-900 p-6 text-white md:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-violet-200">{part.label}</div><h2 className="mt-2 text-2xl font-bold">{SPEAKING_PRACTICE.title}</h2></div><div className="rounded-xl bg-white/10 px-4 py-2 font-mono text-sm font-bold">{recording ? formatSeconds(duration) : prepLeft > 0 ? `Chuẩn bị ${formatSeconds(prepLeft)}` : "Sẵn sàng"}</div></div><div className="mt-7 space-y-3">{part.prompts.map((prompt) => <div key={prompt} className="rounded-xl border border-white/10 bg-white/10 p-4 text-sm leading-6 text-violet-50">{prompt}</div>)}</div></div>
        <div className="p-6"><div className="flex flex-wrap gap-3">{part.preparationSeconds > 0 && !recording && <button className="secondary-button" onClick={() => setPrepLeft(part.preparationSeconds)}><Clock3 className="h-4 w-4" /> {prepLeft ? "Chuẩn bị lại" : "Bắt đầu 1 phút chuẩn bị"}</button>}{!recording ? <button className="primary-button" onClick={() => void startRecording()}><Mic2 className="h-4 w-4" /> Bắt đầu ghi âm</button> : <button className="primary-button !border-rose-600 !bg-rose-600" onClick={stopRecording}><Square className="h-4 w-4" /> Dừng ghi âm</button>}</div>{error && <ErrorBox text={error} />}{audioUrl && <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4"><div className="text-xs font-bold text-violet-900">Nghe lại câu trả lời · {formatSeconds(duration)}</div><audio className="mt-3 w-full" controls src={audioUrl} /><a className="secondary-button mt-3" href={audioUrl} download={`ielts-speaking-${part.id}.webm`}><Download className="h-4 w-4" /> Tải bản ghi về máy</a><p className="mt-3 text-[10px] leading-4 text-violet-700">Bản ghi chỉ tồn tại trên thiết bị trong phiên này và không được tải lên máy chủ.</p></div>}<div className="mt-6 flex justify-end"><button className="primary-button" disabled={busy || (!audioUrl && duration === 0)} onClick={() => void complete()}><CheckCircle2 className="h-4 w-4" /> {busy ? "Đang lưu..." : `Hoàn thành ${part.label.split(" · ")[0]}`}</button></div></div>
      </div>
    </div>
  </div>;
}

interface PracticeProps {
  records: IeltsProgressRecord[];
  onSave: (input: Omit<IeltsProgressRecord, "updatedAt">) => Promise<void>;
}

function PracticeTitle({ icon: Icon, eyebrow, title, copy }: { icon: typeof Headphones; eyebrow: string; title: string; copy: string }) {
  return <div><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-teal-700"><Icon className="h-4 w-4" /> {eyebrow}</div><h1 className="mt-2 text-3xl font-bold tracking-[-.05em] text-slate-950 md:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{copy}</p></div>;
}

function QuestionSet({ questions, answers, submitted, onAnswer }: { questions: IeltsChoiceQuestion[]; answers: Record<string, number>; submitted: boolean; onAnswer: (id: string, value: number) => void }) {
  return <div className="space-y-6">{questions.map((question, questionIndex) => <article key={question.id}><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600">{questionIndex + 1}</span><div className="flex-1"><h3 className="text-sm font-bold leading-6 text-slate-900">{question.prompt}</h3><div className="mt-3 grid gap-2">{question.options.map((option, optionIndex) => { const selected = answers[question.id] === optionIndex; const correct = question.answer === optionIndex; return <button key={option} disabled={submitted} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-left text-xs font-semibold transition ${submitted && correct ? "border-emerald-300 bg-emerald-50 text-emerald-800" : submitted && selected ? "border-rose-300 bg-rose-50 text-rose-800" : selected ? "border-teal-400 bg-teal-50 text-teal-900" : "border-slate-200 hover:border-teal-300"}`} onClick={() => onAnswer(question.id, optionIndex)}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-[10px] font-bold">{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{submitted && correct && <Check className="ml-auto h-4 w-4" />}{submitted && selected && !correct && <X className="ml-auto h-4 w-4" />}</button>; })}</div>{submitted && <div className="mt-2 flex gap-2 rounded-lg bg-slate-50 p-2.5 text-[10px] leading-4 text-slate-600"><Lightbulb className="h-4 w-4 shrink-0 text-amber-500" /> {question.explanation}</div>}</div></div></article>)}</div>;
}

function ScoreBox({ score, total, onRetry }: { score: number; total: number; onRetry: () => void }) {
  const percent = Math.round(score / total * 100);
  return <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div><div className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-700">Kết quả bài luyện</div><div className="mt-1 text-2xl font-bold text-emerald-950">{score}/{total} câu đúng · {percent}%</div></div><button className="secondary-button" onClick={onRetry}><RotateCcw className="h-4 w-4" /> Luyện lại</button></div>;
}

function WritingChecklist({ taskIndex }: { taskIndex: number }) {
  const criteria = taskIndex === 0 ? ["Có overview nêu xu hướng chính", "So sánh số liệu nổi bật", "Không nêu ý kiến cá nhân", "Tối thiểu 150 từ"] : ["Trả lời trực tiếp câu hỏi", "Mỗi đoạn có một ý chính", "Có lý do và ví dụ phù hợp", "Tối thiểu 250 từ"];
  return <div className="panel p-5"><div className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-amber-600" /> Checklist trước khi nộp</div><div className="mt-4 space-y-3">{criteria.map((criterion) => <label className="flex items-start gap-3 text-xs leading-5 text-slate-600" key={criterion}><input className="mt-1 accent-teal-700" type="checkbox" /> {criterion}</label>)}</div></div>;
}

function SpeakingRubric() {
  return <div className="panel p-5"><div className="text-sm font-bold">Tự đánh giá sau khi nghe</div><div className="mt-4 space-y-3">{["Fluency & coherence", "Lexical resource", "Grammar range & accuracy", "Pronunciation"].map((item) => <div key={item}><div className="flex items-center justify-between text-[10px]"><span className="font-semibold text-slate-600">{item}</span><span className="text-slate-400">1–9</span></div><input className="mt-1 w-full accent-violet-700" type="range" min={1} max={9} step={0.5} defaultValue={5} aria-label={item} /></div>)}</div><p className="mt-4 text-[10px] leading-4 text-slate-500">Đây là công cụ tự luyện, không phải điểm IELTS chính thức hay chấm bởi AI.</p></div>;
}

function PracticeClock({ clock }: { clock: ReturnType<typeof usePracticeClock> }) {
  return <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2"><div className="exam-timer"><Clock3 className="h-4 w-4" /> {formatSeconds(clock.remaining)}</div>{clock.running ? <button className="icon-button" onClick={clock.pause} aria-label="Tạm dừng"><Pause className="h-4 w-4" /></button> : <button className="icon-button" onClick={clock.start} aria-label="Bắt đầu"><Play className="h-4 w-4" /></button>}<button className="icon-button" onClick={clock.reset} aria-label="Đặt lại"><RotateCcw className="h-4 w-4" /></button></div>;
}

function usePracticeClock(initialSeconds: number) {
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running || remaining <= 0) return;
    const timer = window.setTimeout(() => {
      if (remaining <= 1) { setRemaining(0); setRunning(false); }
      else setRemaining((value) => value - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [remaining, running]);
  return {
    remaining,
    elapsed: initialSeconds - remaining,
    running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: () => { setRemaining(initialSeconds); setRunning(false); },
  };
}

function findRecord(records: IeltsProgressRecord[], skill: IeltsSkill, moduleId: string) {
  return records.find((record) => record.skill === skill && record.moduleId === moduleId);
}

function savedAnswers(record?: IeltsProgressRecord) {
  const raw = record?.payload.answers;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, Number(value)]));
}

function countCorrect(questions: IeltsChoiceQuestion[], answers: Record<string, number>) {
  return questions.reduce((total, question) => total + (answers[question.id] === question.answer ? 1 : 0), 0);
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function formatSeconds(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function Notice({ text, onClose }: { text: string; onClose: () => void }) {
  return <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800"><span>{text}</span><button onClick={onClose}><X className="h-4 w-4" /></button></div>;
}

function ErrorBox({ text }: { text: string }) {
  return <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{text}</div>;
}

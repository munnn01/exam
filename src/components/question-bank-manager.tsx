"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { BookOpenCheck, CheckCircle2, Download, FileUp, Plus, RefreshCw, Search, Sparkles, Trash2, X } from "lucide-react";
import {
  addQuestions,
  createGeneratedExam,
  createQuestionBank,
  deleteQuestion,
  listBankQuestions,
  listQuestionBanks,
  type QuestionInput,
} from "@/lib/question-store";
import type { BankQuestion, QuestionBank, QuestionDifficulty, TeacherIdentity } from "@/lib/types";

interface QuestionBankManagerProps {
  teacher: TeacherIdentity;
}

const difficultyLabels: Record<QuestionDifficulty, string> = { easy: "Dễ", medium: "Trung bình", hard: "Khó" };

export function QuestionBankManager({ teacher }: QuestionBankManagerProps) {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [modal, setModal] = useState<"bank" | "question" | "import" | "exam" | null>(null);

  const selectedBank = banks.find((bank) => bank.id === selectedBankId) ?? null;
  const filteredQuestions = useMemo(() => questions.filter((question) =>
    `${question.content} ${question.topic}`.toLowerCase().includes(query.toLowerCase()),
  ), [questions, query]);

  const loadBanks = async (preferredId?: string) => {
    setLoading(true);
    try {
      const nextBanks = await listQuestionBanks(teacher);
      setBanks(nextBanks);
      const nextId = preferredId || (nextBanks.some((bank) => bank.id === selectedBankId) ? selectedBankId : nextBanks[0]?.id) || "";
      setSelectedBankId(nextId);
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Không tải được ngân hàng câu hỏi." });
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (bankId: string) => {
    if (!bankId) return setQuestions([]);
    try {
      setQuestions(await listBankQuestions(teacher, bankId));
    } catch (cause) {
      setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Không tải được câu hỏi." });
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listQuestionBanks(teacher)
      .then((nextBanks) => {
        if (cancelled) return;
        setBanks(nextBanks);
        setSelectedBankId((current) => nextBanks.some((bank) => bank.id === current) ? current : nextBanks[0]?.id || "");
      })
      .catch((cause) => {
        if (!cancelled) setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Không tải được ngân hàng câu hỏi." });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [teacher]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedBankId) {
      setQuestions([]);
      return () => { cancelled = true; };
    }
    void listBankQuestions(teacher, selectedBankId)
      .then((nextQuestions) => { if (!cancelled) setQuestions(nextQuestions); })
      .catch((cause) => {
        if (!cancelled) setMessage({ tone: "error", text: cause instanceof Error ? cause.message : "Không tải được câu hỏi." });
      });
    return () => { cancelled = true; };
  }, [selectedBankId, teacher]);

  const refresh = async (text?: string) => {
    await loadBanks(selectedBankId);
    await loadQuestions(selectedBankId);
    if (text) setMessage({ tone: "success", text });
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="text-[10px] font-bold uppercase tracking-[.2em] text-teal-700">Kho dữ liệu riêng</div><h1 className="mt-2 text-3xl font-bold tracking-[-.045em] text-slate-950 md:text-4xl">Ngân hàng câu hỏi</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Tạo nhiều bộ câu hỏi, nhập CSV và sinh đề ngẫu nhiên. Dữ liệu được tách riêng theo tài khoản giảng viên.</p></div>
        <div className="flex flex-wrap gap-2"><button className="secondary-button" onClick={() => setModal("bank")}><Plus className="h-4 w-4" /> Bộ mới</button><button className="secondary-button" disabled={!selectedBank} onClick={() => setModal("import")}><FileUp className="h-4 w-4" /> Nhập CSV</button><button className="primary-button" disabled={!selectedBank} onClick={() => setModal("question")}><Plus className="h-4 w-4" /> Thêm câu hỏi</button></div>
      </div>

      {message && <div className={`mt-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}><span>{message.text}</span><button onClick={() => setMessage(null)}><X className="h-4 w-4" /></button></div>}

      <div className="mt-7 grid gap-6 xl:grid-cols-[300px_1fr]">
        <aside className="panel h-fit p-4">
          <div className="mb-3 flex items-center justify-between"><div className="text-xs font-bold uppercase tracking-[.12em] text-slate-400">Các bộ câu hỏi</div><button className="icon-button" aria-label="Tải lại" onClick={() => void refresh()}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></div>
          <div className="space-y-2">{banks.map((bank) => <button key={bank.id} className={`w-full rounded-xl border p-3 text-left transition ${selectedBankId === bank.id ? "border-teal-300 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`} onClick={() => setSelectedBankId(bank.id)}><div className="flex items-start gap-3"><div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${selectedBankId === bank.id ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}><BookOpenCheck className="h-4 w-4" /></div><div className="min-w-0"><div className="truncate text-xs font-bold text-slate-900">{bank.name}</div><div className="mt-1 text-[10px] text-slate-500">{bank.questionCount} câu · {bank.subject || "Chưa đặt môn"}</div></div></div></button>)}</div>
          {!loading && !banks.length && <div className="rounded-xl bg-slate-50 p-5 text-center text-xs leading-5 text-slate-500">Chưa có bộ câu hỏi. Hãy tạo bộ đầu tiên.</div>}
        </aside>

        <div>
          {selectedBank ? <>
            <div className="panel p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold tracking-[-.035em]">{selectedBank.name}</h2><p className="mt-1 text-xs text-slate-500">{selectedBank.description || "Chưa có mô tả"}</p></div><button className="secondary-button" disabled={!questions.length} onClick={() => setModal("exam")}><Sparkles className="h-4 w-4 text-amber-500" /> Tạo đề tự động</button></div><div className="relative mt-5 max-w-lg"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nội dung hoặc chủ đề..." /></div></div>
            <div className="panel mt-4 overflow-hidden">{filteredQuestions.length ? <div className="overflow-x-auto"><table className="data-table min-w-[780px]"><thead><tr><th>Câu hỏi</th><th>Chủ đề</th><th>Độ khó</th><th>Đáp án</th><th /></tr></thead><tbody>{filteredQuestions.map((question) => <tr key={question.id}><td className="max-w-xl"><div className="text-xs font-bold leading-5 text-slate-900">{question.content}</div><div className="mt-2 line-clamp-1 text-[10px] text-slate-500">{question.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join(" · ")}</div></td><td className="text-xs text-slate-600">{question.topic || "—"}</td><td><span className={`question-difficulty ${question.difficulty}`}>{difficultyLabels[question.difficulty]}</span></td><td><code className="code-pill">{String.fromCharCode(65 + question.correctAnswer)}</code></td><td><button className="icon-button text-rose-500" aria-label="Xóa câu hỏi" onClick={async () => { if (!window.confirm("Xóa câu hỏi này?")) return; await deleteQuestion(teacher, question.id); await refresh("Đã xóa câu hỏi."); }}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div> : <EmptyQuestions onAdd={() => setModal("question")} onImport={() => setModal("import")} />}</div>
          </> : <div className="panel grid min-h-[420px] place-items-center p-8 text-center"><div><BookOpenCheck className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-4 text-lg font-bold">Chọn hoặc tạo một bộ câu hỏi</h2><p className="mt-2 text-sm text-slate-500">Mỗi bộ có thể dùng để sinh nhiều đề thi khác nhau.</p></div></div>}
        </div>
      </div>

      {modal === "bank" && <BankModal onClose={() => setModal(null)} onSave={async (input) => { const bank = await createQuestionBank(teacher, input); setModal(null); await loadBanks(bank.id); setMessage({ tone: "success", text: "Đã tạo ngân hàng câu hỏi." }); }} />}
      {modal === "question" && selectedBank && <QuestionModal onClose={() => setModal(null)} onSave={async (input) => { await addQuestions(teacher, selectedBank.id, [input]); setModal(null); await refresh("Đã thêm câu hỏi."); }} />}
      {modal === "import" && selectedBank && <ImportModal bank={selectedBank} onClose={() => setModal(null)} onImport={async (rows) => { const count = await addQuestions(teacher, selectedBank.id, rows); setModal(null); await refresh(`Đã nhập ${count} câu hỏi từ CSV.`); }} />}
      {modal === "exam" && selectedBank && <ExamModal bank={selectedBank} availableCount={questions.length} onClose={() => setModal(null)} onCreate={async (input) => { const exam = await createGeneratedExam(teacher, input); setModal(null); setMessage({ tone: "success", text: `Đã tạo đề ${exam.code} với ${exam.questionCount} câu ngẫu nhiên.` }); }} />}
    </section>
  );
}

function EmptyQuestions({ onAdd, onImport }: { onAdd: () => void; onImport: () => void }) {
  return <div className="grid min-h-72 place-items-center p-8 text-center"><div><BookOpenCheck className="mx-auto h-9 w-9 text-teal-500" /><h3 className="mt-3 text-sm font-bold">Bộ này chưa có câu hỏi</h3><p className="mt-1 text-xs text-slate-500">Thêm thủ công hoặc nhập nhiều câu bằng file CSV.</p><div className="mt-5 flex justify-center gap-2"><button className="secondary-button" onClick={onImport}><FileUp className="h-4 w-4" /> Nhập CSV</button><button className="primary-button" onClick={onAdd}><Plus className="h-4 w-4" /> Thêm câu</button></div></div></div>;
}

function ModalShell({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop"><div className="modal-card !max-h-[92vh] !w-[min(100%,640px)] overflow-y-auto"><div className="flex items-center justify-between"><div><div className="text-xs font-bold text-teal-700">{eyebrow}</div><h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">{title}</h2></div><button type="button" className="icon-button" onClick={onClose}><X className="h-5 w-5" /></button></div>{children}</div></div>;
}

function BankModal({ onClose, onSave }: { onClose: () => void; onSave: (input: Pick<QuestionBank, "name" | "subject" | "description">) => Promise<void> }) {
  const [form, setForm] = useState({ name: "", subject: "", description: "" }); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <ModalShell eyebrow="Phân loại nội dung" title="Tạo bộ câu hỏi" onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { await onSave(form); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tạo bộ."); } finally { setBusy(false); } }}><div className="mt-6 grid gap-4"><FormField label="Tên bộ câu hỏi"><input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ví dụ: Lập trình Web — Chương 1" /></FormField><FormField label="Môn học"><input className="form-input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Lập trình Web" /></FormField><FormField label="Mô tả"><textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Phạm vi kiến thức của bộ câu hỏi" /></FormField></div>{error && <ErrorBox text={error} />}<ModalActions busy={busy} onClose={onClose} submitLabel="Tạo bộ" /></form></ModalShell>;
}

function QuestionModal({ onClose, onSave }: { onClose: () => void; onSave: (input: QuestionInput) => Promise<void> }) {
  const [form, setForm] = useState<QuestionInput>({ content: "", options: ["", "", "", ""], correctAnswer: 0, difficulty: "medium", topic: "" }); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <ModalShell eyebrow="Soạn thủ công" title="Thêm câu hỏi" onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { if (form.options.some((option) => !option.trim())) throw new Error("Cần nhập đủ 4 phương án."); await onSave({ ...form, content: form.content.trim(), options: form.options.map((option) => option.trim()), topic: form.topic.trim() }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể thêm câu hỏi."); } finally { setBusy(false); } }}><div className="mt-6 space-y-4"><FormField label="Nội dung câu hỏi"><textarea className="form-textarea" required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></FormField><div className="grid gap-3 sm:grid-cols-2">{form.options.map((option, index) => <FormField key={index} label={`Phương án ${String.fromCharCode(65 + index)}`}><input className="form-input" required value={option} onChange={(e) => { const options = [...form.options]; options[index] = e.target.value; setForm({ ...form, options }); }} /></FormField>)}</div><div className="grid gap-3 sm:grid-cols-3"><FormField label="Đáp án đúng"><select className="form-input" value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: Number(e.target.value) })}>{form.options.map((_, index) => <option key={index} value={index}>{String.fromCharCode(65 + index)}</option>)}</select></FormField><FormField label="Độ khó"><select className="form-input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as QuestionDifficulty })}><option value="easy">Dễ</option><option value="medium">Trung bình</option><option value="hard">Khó</option></select></FormField><FormField label="Chủ đề"><input className="form-input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} /></FormField></div></div>{error && <ErrorBox text={error} />}<ModalActions busy={busy} onClose={onClose} submitLabel="Lưu câu hỏi" /></form></ModalShell>;
}

function ImportModal({ bank, onClose, onImport }: { bank: QuestionBank; onClose: () => void; onImport: (rows: QuestionInput[]) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null); const [rows, setRows] = useState<QuestionInput[]>([]); const [fileName, setFileName] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const downloadTemplate = () => { const csv = "content,option_a,option_b,option_c,option_d,correct_answer,difficulty,topic\nGiao thức nào mã hóa kết nối web?,HTTP,HTTPS,FTP,DNS,B,easy,Mạng máy tính"; const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "examguard-question-template.csv"; anchor.click(); URL.revokeObjectURL(url); };
  const parseFile = (file: File) => { setFileName(file.name); setRows([]); setError(""); Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: true, complete: ({ data, errors }) => { const firstError = errors[0]; if (firstError) return setError(`CSV lỗi ở dòng ${(firstError.row ?? 0) + 2}: ${firstError.message}`); try { const parsed = data.map((row, index) => { const answer = String(row.correct_answer || "").trim().toUpperCase(); const correctAnswer = ["A", "B", "C", "D"].indexOf(answer); const difficulty = String(row.difficulty || "medium").trim().toLowerCase(); const options = [row.option_a, row.option_b, row.option_c, row.option_d].map((value) => String(value || "").trim()); if (!row.content?.trim() || options.some((option) => !option) || correctAnswer < 0 || !["easy", "medium", "hard"].includes(difficulty)) throw new Error(`Dòng ${index + 2} thiếu dữ liệu hoặc sai đáp án/độ khó.`); return { content: row.content.trim(), options, correctAnswer, difficulty: difficulty as QuestionDifficulty, topic: String(row.topic || "").trim() }; }); setRows(parsed); } catch (cause) { setError(cause instanceof Error ? cause.message : "File CSV không hợp lệ."); } } }); };
  return <ModalShell eyebrow="Thêm hàng loạt" title={`Nhập CSV vào ${bank.name}`} onClose={onClose}><div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-7 text-center"><FileUp className="mx-auto h-8 w-8 text-teal-600" /><div className="mt-3 text-sm font-bold">{fileName || "Chọn file CSV UTF-8"}</div><div className="mt-1 text-xs text-slate-500">Tối đa 100 MB; mỗi dòng là một câu có 4 phương án.</div><input ref={inputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) parseFile(file); }} /><div className="mt-5 flex flex-wrap justify-center gap-2"><button className="secondary-button" onClick={downloadTemplate}><Download className="h-4 w-4" /> Tải file mẫu</button><button className="primary-button" onClick={() => inputRef.current?.click()}><FileUp className="h-4 w-4" /> Chọn file</button></div></div>{rows.length > 0 && <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Đã kiểm tra {rows.length} câu hợp lệ.</div>}{error && <ErrorBox text={error} />}<div className="mt-6 flex justify-end gap-2"><button className="secondary-button" onClick={onClose}>Hủy</button><button disabled={!rows.length || busy} className="primary-button" onClick={async () => { setBusy(true); setError(""); try { await onImport(rows); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể nhập CSV."); setBusy(false); } }}>{busy ? "Đang nhập..." : `Nhập ${rows.length || 0} câu`}</button></div></ModalShell>;
}

function ExamModal({ bank, availableCount, onClose, onCreate }: { bank: QuestionBank; availableCount: number; onClose: () => void; onCreate: (input: { bankId: string; code: string; title: string; durationMinutes: number; questionCount: number }) => Promise<void> }) {
  const [form, setForm] = useState({ code: `DE-${String(Date.now()).slice(-6)}`, title: `Đề thi — ${bank.subject || bank.name}`, durationMinutes: 45, questionCount: Math.min(10, availableCount) }); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <ModalShell eyebrow="Lấy ngẫu nhiên và đóng băng nội dung" title="Tạo đề tự động" onClose={onClose}><form onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { await onCreate({ bankId: bank.id, ...form, code: form.code.trim().toUpperCase() }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể tạo đề."); setBusy(false); } }}><div className="mt-6 rounded-xl bg-teal-50 p-4 text-xs leading-5 text-teal-900">Ngân hàng có <strong>{availableCount} câu</strong>. Hệ thống sẽ chọn ngẫu nhiên và lưu bản chụp câu hỏi để việc sửa ngân hàng sau này không làm thay đổi đề.</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><FormField label="Mã đề"><input className="form-input uppercase" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></FormField><FormField label="Thời lượng (phút)"><input className="form-input" type="number" min={5} max={360} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></FormField><div className="sm:col-span-2"><FormField label="Tên đề"><input className="form-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></FormField></div><FormField label="Số câu"><input className="form-input" type="number" min={1} max={availableCount} value={form.questionCount} onChange={(e) => setForm({ ...form, questionCount: Number(e.target.value) })} /></FormField></div>{error && <ErrorBox text={error} />}<ModalActions busy={busy} onClose={onClose} submitLabel="Tạo đề" /></form></ModalShell>;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="form-label">{label}</span>{children}</label>; }
function ErrorBox({ text }: { text: string }) { return <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{text}</div>; }
function ModalActions({ busy, onClose, submitLabel }: { busy: boolean; onClose: () => void; submitLabel: string }) { return <div className="mt-7 flex justify-end gap-2"><button type="button" className="secondary-button" onClick={onClose}>Hủy</button><button disabled={busy} className="primary-button" type="submit">{busy ? "Đang lưu..." : submitLabel}</button></div>; }

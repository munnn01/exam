"use client";

import { useEffect, useState } from "react";
import { ExamPreflight } from "./exam-preflight";
import { ExamRoom } from "./exam-room";
import { FinishedView } from "./finished-view";
import { LoginView } from "./login-view";
import { StudentExamPortal } from "./student-exam-portal";
import { TeacherDashboard } from "./teacher-dashboard";
import { getEvents } from "@/lib/store";
import { getCurrentTeacher, signOutTeacher } from "@/lib/teacher-auth";
import type { ActiveExam, AppView, ProctorEvent, StudentCredential, TeacherIdentity } from "@/lib/types";

export function ExamGuardApp() {
  const [view, setView] = useState<AppView>("login");
  const [student, setStudent] = useState<StudentCredential | null>(null);
  const [activeExam, setActiveExam] = useState<ActiveExam | null>(null);
  const [teacher, setTeacher] = useState<TeacherIdentity | null>(null);
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [result, setResult] = useState<{ score: number | null; total: number; violations: number }>({ score: null, total: 0, violations: 0 });

  useEffect(() => {
    const refreshEvents = () => setEvents(getEvents());
    refreshEvents();
    void getCurrentTeacher().then((current) => {
      if (current) {
        setTeacher(current);
        setView("teacher");
      }
    });
    window.addEventListener("examguard:event", refreshEvents);
    return () => {
      window.removeEventListener("examguard:event", refreshEvents);
    };
  }, []);

  if (view === "teacher" && teacher) return <TeacherDashboard teacher={teacher} events={events} onLogout={() => { void signOutTeacher(); setTeacher(null); setView("login"); }} />;
  if (view === "student-portal" && student) return <StudentExamPortal student={student} onBack={() => { setStudent(null); setView("login"); }} onSelect={(exam) => { setActiveExam(exam); setStudent({ ...student, examCode: exam.code }); setView("preflight"); }} />;
  if (view === "preflight" && student && activeExam) return <ExamPreflight student={student} exam={activeExam} onBack={() => setView("student-portal")} onStart={() => setView("exam")} />;
  if (view === "exam" && student && activeExam) return <ExamRoom student={student} exam={activeExam} onFinish={(nextResult) => { setResult(nextResult); setView("finished"); }} />;
  if (view === "finished" && student && activeExam) return <FinishedView student={student} exam={activeExam} result={result} onHome={() => { setActiveExam(null); setView("student-portal"); }} />;

  return <LoginView onTeacherLogin={(nextTeacher) => { setTeacher(nextTeacher); setView("teacher"); }} onStudentLogin={(nextStudent) => { setStudent(nextStudent); setView("student-portal"); }} />;
}

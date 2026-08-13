"use client";

import { useEffect, useState } from "react";
import { ExamPreflight } from "./exam-preflight";
import { ExamRoom } from "./exam-room";
import { FinishedView } from "./finished-view";
import { LoginView } from "./login-view";
import { TeacherDashboard } from "./teacher-dashboard";
import { getEvents, getStudents } from "@/lib/store";
import type { AppView, ProctorEvent, StudentCredential } from "@/lib/types";

export function ExamGuardApp() {
  const [view, setView] = useState<AppView>("login");
  const [student, setStudent] = useState<StudentCredential | null>(null);
  const [students, setStudents] = useState<StudentCredential[]>([]);
  const [events, setEvents] = useState<ProctorEvent[]>([]);
  const [result, setResult] = useState({ score: 0, total: 0, violations: 0 });

  useEffect(() => {
    const refreshEvents = () => setEvents(getEvents());
    const refreshStudents = () => setStudents(getStudents());
    refreshEvents();
    refreshStudents();
    window.addEventListener("examguard:event", refreshEvents);
    window.addEventListener("examguard:students", refreshStudents);
    return () => {
      window.removeEventListener("examguard:event", refreshEvents);
      window.removeEventListener("examguard:students", refreshStudents);
    };
  }, []);

  if (view === "teacher") return <TeacherDashboard events={events} students={students} onStudentsChange={setStudents} onLogout={() => setView("login")} />;
  if (view === "preflight" && student) return <ExamPreflight student={student} onBack={() => setView("login")} onStart={() => setView("exam")} />;
  if (view === "exam" && student) return <ExamRoom student={student} onFinish={(nextResult) => { setResult(nextResult); setView("finished"); }} />;
  if (view === "finished" && student) return <FinishedView student={student} result={result} onHome={() => { setStudent(null); setView("login"); }} />;

  return <LoginView onTeacherLogin={() => setView("teacher")} onStudentLogin={(nextStudent) => { setStudent(nextStudent); setView("preflight"); }} />;
}

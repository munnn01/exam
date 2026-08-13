"use client";

import { DEFAULT_STUDENTS, DEMO_EVENTS } from "./demo-data";
import type { ProctorEvent, StudentCredential } from "./types";

const EVENTS_KEY = "examguard-events-v1";
const STUDENTS_KEY = "examguard-students-v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getEvents(): ProctorEvent[] {
  return readJson<ProctorEvent[]>(EVENTS_KEY, DEMO_EVENTS);
}

export function appendEvent(event: ProctorEvent): ProctorEvent[] {
  const current = getEvents();
  const withSnapshotLimit = [event, ...current]
    .slice(0, 80)
    .map((item, index) => (index >= 12 && item.snapshot ? { ...item, snapshot: undefined } : item));
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(withSnapshotLimit));
  window.dispatchEvent(new CustomEvent("examguard:event", { detail: event }));
  return withSnapshotLimit;
}

export function getStudents(): StudentCredential[] {
  return readJson<StudentCredential[]>(STUDENTS_KEY, DEFAULT_STUDENTS);
}

export function saveStudents(students: StudentCredential[]) {
  window.localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  window.dispatchEvent(new Event("examguard:students"));
}

export function validateStudent(examCode: string, studentId: string, password: string) {
  return getStudents().find(
    (student) =>
      student.examCode.toUpperCase() === examCode.trim().toUpperCase() &&
      student.id.toUpperCase() === studentId.trim().toUpperCase() &&
      student.password === password,
  );
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export function makePassword() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

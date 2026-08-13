"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, ChevronRight, Clock3, LockKeyhole, Maximize2, MonitorCheck, MonitorUp, ShieldCheck, Video, Wifi, X } from "lucide-react";
import { Brand } from "./brand";
import type { ActiveExam, StudentCredential } from "@/lib/types";

interface ExamPreflightProps {
  student: StudentCredential;
  exam: ActiveExam;
  onBack: () => void;
  onStart: (screenStream: MediaStream) => void;
}

export function ExamPreflight({ student, exam, onBack, onStart }: ExamPreflightProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenHandedOffRef = useRef(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [screenReady, setScreenReady] = useState(false);
  const [screenError, setScreenError] = useState("");
  const [starting, setStarting] = useState(false);
  const [agreed, setAgreed] = useState(true);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (!screenHandedOffRef.current) screenStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const checkCamera = async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch {
      setCameraReady(false);
      setCameraError("Không thể mở camera. Hãy cấp quyền camera trên trình duyệt rồi thử lại.");
    }
  };

  const checkScreenShare = async () => {
    setScreenError("");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      const surface = track?.getSettings().displaySurface;
      if (!track || surface !== "monitor") {
        stream.getTracks().forEach((item) => item.stop());
        setScreenReady(false);
        setScreenError("Hãy chọn Toàn bộ màn hình (Entire screen), không chọn một tab hoặc cửa sổ riêng.");
        return;
      }

      const previousStream = screenStreamRef.current;
      screenStreamRef.current = stream;
      previousStream?.getTracks().forEach((item) => item.stop());
      track.addEventListener("ended", () => {
        if (screenHandedOffRef.current || screenStreamRef.current !== stream) return;
        setScreenReady(false);
        setScreenError("Chia sẻ màn hình đã dừng. Hãy chia sẻ lại Toàn bộ màn hình.");
      });
      setScreenReady(true);
    } catch {
      setScreenReady(false);
      setScreenError("Chưa thể chia sẻ màn hình. Hãy chọn Cho phép và chia sẻ Toàn bộ màn hình.");
    }
  };

  const startExam = async () => {
    const screenStream = screenStreamRef.current;
    if (!cameraReady || !screenReady || !screenStream || !agreed) return;
    setStarting(true);
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      screenHandedOffRef.current = true;
      onStart(screenStream);
    } catch {
      setCameraError("Trình duyệt chưa cho phép toàn màn hình. Hãy thử lại và chọn Cho phép.");
      setStarting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7f8]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <Brand compact />
          <button className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Quay lại</button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-8 lg:grid-cols-[.86fr_1.14fr] lg:px-8 lg:py-12">
        <section>
          <div className="eyebrow"><ShieldCheck className="h-4 w-4" /> Kiểm tra trước khi thi</div>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-[-.055em] text-slate-950">Thiết bị của bạn đã sẵn sàng chưa?</h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">Hoàn tất các bước bên cạnh. Camera chỉ được dùng để phát hiện hành vi bất thường, không dùng để xác minh danh tính.</p>

          <div className="panel mt-7 overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/70 p-5">
              <div className="text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">Thông tin kỳ thi</div>
              <h2 className="mt-2 text-lg font-bold tracking-[-.025em] text-slate-950">{exam.title}</h2>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Info icon={Clock3} label="Thời lượng" value={`${exam.durationMinutes} phút`} />
              <Info icon={LockKeyhole} label="Mã kỳ thi" value={exam.code} />
              <Info icon={Video} label="Giám sát" value="Camera + toàn màn hình" />
              <Info icon={Wifi} label={`Lượt làm ${exam.attemptNumber}/${exam.maxAttempts}`} value={navigator.onLine ? "Đáp án sẽ tự động lưu" : "Ngoại tuyến"} />
            </div>
            <div className="border-t border-slate-100 px-5 py-4">
              <div className="text-xs text-slate-500">Sinh viên</div>
              <div className="mt-1 text-sm font-bold text-slate-900">{student.name} <span className="ml-1 font-medium text-slate-400">· {student.id}</span></div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            <strong>Chuẩn bị:</strong> đặt thiết bị ổn định, bảo đảm đủ ánh sáng và để khuôn mặt nằm trọn trong khung camera.
          </div>
        </section>

        <section className="panel p-5 md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><div className="text-xs font-bold text-teal-700">Thiết lập bắt buộc</div><h2 className="mt-1 text-2xl font-bold tracking-[-.04em]">Camera và chia sẻ màn hình</h2></div>
            <div className={`ready-pill ${cameraReady && screenReady ? "ready" : ""}`}>{cameraReady && screenReady ? <><Check className="h-3.5 w-3.5" /> Đã sẵn sàng</> : "Chưa hoàn tất"}</div>
          </div>

          <div className="camera-check mt-5">
            <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${cameraReady ? "opacity-100" : "opacity-0"}`} />
            {!cameraReady && <div className="absolute inset-0 grid place-items-center text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-white/10 text-white"><Camera className="h-7 w-7" /></div><div className="mt-4 text-sm font-bold text-white">Camera chưa được bật</div><div className="mt-1 text-xs text-slate-300">Nhấn nút bên dưới để kiểm tra</div></div></div>}
            {cameraReady && <div className="face-guide"><span /><span /><span /><span /></div>}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-slate-950/70 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur"><span className={`h-2 w-2 rounded-full ${cameraReady ? "bg-emerald-400" : "bg-slate-400"}`} /> Xem trước camera</div>
          </div>

          <button className="secondary-button mt-4 w-full justify-center" onClick={checkCamera}><Camera className="h-4 w-4" /> {cameraReady ? "Kiểm tra lại camera" : "Bật và kiểm tra camera"}</button>
          {cameraError && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium leading-5 text-rose-700">{cameraError}</div>}

          <button className="secondary-button mt-3 w-full justify-center" onClick={checkScreenShare}><MonitorUp className="h-4 w-4" /> {screenReady ? "Chia sẻ lại màn hình" : "Chia sẻ Toàn bộ màn hình"}</button>
          {screenError && <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium leading-5 text-rose-700">{screenError}</div>}

          <div className="my-6 h-px bg-slate-100" />
          <div className="grid gap-3 sm:grid-cols-3">
            <CheckItem icon={MonitorCheck} title="Chia sẻ màn hình" value={screenReady ? "Đang hoạt động" : "Cần bật"} ok={screenReady} />
            <CheckItem icon={Maximize2} title="Toàn màn hình" value="Khi bắt đầu" ok />
            <CheckItem icon={Camera} title="Camera" value={cameraReady ? "Sẵn sàng" : "Cần kiểm tra"} ok={cameraReady} />
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal-700" />
            <span className="text-xs leading-5 text-slate-600">Tôi đồng ý bật camera, chia sẻ Toàn bộ màn hình và để hệ thống ghi nhận các tín hiệu giám sát trong thời gian làm bài.</span>
          </label>

          <button className="primary-button mt-5 w-full" disabled={!cameraReady || !screenReady || !agreed || starting} onClick={startExam}>
            {starting ? "Đang vào phòng thi..." : "Bắt đầu làm bài"}<ChevronRight className="h-4 w-4" />
          </button>
        </section>
      </div>
    </main>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700"><Icon className="h-4 w-4" /></div><div><div className="text-[10px] text-slate-400">{label}</div><div className="mt-0.5 text-xs font-bold text-slate-800">{value}</div></div></div>;
}

function CheckItem({ icon: Icon, title, value, ok }: { icon: typeof Camera; title: string; value: string; ok: boolean }) {
  return <div className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-slate-500" />{ok ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-amber-500" />}</div><div className="mt-3 text-xs font-bold text-slate-800">{title}</div><div className="mt-1 text-[10px] text-slate-500">{value}</div></div>;
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MonitorStatus, Severity, ViolationType } from "@/lib/types";

interface ViolationInput {
  type: ViolationType;
  severity: Severity;
  detail: string;
  durationMs?: number;
  confidence?: number;
  snapshot?: string;
}

interface UseProctoringOptions {
  enabled: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onViolation: (event: ViolationInput) => void;
}

type ConditionState = Record<string, number | undefined>;

const initialStatus: MonitorStatus = {
  camera: "starting",
  ai: "loading",
  faceCount: 0,
  phoneDetected: false,
  gaze: "unknown",
  detail: "Đang khởi động camera",
};

export function useProctoring({ enabled, videoRef, onViolation }: UseProctoringOptions) {
  const [status, setStatus] = useState<MonitorStatus>(initialStatus);
  const onViolationRef = useRef(onViolation);
  const activeSinceRef = useRef<ConditionState>({});
  const lastReportRef = useRef<ConditionState>({});
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    onViolationRef.current = onViolation;
  }, [onViolation]);

  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return undefined;
    const canvas = document.createElement("canvas");
    const width = 480;
    const height = Math.round((video.videoHeight / video.videoWidth) * width);
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.55);
  }, [videoRef]);

  const record = useCallback((event: ViolationInput) => {
    onViolationRef.current(event);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const reportBrowserEvent = (type: ViolationType, severity: Severity, detail: string) => {
      const now = Date.now();
      if (now - (lastReportRef.current[type] ?? 0) < 2500) return;
      lastReportRef.current[type] = now;
      record({ type, severity, detail });
    };

    const onVisibility = () => {
      if (document.hidden) reportBrowserEvent("TAB_HIDDEN", "high", "Đã rời khỏi trang thi hoặc thu nhỏ trình duyệt");
    };
    const onBlur = () => {
      blurTimerRef.current = setTimeout(() => {
        if (!document.hidden && document.hasFocus() === false) {
          reportBrowserEvent("WINDOW_BLUR", "medium", "Cửa sổ thi bị mất tiêu điểm");
        }
      }, 700);
    };
    const onFocus = () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) reportBrowserEvent("EXIT_FULLSCREEN", "high", "Đã thoát chế độ toàn màn hình");
    };
    const blockClipboard = (event: ClipboardEvent) => {
      event.preventDefault();
      const type: ViolationType = event.type === "paste" ? "PASTE_ATTEMPT" : event.type === "cut" ? "CUT_ATTEMPT" : "COPY_ATTEMPT";
      reportBrowserEvent(type, "medium", `${event.type === "paste" ? "Dán" : event.type === "cut" ? "Cắt" : "Sao chép"} nội dung trong lúc làm bài`);
    };
    const blockContextMenu = (event: MouseEvent) => event.preventDefault();

    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", blockClipboard);
    document.addEventListener("cut", blockClipboard);
    document.addEventListener("paste", blockClipboard);
    document.addEventListener("contextmenu", blockContextMenu);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", blockClipboard);
      document.removeEventListener("cut", blockClipboard);
      document.removeEventListener("paste", blockClipboard);
      document.removeEventListener("contextmenu", blockContextMenu);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, [enabled, record]);

  useEffect(() => {
    if (!enabled) return;
    const videoElement = videoRef.current;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stream: MediaStream | undefined;
    let faceLandmarker: { detectForVideo: (video: HTMLVideoElement, timestamp: number) => { faceLandmarks?: Array<Array<{ x: number; y: number; z: number }>> }; close?: () => void } | undefined;
    let objectDetector: { detectForVideo: (video: HTMLVideoElement, timestamp: number) => { detections?: Array<{ categories?: Array<{ categoryName?: string; score?: number }> }> }; close?: () => void } | undefined;
    let tick = 0;

    const updateCondition = (
      type: ViolationType,
      condition: boolean,
      thresholdMs: number,
      cooldownMs: number,
      severity: Severity,
      detail: string,
      confidence?: number,
    ) => {
      const now = Date.now();
      if (!condition) {
        activeSinceRef.current[type] = undefined;
        return;
      }
      const startedAt = activeSinceRef.current[type] ?? now;
      activeSinceRef.current[type] = startedAt;
      const durationMs = now - startedAt;
      const lastReport = lastReportRef.current[type] ?? 0;
      if (durationMs >= thresholdMs && now - lastReport >= cooldownMs) {
        lastReportRef.current[type] = now;
        record({ type, severity, detail, durationMs, confidence, snapshot: takeSnapshot() });
      }
    };

    const run = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) return;
        const video = videoElement;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const videoTrack = stream.getVideoTracks()[0];
        videoTrack?.addEventListener("ended", () => {
          if (cancelled) return;
          setStatus((current) => ({ ...current, camera: "off", detail: "Camera đã bị tắt" }));
          record({ type: "CAMERA_OFF", severity: "high", detail: "Luồng camera đã bị dừng" });
        });
        setStatus((current) => ({ ...current, camera: "active", detail: "Camera đang hoạt động" }));
      } catch {
        setStatus((current) => ({ ...current, camera: "blocked", ai: "limited", detail: "Không thể truy cập camera" }));
        record({ type: "CAMERA_OFF", severity: "high", detail: "Không cấp quyền hoặc không thể mở camera" });
        return;
      }

      try {
        const { FilesetResolver, FaceLandmarker, ObjectDetector } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 2,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.5,
        });
        objectDetector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          scoreThreshold: 0.48,
          maxResults: 3,
          categoryAllowlist: ["cell phone"],
        });
        if (cancelled) return;
        setStatus((current) => ({ ...current, ai: "active", detail: "Giám sát AI đang hoạt động" }));
      } catch {
        if (!cancelled) setStatus((current) => ({ ...current, ai: "limited", detail: "Giám sát trình duyệt đang hoạt động; AI chưa tải được" }));
        return;
      }

      timer = setInterval(() => {
        const video = videoElement;
        if (cancelled || !video || video.readyState < 2 || !faceLandmarker) return;
        const timestamp = performance.now();
        try {
          const faceResult = faceLandmarker.detectForVideo(video, timestamp);
          const faces = faceResult.faceLandmarks ?? [];
          const faceCount = faces.length;
          let gaze: MonitorStatus["gaze"] = faceCount === 1 ? "center" : "unknown";

          if (faceCount === 1) {
            const landmarks = faces[0];
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];
            const nose = landmarks[1];
            const chin = landmarks[152];
            if (leftEye && rightEye && nose && chin) {
              const eyeDistance = Math.max(Math.abs(rightEye.x - leftEye.x), 0.001);
              const eyeMidX = (leftEye.x + rightEye.x) / 2;
              const eyeMidY = (leftEye.y + rightEye.y) / 2;
              const yaw = (nose.x - eyeMidX) / eyeDistance;
              const verticalRange = Math.max(chin.y - eyeMidY, 0.001);
              const pitchRatio = (nose.y - eyeMidY) / verticalRange;
              if (Math.abs(yaw) > 0.2 || pitchRatio < 0.24 || pitchRatio > 0.72) gaze = "away";
            }
          }

          updateCondition("NO_FACE", faceCount === 0, 2200, 8000, "medium", "Không thấy khuôn mặt liên tục trên 2 giây");
          updateCondition("MULTIPLE_FACES", faceCount > 1, 1100, 8000, "high", "Phát hiện từ hai khuôn mặt trở lên");
          updateCondition("LOOK_AWAY", gaze === "away", 2600, 7000, "medium", "Hướng nhìn lệch khỏi màn hình trên 2,5 giây");

          let phoneDetected = false;
          let phoneConfidence = 0;
          tick += 1;
          if (objectDetector && tick % 3 === 0) {
            const objectResult = objectDetector.detectForVideo(video, timestamp + 0.01);
            for (const detection of objectResult.detections ?? []) {
              for (const category of detection.categories ?? []) {
                if (category.categoryName === "cell phone" && (category.score ?? 0) > phoneConfidence) {
                  phoneDetected = true;
                  phoneConfidence = category.score ?? 0;
                }
              }
            }
            updateCondition(
              "PHONE_DETECTED",
              phoneDetected,
              1100,
              9000,
              "high",
              `Phát hiện vật thể giống điện thoại (${Math.round(phoneConfidence * 100)}%)`,
              phoneConfidence,
            );
          }

          setStatus((current) => ({
            ...current,
            faceCount,
            gaze,
            phoneDetected: phoneDetected || (tick % 3 !== 0 && current.phoneDetected),
            detail: phoneDetected
              ? "Có thể có điện thoại trong khung hình"
              : faceCount > 1
                ? "Phát hiện nhiều khuôn mặt"
                : faceCount === 0
                  ? "Chưa thấy khuôn mặt"
                  : gaze === "away"
                    ? "Hướng nhìn đang lệch"
                    : "Giám sát ổn định",
          }));
        } catch {
          setStatus((current) => ({ ...current, ai: "limited", detail: "AI đang tạm gián đoạn" }));
        }
      }, 450);
    };

    void run();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      faceLandmarker?.close?.();
      objectDetector?.close?.();
      if (videoElement) videoElement.srcObject = null;
    };
  }, [enabled, record, takeSnapshot, videoRef]);

  return status;
}

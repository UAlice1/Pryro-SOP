"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useComposer } from "@assistant-ui/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Mic, MicOff, Square, Pause, Play,
  Upload, Loader2, X, FileAudio, CheckCircle, AlertTriangle,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────── */

type RecordState = "idle" | "recording" | "paused" | "done";
type UploadState = "idle" | "transcribing" | "done" | "error";

/* Providers that natively support Whisper-compatible audio transcription */
const WHISPER_PROVIDERS = new Set(["openai", "groq"]);

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const ACCEPT = "audio/mp3,audio/wav,audio/m4a,audio/mpeg,audio/webm,audio/ogg";

/* ─── Component ─────────────────────────────────────────────────────────── */

export function AudioUploader({ onClose }: { onClose?: () => void }) {
  /* Load user's active provider to show Whisper warning */
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/ai/settings")
      .then((r) => r.json())
      .then((data) => setActiveProvider((data as { provider?: string }).provider ?? "openai"))
      .catch(() => setActiveProvider("openai"));
  }, []);

  const whisperSupported = activeProvider ? WHISPER_PROVIDERS.has(activeProvider) : true;
  // assistant-ui composer — lets us inject text into the input field
  const composer = useComposer();

  /* recording state */
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [elapsed, setElapsed]         = useState(0);
  const [fileName, setFileName]       = useState<string | null>(null);
  const [transcript, setTranscript]   = useState<string | null>(null);
  const [dragOver, setDragOver]       = useState(false);

  const mediaRef    = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioBlob   = useRef<Blob | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* cleanup on unmount */
  useEffect(() => () => {
    timerRef.current && clearInterval(timerRef.current);
    mediaRef.current?.state !== "inactive" && mediaRef.current?.stop();
  }, []);

  /* ── Timer ─────────────────────────────────────────────────────────────── */
  const startTimer = () => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };
  const stopTimer = () => {
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = null;
  };

  /* ── Recording controls ────────────────────────────────────────────────── */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        audioBlob.current = blob;
        stream.getTracks().forEach((t) => t.stop());
        setRecordState("done");
        setFileName("recording.webm");
      };
      mr.start(250);
      mediaRef.current = mr;
      setElapsed(0);
      setRecordState("recording");
      startTimer();
    } catch {
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const pauseRecording = () => {
    if (mediaRef.current?.state === "recording") {
      mediaRef.current.pause();
      stopTimer();
      setRecordState("paused");
    }
  };

  const resumeRecording = () => {
    if (mediaRef.current?.state === "paused") {
      mediaRef.current.resume();
      startTimer();
      setRecordState("recording");
    }
  };

  const stopRecording = () => {
    stopTimer();
    mediaRef.current?.stop();
    // onstop fires asynchronously → sets recordState to "done"
  };

  /* ── File drop / select ────────────────────────────────────────────────── */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|m4a|webm|ogg)$/i)) {
      toast.error("Please upload an audio file (mp3, wav, m4a, webm)");
      return;
    }
    audioBlob.current = file;
    setFileName(file.name);
    setRecordState("done");
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  /* ── Transcription ─────────────────────────────────────────────────────── */
  const transcribe = async () => {
    if (!audioBlob.current) return;
    setUploadState("transcribing");
    try {
      const fd = new FormData();
      fd.append("audio", audioBlob.current, fileName ?? "recording.webm");
      const res = await fetch("/api/ai/transcribe", { method: "POST", body: fd });
      const data = await res.json() as { transcript?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Transcription failed");
      setTranscript(data.transcript ?? "");
      setUploadState("done");
    } catch (err: unknown) {
      setUploadState("error");
      toast.error(err instanceof Error ? err.message : "Transcription failed");
    }
  };

  /* ── Inject into composer ──────────────────────────────────────────────── */
  const inject = () => {
    if (!transcript) return;
    // assistant-ui exposes setText on the composer runtime
    if (composer && "setText" in composer) {
      (composer as { setText: (t: string) => void }).setText(transcript);
    } else {
      // fallback: copy to clipboard
      navigator.clipboard.writeText(transcript);
      toast.success("Transcript copied to clipboard — paste it in the chat");
    }
    onClose?.();
  };

  const reset = () => {
    stopTimer();
    mediaRef.current?.state !== "inactive" && mediaRef.current?.stop();
    audioBlob.current = null;
    setRecordState("idle");
    setUploadState("idle");
    setElapsed(0);
    setFileName(null);
    setTranscript(null);
  };

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Voice / Audio Input</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">

        {/* ── Provider warning ────────────────────────────────────── */}
        {activeProvider && !whisperSupported && (
          <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              <strong>⚠️ {activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1)}</strong> does not natively support Whisper audio transcription. Audio will be transcribed using the primary fallback OpenAI key instead.
            </p>
          </div>
        )}

        {/* ── Idle: choose record or upload ─────────────────────── */}
        {recordState === "idle" && uploadState === "idle" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Microphone card */}
            <button
              onClick={startRecording}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Mic className="w-6 h-6 text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Record Voice</p>
                <p className="text-xs text-muted-foreground mt-0.5">Describe your process aloud</p>
              </div>
            </button>

            {/* File upload card */}
            <button
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-dashed transition-all group",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/40",
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-105",
                "bg-blue-100 dark:bg-blue-900/30",
              )}>
                <Upload className="w-6 h-6 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Upload Audio</p>
                <p className="text-xs text-muted-foreground mt-0.5">mp3, wav, m4a, webm</p>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        )}

        {/* ── Recording / Paused ──────────────────────────────────── */}
        {(recordState === "recording" || recordState === "paused") && (
          <div className="flex flex-col items-center gap-4 py-4">
            {/* Pulsing indicator */}
            <div className="relative flex items-center justify-center">
              {recordState === "recording" && (
                <span className="absolute w-16 h-16 rounded-full bg-red-500/20 animate-ping" />
              )}
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center",
                recordState === "recording"
                  ? "bg-red-500 text-white"
                  : "bg-yellow-500 text-white",
              )}>
                {recordState === "recording"
                  ? <Mic className="w-6 h-6" />
                  : <Pause className="w-6 h-6" />}
              </div>
            </div>

            {/* Timer */}
            <div className="text-center">
              <p className="text-2xl font-mono font-bold tabular-nums">{formatTime(elapsed)}</p>
              <p className={cn(
                "text-xs font-medium mt-0.5",
                recordState === "recording" ? "text-red-500" : "text-yellow-600",
              )}>
                {recordState === "recording" ? "● Recording…" : "⏸ Paused"}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {recordState === "recording" ? (
                <Button variant="outline" size="sm" onClick={pauseRecording} className="gap-1.5">
                  <Pause className="w-3.5 h-3.5" /> Pause
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={resumeRecording} className="gap-1.5">
                  <Play className="w-3.5 h-3.5" /> Resume
                </Button>
              )}
              <Button
                size="sm"
                variant="destructive"
                onClick={stopRecording}
                className="gap-1.5"
              >
                <Square className="w-3.5 h-3.5" /> Stop
              </Button>
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5 text-muted-foreground">
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Done: audio ready to transcribe ─────────────────────── */}
        {recordState === "done" && uploadState === "idle" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/40 rounded-lg border border-border">
              <FileAudio className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {fileName?.includes("recording") ? `Recorded — ${formatTime(elapsed)}` : "Audio file ready"}
                </p>
              </div>
              <button onClick={reset} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <Button onClick={transcribe} className="w-full gap-2">
              <Mic className="w-4 h-4" />
              Transcribe with AI
            </Button>
          </div>
        )}

        {/* ── Transcribing ─────────────────────────────────────────── */}
        {uploadState === "transcribing" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Transcribing audio process input via AI…</p>
              <p className="text-xs text-muted-foreground mt-1">Using Whisper to convert speech to text</p>
            </div>
          </div>
        )}

        {/* ── Transcript ready ─────────────────────────────────────── */}
        {uploadState === "done" && transcript && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Transcription complete</span>
            </div>

            <div className="bg-muted/40 border border-border rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={inject} className="flex-1 gap-2">
                <MicOff className="w-4 h-4" />
                Send to Chat
              </Button>
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            </div>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────── */}
        {uploadState === "error" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <MicOff className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-sm text-destructive">Transcription failed. Check your API key in Settings.</p>
            </div>
            <Button variant="outline" onClick={reset} className="w-full gap-2">
              <X className="w-4 h-4" /> Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
const MAX_SECONDS = 600;
type Recogniser = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((e: {
        results: ArrayLike<ArrayLike<{
            transcript: string;
        }>>;
    }) => void) | null;
    onerror: ((e: {
        error?: string;
    }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
};
const recogniserOf = (): (new () => Recogniser) | null => {
    const w = window as unknown as {
        SpeechRecognition?: new () => Recogniser;
        webkitSpeechRecognition?: new () => Recogniser;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
const RECORD_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
const LIVE_EVERY_MS = 1500;
const LIVE_MAX_MS = 180000;
const DEAF = ["not-allowed", "service-not-allowed", "network", "audio-capture", "language-not-supported"];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
export function VoiceNote({ endpoint = "/api/feedback/transcribe", onText, onHeard, onStart, disabled, className, testId = "voice-note", }: {
    endpoint?: string;
    onText: (text: string) => void;
    onHeard?: (heard: string) => void;
    onStart?: () => void;
    disabled?: boolean;
    className?: string;
    testId?: string;
}) {
    const [micOk, setMicOk] = useState<boolean | null>(null);
    const [state, setState] = useState<"idle" | "recording" | "writing">("idle");
    const [seconds, setSeconds] = useState(0);
    const recorder = useRef<MediaRecorder | null>(null);
    const hearing = useRef<Recogniser | null>(null);
    const browserHears = useRef(false);
    const kept = useRef("");
    const live = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heardRef = useRef(onHeard);
    heardRef.current = onHeard;
    useEffect(() => {
        setMicOk(typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
        return () => {
            recorder.current?.stop();
            hearing.current?.stop();
            if (live.current)
                clearTimeout(live.current);
        };
    }, []);
    const hear = () => {
        const Maker = onHeard ? recogniserOf() : null;
        if (!Maker)
            return;
        try {
            const r = new Maker();
            let said = "";
            let deaf = false;
            r.continuous = true;
            r.interimResults = true;
            r.lang = navigator.language || "en-US";
            r.onresult = (e) => {
                let heard = "";
                for (let i = 0; i < e.results.length; i++)
                    heard += `${e.results[i][0]?.transcript ?? ""} `;
                said = `${kept.current} ${heard}`.replace(/\s+/g, " ").trim();
                if (!said)
                    return;
                browserHears.current = true;
                heardRef.current?.(said);
            };
            r.onerror = (e) => {
                if (DEAF.includes(e.error ?? ""))
                    deaf = true;
            };
            r.onend = () => {
                if (hearing.current !== r)
                    return;
                hearing.current = null;
                if (said)
                    kept.current = said;
                if (deaf)
                    browserHears.current = false;
                else
                    setTimeout(() => recorder.current?.state === "recording" && !hearing.current && hear(), 300);
            };
            r.start();
            hearing.current = r;
        }
        catch {
            hearing.current = null;
            browserHears.current = false;
        }
    };
    const stopHearing = () => {
        const r = hearing.current;
        hearing.current = null;
        try {
            r?.stop();
        }
        catch { }
        if (live.current)
            clearTimeout(live.current);
        live.current = null;
    };
    const listen = (r: MediaRecorder, chunks: Blob[], type: string) => {
        const started = Date.now();
        const running = () => recorder.current === r && r.state === "recording";
        let sent = 0;
        let out = 0;
        let asked = 0;
        let shown = 0;
        const ask = async (n: number) => {
            out++;
            try {
                const res = await fetch(`${endpoint}?live=1`, { method: "POST", headers: { "content-type": type }, body: new Blob(chunks, { type }) });
                const got = (await res.json()) as {
                    ok: boolean;
                    text?: string;
                };
                if (running() && !browserHears.current && n > shown && got.ok && got.text) {
                    shown = n;
                    heardRef.current?.(got.text);
                }
            }
            catch {
            }
            finally {
                out--;
            }
        };
        const pass = () => {
            if (!running() || Date.now() - started > LIVE_MAX_MS)
                return;
            if (!browserHears.current && out < 2 && chunks.length > sent) {
                sent = chunks.length;
                void ask(++asked);
            }
            live.current = setTimeout(pass, LIVE_EVERY_MS + (Date.now() - started) / 10);
        };
        live.current = setTimeout(pass, LIVE_EVERY_MS);
    };
    useEffect(() => {
        if (state !== "recording")
            return;
        const t = setInterval(() => {
            setSeconds((n) => {
                if (n + 1 >= MAX_SECONDS)
                    recorder.current?.stop();
                return n + 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [state]);
    const send = async (audio: Blob) => {
        setState("writing");
        try {
            const res = await fetch(endpoint, { method: "POST", headers: { "content-type": audio.type }, body: audio });
            const out = (await res.json()) as {
                ok: true;
                text: string;
            } | {
                ok: false;
                error: string;
            };
            if (!out.ok)
                toast.error(out.error);
            else if (!out.text)
                toast.message("Nothing was heard in that recording.");
            else
                onText(out.text);
        }
        catch {
            toast.error("The recording couldn't be sent. Check the connection and try again.");
        }
        finally {
            setState("idle");
        }
    };
    const toggle = async () => {
        if (state === "recording") {
            stopHearing();
            recorder.current?.stop();
            return;
        }
        if (state !== "idle")
            return;
        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        catch (e) {
            toast.error((e as Error).name === "NotFoundError" ? "No microphone was found." : "The microphone is blocked. Allow it for this site in the browser, then try again.");
            return;
        }
        const mimeType = RECORD_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
        const r = new MediaRecorder(stream, { ...(mimeType ? { mimeType } : {}), audioBitsPerSecond: 32000 });
        const chunks: Blob[] = [];
        r.ondataavailable = (e) => {
            if (e.data.size)
                chunks.push(e.data);
        };
        r.onstop = () => {
            stopHearing();
            stream.getTracks().forEach((t) => t.stop());
            recorder.current = null;
            const audio = new Blob(chunks, { type: r.mimeType || mimeType || "audio/webm" });
            if (audio.size)
                void send(audio);
            else
                setState("idle");
        };
        recorder.current = r;
        setSeconds(0);
        setState("recording");
        onStart?.();
        if (onHeard) {
            browserHears.current = false;
            kept.current = "";
            r.start(1000);
            hear();
            listen(r, chunks, r.mimeType || mimeType || "audio/webm");
        }
        else
            r.start();
    };
    if (micOk === false)
        return null;
    return (<button type="button" onClick={() => void toggle()} disabled={disabled || state === "writing"} aria-pressed={state === "recording"} title={state === "recording" ? "Stop and write it down" : "Say it instead of typing"} className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs hover:bg-muted disabled:pointer-events-none disabled:opacity-50", state === "recording" && "border-red-300 bg-red-50 font-medium text-red-700", className)} data-testid={testId}>
      {state === "writing" ? <Loader2 className="size-3.5 animate-spin"/> : state === "recording" ? <Square className="size-3.5"/> : <Mic className="size-3.5"/>}
      {state === "writing" ? "Writing it down" : state === "recording" ? `Stop ${clock(seconds)}` : "Speak"}
    </button>);
}

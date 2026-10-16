#!/usr/bin/env python3
"""
Master a raw TTS render into the Zack D Films VO sound.

This is the exact chain that produced the approved Lemme cut. The raw render out
of seed_audio is thin, uneven and a little dark. This makes it dry, forward and
broadcast-loud, which is what the reference ad actually sounds like.

Two stages:
  1. optional silence tightening  (only when the render has too much dead air)
  2. the fixed EQ / compression / limiting chain

Usage:
  master_vo.py raw.wav out.wav                     # chain only
  master_vo.py raw.wav out.wav --max-gap 0.16      # also tighten gaps to 0.16s
  master_vo.py raw.wav out.wav --head-trim 0.20    # drop leading silence

NEVER use negative speech_rate on the generation to slow a read down. It stretches
phonemes and produces the dragged, choppy delivery. Fix runtime with word count.
"""
import argparse, os, subprocess, sys, tempfile, wave
import numpy as np

CHAIN = ("highpass=f=80,"
         "equalizer=f=4000:width_type=q:w=1.0:g=3,"
         "equalizer=f=250:width_type=q:w=1.0:g=-1.5,"
         "acompressor=threshold=-22dB:ratio=4:attack=5:release=120:makeup=6,"
         "alimiter=limit=0.95,"
         "loudnorm=I=-12:TP=-1.0:LRA=6")


def tighten(src, dst, max_gap):
    """Cut every inter-phrase silence down to max_gap seconds."""
    tmp = tempfile.mktemp(suffix=".wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", src,
                    "-ac", "1", "-ar", "44100", tmp], check=True)
    w = wave.open(tmp); sr = w.getframerate()
    d = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    w.close(); os.remove(tmp)

    hop, fl = int(0.005 * sr), int(0.02 * sr)
    fr = np.lib.stride_tricks.sliding_window_view(d, fl)[::hop]
    en = np.sqrt((fr ** 2).mean(1))
    sil = en < en.max() * 0.045

    keep = np.ones(len(d), bool)
    s = None
    for i, v in enumerate(list(sil) + [False]):
        if v and s is None:
            s = i
        if not v and s is not None:
            a, b = s * hop, min(i * hop, len(d))
            dur = (b - a) / sr
            if dur > max_gap:
                drop = int((dur - max_gap) * sr)
                mid = (a + b) // 2
                keep[mid - drop // 2: mid - drop // 2 + drop] = False
            s = None
    out = d[keep]
    nz = np.where(np.abs(out) > 0.004)[0]
    if len(nz):
        out = out[max(0, nz[0] - int(0.03 * sr)): min(len(out), nz[-1] + int(0.08 * sr))]
    wf = wave.open(dst, "w"); wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr)
    wf.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()); wf.close()
    return len(out) / sr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--max-gap", type=float, default=None,
                    help="tighten inter-phrase silences to this many seconds, e.g. 0.16")
    ap.add_argument("--head-trim", type=float, default=0.0,
                    help="seconds of leading silence to drop")
    a = ap.parse_args()

    src = a.src
    if a.max_gap is not None:
        tmp = tempfile.mktemp(suffix=".wav")
        dur = tighten(src, tmp, a.max_gap)
        print(f"tightened gaps to {a.max_gap}s, now {dur:.2f}s")
        src = tmp

    cmd = ["ffmpeg", "-y", "-v", "error"]
    if a.head_trim:
        cmd += ["-ss", str(a.head_trim)]
    cmd += ["-i", src, "-af", CHAIN, "-ar", "44100", "-ac", "1", a.dst]
    subprocess.run(cmd, check=True)

    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", a.dst], capture_output=True, text=True).stdout.strip()
    print(f"mastered -> {a.dst}  ({float(out):.2f}s)")
    print("Now run vo_qa.py, then LISTEN TO IT before spending any video credits.")


if __name__ == "__main__":
    main()

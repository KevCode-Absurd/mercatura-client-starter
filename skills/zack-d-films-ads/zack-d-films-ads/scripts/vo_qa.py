#!/usr/bin/env python3
"""
Measure a generated VO against the Zack D Films reference fingerprint.

This is the gate that keeps the voice from drifting. Run it on every VO render
BEFORE spending any video credits. Numbers come from the reference ad
(reference/REFERENCE-AD_prime-hydration_40s.mp4).

Usage:
  vo_qa.py VO.wav --words 119
  vo_qa.py VO.wav --words 119 --json     # machine-readable

Also used to audition stock voices: render the same line on several voices,
run this on each, keep the closest score.
"""
import argparse, json, subprocess, sys, tempfile, os, wave
import numpy as np

# measured off the reference ad
TARGET = {
    "wpm":       (145, 190),   # acceptable band; reference is 154
    "f0":        (125, 165),   # Hz, reference 148
    "silence":   (0.05, 0.20), # fraction, reference 0.15
    "centroid":  (1600, 2050), # Hz, reference 1820
    "rms_dbfs":  (-19.0, -13.0),  # reference -16.2
}
IDEAL = {"wpm": 154, "f0": 148, "silence": 0.15, "centroid": 1820, "rms_dbfs": -16.2}


def load_mono16k(path):
    tmp = tempfile.mktemp(suffix=".wav")
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", path,
                    "-ac", "1", "-ar", "16000", tmp], check=True)
    w = wave.open(tmp)
    sr = w.getframerate()
    d = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    w.close(); os.remove(tmp)
    return d, sr


def f0_of(x, sr, fmin=60, fmax=350):
    x = x - x.mean()
    if np.sqrt((x ** 2).mean()) < 1e-3:
        return 0.0
    c = np.correlate(x, x, "full")[len(x) - 1:]
    lo, hi = int(sr / fmax), int(sr / fmin)
    if hi >= len(c):
        return 0.0
    seg = c[lo:hi]
    return sr / (lo + seg.argmax()) if seg.max() > 0 else 0.0


def measure(path, nwords):
    d, sr = load_mono16k(path)
    dur = len(d) / sr
    fl, hop = int(0.025 * sr), int(0.010 * sr)
    fr = np.lib.stride_tricks.sliding_window_view(d, fl)[::hop]
    en = np.sqrt((fr ** 2).mean(1))
    thr = en.max() * 0.06

    ff = np.lib.stride_tricks.sliding_window_view(d, int(0.04 * sr))[::int(0.02 * sr)]
    p = np.array([f0_of(x, sr) for x in ff])
    p = p[(p > 60) & (p < 300)]

    S = np.abs(np.fft.rfft(fr * np.hanning(fl), axis=1))
    freqs = np.fft.rfftfreq(fl, 1 / sr)
    centroid = float(((S * freqs).sum(1) / (S.sum(1) + 1e-9)).mean())

    return {
        "duration":  round(dur, 2),
        "wpm":       round(nwords / dur * 60, 1),
        "f0":        round(float(np.median(p)), 1) if len(p) else 0.0,
        "silence":   round(float((en < thr).mean()), 3),
        "centroid":  round(centroid, 0),
        "rms_dbfs":  round(float(20 * np.log10(en.mean() + 1e-9)), 1),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--words", type=int, required=True)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    m = measure(a.audio, a.words)
    fails = []
    for k, (lo, hi) in TARGET.items():
        if not (lo <= m[k] <= hi):
            fails.append(k)

    # distance from ideal, normalised, for voice auditioning
    score = sum(abs(m[k] - IDEAL[k]) / max(abs(IDEAL[k]), 1e-6) for k in IDEAL)
    m["score"] = round(score, 4)
    m["pass"] = not fails
    m["failed"] = fails

    if a.json:
        print(json.dumps(m, indent=2))
    else:
        print(f"  duration   {m['duration']:>8.2f} s")
        for k in ("wpm", "f0", "silence", "centroid", "rms_dbfs"):
            lo, hi = TARGET[k]
            flag = "  <-- OUT OF BAND" if k in fails else ""
            print(f"  {k:<10} {m[k]:>8}   target {lo} to {hi} (ideal {IDEAL[k]}){flag}")
        print(f"  score      {m['score']:>8.4f}   (lower is closer to reference)")
        print("  RESULT:", "PASS" if m["pass"] else "FAIL, regenerate before spending video credits")

    sys.exit(0 if m["pass"] else 1)


if __name__ == "__main__":
    main()

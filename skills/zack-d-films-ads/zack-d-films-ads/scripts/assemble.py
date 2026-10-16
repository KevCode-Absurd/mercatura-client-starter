#!/usr/bin/env python3
"""
Assemble a Zack D Films cut: trim chained clips to exact frame counts, join them
with a dissolve chain, composite the caption layer and pack overlay, mux the VO.

Every hard-won lesson from the build is encoded here:
  - exact frame counts, never float -t, or the xfade chain silently loses frames
  - xfade offsets computed from real accumulated length, with a range assertion
  - NO digital push-ins; upscaling 720p source past ~1.5x visibly mushes
  - clips are head-cut, since each was generated to START on the previous end frame

Usage:
  assemble.py --plan plan.json --out final.mp4

plan.json:
{
  "clips_dir": "clips",
  "vo": "VO_final.wav",
  "caplayer": "caplayer",
  "packshot": "packshot.png",
  "pack_from": 29.54,
  "duration": 38.97,
  "shots": [
    {"file": "S01.mp4", "seconds": 3.14, "start": 0.0},
    ...
  ],
  "joins": [0.267, 0.267, 0.367, ...]   # len == len(shots)-1
}
"""
import argparse, json, os, subprocess, sys

FPS = 30


def run(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"FAILED: {cmd}\n{r.stderr[:2000]}")
    return r.stdout


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--workdir", default="_assemble")
    a = ap.parse_args()

    p = json.load(open(a.plan))
    shots, joins = p["shots"], p["joins"]
    if len(joins) != len(shots) - 1:
        sys.exit("joins must be exactly one shorter than shots")

    os.makedirs(a.workdir, exist_ok=True)
    df = [round(s["seconds"] * FPS) for s in shots]
    jf = [round(j * FPS) for j in joins]

    # cut each shot to df + its outgoing dissolve tail (last shot needs no tail)
    cuts = []
    for i, s in enumerate(shots):
        n = df[i] + (jf[i] if i < len(jf) else 0)
        out = os.path.join(a.workdir, f"c{i+1:02d}.mp4")
        run(f'ffmpeg -y -v error -ss {s.get("start", 0)} -i "{os.path.join(p["clips_dir"], s["file"])}" '
            f'-vf "scale=1080:1920:flags=lanczos,fps={FPS},setsar=1" -frames:v {n} -an '
            f'-c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -r {FPS} "{out}"')
        cuts.append(out)

    # dissolve chain, offsets from real accumulated length
    ins = "".join(f' -i "{c}"' for c in cuts)
    parts, prev = [], "[0:v]"
    L, cum = df[0] + jf[0], df[0]
    for i in range(len(jf)):
        off = (cum - jf[i] / 2.0) / FPS
        limit = (L - jf[i]) / FPS
        if off > limit + 1e-6:
            sys.exit(f"join {i}: offset {off:.3f}s exceeds available {limit:.3f}s. "
                     "A shot is too short for its dissolve.")
        tag = f"[x{i}]" if i < len(jf) - 1 else "[v]"
        parts.append(f"{prev}[{i+1}:v]xfade=transition=fade:"
                     f"duration={jf[i]/FPS:.4f}:offset={off:.4f}{tag}")
        prev = tag
        nxt = df[i + 1] + (jf[i + 1] if i + 1 < len(jf) else 0)
        L = L + nxt - jf[i]
        cum += df[i + 1]

    joined = os.path.join(a.workdir, "joined.mp4")
    run(f'ffmpeg -y -v error{ins} -filter_complex "{";".join(parts)}" -map "[v]" -an '
        f'-c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -r {FPS} "{joined}"')

    # pad any rounding shortfall so video and VO stay locked
    total = int(p["duration"] * FPS)
    padded = os.path.join(a.workdir, "padded.mp4")
    run(f'ffmpeg -y -v error -i "{joined}" -vf "tpad=stop_mode=clone:stop_duration=0.5,fps={FPS}" '
        f'-frames:v {total} -an -c:v libx264 -crf 16 -preset slow -pix_fmt yuv420p -r {FPS} "{padded}"')

    # captions + persistent pack overlay
    vid = os.path.join(a.workdir, "video.mp4")
    if p.get("packshot"):
        fc = (f'[0:v][2:v]overlay=x=50:y=1275:'
              f"enable='between(t,{p['pack_from']},{p['duration']+0.2})'[v1];"
              f'[v1][1:v]overlay=0:0:format=auto[v]')
        extra = f' -loop 1 -i "{p["packshot"]}"'
    else:
        fc = '[0:v][1:v]overlay=0:0:format=auto[v]'
        extra = ''
    run(f'ffmpeg -y -v error -i "{padded}" -framerate {FPS} -i "{p["caplayer"]}/f_%04d.png"{extra} '
        f'-filter_complex "{fc}" -map "[v]" -t {p["duration"]} -an '
        f'-c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -r {FPS} "{vid}"')

    run(f'ffmpeg -y -v error -i "{vid}" -i "{p["vo"]}" -map 0:v -map 1:a '
        f'-c:v copy -c:a aac -b:a 192k -ar 44100 -t {p["duration"]} -movflags +faststart "{a.out}"')

    dur = run(f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{a.out}"').strip()
    print(f"assembled {a.out}  duration {dur}s  {len(shots)} shots")


if __name__ == "__main__":
    main()

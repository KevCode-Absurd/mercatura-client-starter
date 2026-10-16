#!/usr/bin/env python3
"""
Verify a VO render actually says what it is supposed to say.

CRITICAL METHOD NOTE. Whisper's initial_prompt biases the decoder toward the text
you give it. That is CORRECT when you want word-level timing alignment, and
INVALID when you want to verify pronunciation, because you are feeding the test
its own answer. A brand name can come out as gibberish and a primed transcript
will still show it spelled correctly.

This script transcribes UNPRIMED and diffs against the intended script. Use it on
every render, and especially on any invented brand name or technical term.

Usage:
  check_pronunciation.py VO.wav --script script.txt
  check_pronunciation.py VO.wav --script script.txt --watch KAINUA --watch picolinate
"""
import argparse, difflib, re, sys

try:
    import whisper
except ImportError:
    sys.exit("pip install openai-whisper")


def norm(s):
    return re.sub(r"[^a-z0-9' ]", " ", s.lower()).split()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--script", required=True)
    ap.add_argument("--model", default="small")
    ap.add_argument("--watch", action="append", default=[],
                    help="term that MUST appear; repeatable. Use for invented names")
    a = ap.parse_args()

    intended = open(a.script).read().strip()
    m = whisper.load_model(a.model)
    # deliberately NO initial_prompt
    heard = m.transcribe(a.audio, language="en")["text"].strip()

    print("INTENDED:\n  " + intended + "\n")
    print("HEARD (unprimed):\n  " + heard + "\n")

    wi, wh = norm(intended), norm(heard)
    sm = difflib.SequenceMatcher(None, wi, wh)
    print(f"word-level similarity: {sm.ratio():.3f}")

    problems = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag != "equal":
            problems.append(f"  {tag:<8} intended={' '.join(wi[i1:i2]) or '-'!r}  "
                            f"heard={' '.join(wh[j1:j2]) or '-'!r}")
    if problems:
        print("\ndifferences:")
        print("\n".join(problems[:40]))

    missing = [t for t in a.watch if t.lower() not in heard.lower()]
    if missing:
        print("\nWATCHED TERMS NOT HEARD: " + ", ".join(missing))
        print("The TTS is mangling these. Respell them phonetically in the text sent")
        print("to the engine (e.g. KAINUA -> 'KY-noo-ah') and re-render.")

    ok = sm.ratio() >= 0.90 and not missing
    print("\nRESULT:", "PASS" if ok else "FAIL, fix the script spelling and re-render")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()

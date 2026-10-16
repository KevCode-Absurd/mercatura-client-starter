import { activeBrandId } from "@/lib/brand-context";
import { loadQuestionnaire } from "@/lib/founder";
import { MAX_AUDIO_BYTES, transcribeAnswer } from "@/lib/founder-transcribe";
export async function POST(req: Request) {
    const questionId = new URL(req.url).searchParams.get("q") ?? "";
    const question = loadQuestionnaire()
        .flatMap((s) => s.questions)
        .find((q) => q.id === questionId);
    if (!question)
        return Response.json({ ok: false, error: "Unknown question." }, { status: 400 });
    const audio = Buffer.from(await req.arrayBuffer());
    if (audio.length > MAX_AUDIO_BYTES)
        return Response.json({ ok: false, error: "That recording is too long. Keep each answer under about 10 minutes." }, { status: 413 });
    try {
        const text = await transcribeAnswer({ brandId: await activeBrandId(), questionId, question: question.text, audio, mime: req.headers.get("content-type") ?? "" });
        return Response.json({ ok: true, text });
    }
    catch (e) {
        return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
    }
}
